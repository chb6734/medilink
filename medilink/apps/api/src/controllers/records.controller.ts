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

    // 클라이언트가 약물 정보를 보냈다면 OCR을 다시 하지 않음 (성능 및 정확도 향상)
    if (query.medications && query.medications.length > 0) {
      console.log(
        '✅ 클라이언트에서 분석된 데이터를 받았습니다. 중복 OCR을 건너뜁니다.',
      );
      text = `Client-side analyzed record with ${query.medications.length} meds`;
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
      query.medications && query.medications.length > 0
        ? query.medications.map((m) => ({
            nameRaw: m.name,
            dose: m.dosage,
            frequency: m.frequency,
            confidence: m.confidence ?? null,
          }))
        : parseMedCandidates(text).map((nameRaw) => ({
            nameRaw,
            dose: '',
            frequency: '',
            confidence: null as number | null,
          }));

    const geminiSummary =
      query.medications && query.medications.length > 0
        ? `Analzed ${query.medications.length} meds: ${query.medications.map((m) => m.name).join(', ')}`
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
}
