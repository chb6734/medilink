import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  Req,
  ServiceUnavailableException,
  UnauthorizedException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { useInMemoryStore, visionEnabled } from '../lib/config';
import {
  ocrTextFromImageBytes,
  type TextAnnotation,
  type OcrResult,
} from '../lib/vision';
import { summarizeForClinician, analyzePatientStatus } from '../lib/gemini';
import { parseMedCandidates } from '../lib/meds';
import { isAuthEnabled } from '../lib/auth';
import { memAddRecord, memGetRecords } from '../lib/memory';
import { generateMedicationSchedule } from '../lib/medicationScheduler';
import {
  calculateAdherence,
  calculateAdherenceByPeriod,
  getAdherenceGrade,
  calculateDailyAdherence,
} from '../lib/adherenceCalculator';
import {
  extractMedicationsFromImage,
  isGeminiOcrEnabled,
} from '../lib/genaiOcr';
import { RecordsService } from '../modules/records/records.service';
import { verifyToken } from '../lib/jwt';
import {
  CountRecordsQueryDto,
  GetRecordsQueryDto,
  UpdateRecordBodyDto,
  GetCurrentMedicationsQueryDto,
  GetDoctorSummaryQueryDto,
  CreateRecordQueryDto,
} from '../modules/records/dto';

function requireAuth(req: Request) {
  if (!isAuthEnabled()) {
    console.log('🔓 인증 비활성화됨, requireAuth 통과');
    return;
  }

  const token = req.cookies?.['auth_token'];

  console.log('🔍 인증 확인:', {
    hasToken: !!token,
    cookies: req.headers.cookie,
  });

  if (!token) {
    console.error('❌ 인증 실패: JWT 토큰 없음');
    throw new UnauthorizedException('unauthorized');
  }

  const payload = verifyToken(token);
  if (!payload) {
    console.error('❌ 인증 실패: JWT 토큰 검증 실패');
    throw new UnauthorizedException('unauthorized');
  }

  console.log('✅ 인증 성공:', payload.userId);
}

function ensureDbConfigured() {
  if (useInMemoryStore) return;
  if (!process.env.DATABASE_URL) {
    throw new ServiceUnavailableException({
      error: 'db_not_configured',
      hint: 'Set DATABASE_URL',
    });
  }
}

@Controller()
export class RecordsController {
  constructor(private readonly recordsService: RecordsService) {}

  // Record count for patient (default last 90 days)
  @Get('/api/records/count')
  async count(@Req() req: Request, @Query() query: CountRecordsQueryDto) {
    this.recordsService.ensureDbConfigured();
    requireAuth(req);

    return this.recordsService.countRecords(query.patientId, query.days);
  }

  // Get all records for patient
  @Get('/api/records')
  async getRecords(@Req() req: Request, @Query() query: GetRecordsQueryDto) {
    this.recordsService.ensureDbConfigured();
    requireAuth(req);

    const records = await this.recordsService.getRecords(query.patientId);
    return { records };
  }

  // Update record (for medication compliance tracking)
  @Put('/api/records/:id')
  async updateRecord(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: UpdateRecordBodyDto,
  ) {
    this.recordsService.ensureDbConfigured();
    requireAuth(req);

    return this.recordsService.updateRecord(id, body);
  }

  // OCR Preview (no DB write)
  @Post('/api/records/preview-ocr')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    }),
  )
  async previewOcr(@UploadedFile() file?: Express.Multer.File) {
    if (!file?.buffer) throw new BadRequestException('file_required');

    return this.recordsService.previewOcr(file.buffer, file.mimetype);
  }

  // Get current medications (not completed yet)
  @Get('/api/records/current-medications')
  async getCurrentMedications(
    @Req() req: Request,
    @Query() query: GetCurrentMedicationsQueryDto,
  ) {
    this.recordsService.ensureDbConfigured();
    requireAuth(req);

    const medications = await this.recordsService.getCurrentMedications(
      query.patientId,
    );

    return { medications };
  }

  // Get patient summary data for doctor view
  @Get('/api/records/doctor-summary')
  async getDoctorSummary(
    @Req() req: Request,
    @Query() query: GetDoctorSummaryQueryDto,
  ) {
    this.recordsService.ensureDbConfigured();
    requireAuth(req);

    return this.recordsService.getDoctorSummary(query.patientId);
  }

  @Post('/api/records')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    }),
  )
  async createRecord(
    @Req() req: Request,
    @Query() query: CreateRecordQueryDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    this.recordsService.ensureDbConfigured();
    requireAuth(req);
    if (!file?.buffer) throw new BadRequestException('file_required');

    const buf = file.buffer;
    let text = '';

    // DTO Transform이 제대로 작동하지 않으므로 req.query에서 직접 파싱
    const rawMedications = (req.query as any).medications;
    console.log('🔍 Raw req.query.medications:', {
      type: typeof rawMedications,
      value: rawMedications?.substring?.(0, 100),
    });

    let parsedMedications: any[] | undefined = undefined;
    if (rawMedications && typeof rawMedications === 'string') {
      try {
        parsedMedications = JSON.parse(rawMedications);
        console.log('✅ Parsed medications:', {
          count: parsedMedications?.length,
          first: parsedMedications?.[0],
        });
      } catch (e) {
        console.error('❌ Failed to parse medications:', e);
      }
    }

    // 클라이언트가 약물 정보를 보냈다면 OCR을 다시 하지 않음 (성능 및 정확도 향상)
    if (parsedMedications && parsedMedications.length > 0) {
      console.log(
        '✅ 클라이언트에서 분석된 데이터를 받았습니다. 중복 OCR을 건너뜁니다.',
      );
      text = `Client-side analyzed record with ${parsedMedications.length} meds`;
    } else if (useInMemoryStore && !visionEnabled) {
      text =
        'OCR 미설정(개발 모드) — 실제 배포에서는 Google Cloud Vision 설정이 필요합니다.';
    } else {
      try {
        const r = await ocrTextFromImageBytes(buf);
        text = r.text;
      } catch (e: unknown) {
        if (useInMemoryStore) {
          text =
            'OCR 미설정(개발 모드) — 실제 배포에서는 Google Cloud Vision 설정이 필요합니다.';
        } else {
          const errorMessage = e instanceof Error ? e.message : String(e);
          throw new ServiceUnavailableException({
            error: 'ocr_unavailable',
            hint: 'Configure Google Cloud Vision credentials (ADC / GOOGLE_APPLICATION_CREDENTIALS).',
            details: errorMessage,
          });
        }
      }
    }

    // 클라이언트 데이터가 있으면 그것을 우선 사용, 없으면 서버에서 파싱 시도
    const finalMeds =
      parsedMedications && parsedMedications.length > 0
        ? parsedMedications.map((m: any) => ({
            nameRaw: m.name,
            dose: m.dosage || '',
            frequency: m.frequency || '',
            confidence: m.confidence ?? null,
          }))
        : parseMedCandidates(text).map((nameRaw) => ({
            nameRaw,
            dose: '',
            frequency: '',
            confidence: null as number | null,
          }));

    const geminiSummary =
      parsedMedications && parsedMedications.length > 0
        ? `Analyzed ${parsedMedications.length} meds: ${parsedMedications.map((m: any) => m.name).join(', ')}`
        : await summarizeForClinician(text);

    // Service로 위임 (트랜잭션 포함)
    return this.recordsService.createRecord({
      patientId: query.patientId,
      recordType: query.recordType,
      facilityName: query.facilityName,
      facilityType: query.facilityType,
      chiefComplaint: query.chiefComplaint,
      doctorDiagnosis: query.doctorDiagnosis,
      noteDoctorSaid: query.noteDoctorSaid,
      prescribedAt: query.prescribedAt,
      dispensedAt: query.dispensedAt,
      daysSupply: query.daysSupply,
      medications: finalMeds,
      ocrRawText: text,
      geminiSummary: geminiSummary ?? undefined,
    });
  }

  /**
   * 처방 기록의 약물 복용 스케줄 조회
   *
   * @route GET /api/records/:id/medication-schedule
   * @param id - 처방 기록 ID
   * @returns 시간대별 복용 약물 스케줄
   *
   * @description
   * 약물의 복용 빈도를 분석하여 시간대별로 어떤 약을 복용해야 하는지 반환합니다.
   *
   * @example
   * GET /api/records/uuid/medication-schedule
   * Response:
   * {
   *   "schedules": [
   *     {
   *       "time": "09:00",
   *       "medications": [
   *         { "medItemId": "uuid1", "medName": "펠루비정", "dose": "1정" },
   *         { "medItemId": "uuid2", "medName": "브로피딘정", "dose": "1정" },
   *         { "medItemId": "uuid3", "medName": "테세놀", "dose": "1정" }
   *       ]
   *     },
   *     {
   *       "time": "12:00",
   *       "medications": [
   *         { "medItemId": "uuid1", "medName": "펠루비정", "dose": "1정" },
   *         { "medItemId": "uuid3", "medName": "테세놀", "dose": "1정" }
   *       ]
   *     },
   *     {
   *       "time": "18:00",
   *       "medications": [
   *         { "medItemId": "uuid1", "medName": "펠루비정", "dose": "1정" },
   *         { "medItemId": "uuid2", "medName": "브로피딘정", "dose": "1정" },
   *         { "medItemId": "uuid3", "medName": "테세놀", "dose": "1정" }
   *       ]
   *     }
   *   ]
   * }
   */
  @Get(':id/medication-schedule')
  async getMedicationSchedule(@Param('id') recordId: string) {
    // In-memory 모드일 경우 (현재는 DB 모드만 지원)
    if (useInMemoryStore) {
      throw new ServiceUnavailableException(
        'Medication schedule is not available in in-memory mode',
      );
    }

    // DB 모드
    const record = await this.recordsService.getRecordWithMedications(recordId);

    if (!record) {
      throw new BadRequestException('Record not found');
    }

    const schedules = generateMedicationSchedule(record.medItems);

    return { schedules };
  }

  /**
   * 처방 기록의 복약 순응도 조회
   *
   * @route GET /api/records/:id/adherence
   * @param id - 처방 기록 ID
   * @returns 순응도 메트릭스 (전체, 기간별, 등급, 일별)
   *
   * @description
   * 환자의 복약 체크 기록을 분석하여 복약 순응도를 계산합니다.
   * - 전체 순응도: 모든 기록에 대한 순응도
   * - 기간별 순응도: 최근 7일, 14일, 30일 순응도
   * - 순응도 등급: excellent(90%+), good(70-89%), fair(50-69%), poor(<50%)
   * - 일별 순응도: 날짜별 상세 순응도 맵
   *
   * @example
   * GET /api/records/uuid/adherence
   * Response:
   * {
   *   "overall": 75.0,
   *   "last7Days": 80.0,
   *   "last14Days": 77.5,
   *   "last30Days": 75.0,
   *   "grade": {
   *     "grade": "good",
   *     "label": "양호",
   *     "description": "잘 지키고 계십니다.",
   *     "color": "#3B82F6"
   *   },
   *   "dailyAdherence": {
   *     "2026-01-01": 100.0,
   *     "2026-01-02": 66.7,
   *     "2026-01-03": 75.0
   *   }
   * }
   */
  @Get(':id/adherence')
  async getAdherence(@Param('id') recordId: string) {
    if (useInMemoryStore) {
      throw new ServiceUnavailableException(
        'Adherence calculation is not available in in-memory mode',
      );
    }

    // 처방 기록 및 복약 체크 기록 조회
    const checks = await this.recordsService.getMedicationChecks(recordId);

    if (!checks || checks.length === 0) {
      return {
        overall: null,
        last7Days: null,
        last14Days: null,
        last30Days: null,
        grade: null,
        dailyAdherence: {},
        message: 'No medication check records found',
      };
    }

    // 순응도 계산
    const overall = calculateAdherence(checks);
    const last7Days = calculateAdherenceByPeriod(checks, 7);
    const last14Days = calculateAdherenceByPeriod(checks, 14);
    const last30Days = calculateAdherenceByPeriod(checks, 30);

    // 등급 계산 (전체 순응도 기준)
    const grade = overall !== null ? getAdherenceGrade(overall) : null;

    // 일별 순응도 계산
    const dailyAdherenceMap = calculateDailyAdherence(checks);
    const dailyAdherence: Record<string, number> = {};
    dailyAdherenceMap.forEach((value, key) => {
      dailyAdherence[key] = value;
    });

    return {
      overall,
      last7Days,
      last14Days,
      last30Days,
      grade,
      dailyAdherence,
    };
  }
}
