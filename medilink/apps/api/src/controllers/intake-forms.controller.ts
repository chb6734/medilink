import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { IntakeFormsService } from '../modules/intake-forms/intake-forms.service';
import { CreateIntakeFormDto, GetIntakeFormsQueryDto } from '../modules/intake-forms/dto';
import type { Request } from 'express';

/**
 * IntakeForm (문진표) 관리 컨트롤러
 *
 * @description
 * - 문진표 생성 (POST /api/intake-forms)
 * - 문진표 목록 조회 (GET /api/intake-forms?patientId=xxx)
 */
@Controller('api/intake-forms')
export class IntakeFormsController {
  constructor(private readonly intakeFormsService: IntakeFormsService) {}

  /**
   * 문진표 생성
   *
   * @route POST /api/intake-forms
   * @body CreateIntakeFormDto
   *
   * @description
   * 문진표 작성 완료 후 DB에 저장합니다.
   * visitType: 'new_symptom' (새로운 증상) 또는 'followup' (이전 처방 관련)
   *
   * @example
   * POST /api/intake-forms
   * Body:
   * {
   *   "patientId": "uuid",
   *   "facilityId": "uuid",
   *   "visitType": "new_symptom",
   *   "chiefComplaint": "감기/기침",
   *   "onsetText": "3일 전",
   *   "course": "improving",
   *   "adherence": "yes",
   *   "adverseEvents": "없음",
   *   "allergies": "페니실린 알레르기"
   * }
   * Response:
   * {
   *   "id": "uuid",
   *   "patientId": "uuid",
   *   "facilityId": "uuid",
   *   "facility": { "id": "uuid", "name": "삼성서울병원", ... },
   *   "visitType": "new_symptom",
   *   "chiefComplaint": "감기/기침",
   *   ...
   * }
   */
  @Post()
  async createIntakeForm(@Req() req: Request, @Body() body: CreateIntakeFormDto) {
    // 인증된 사용자의 patientId 사용
    const patientId = (req as any).patientId as string | undefined;

    if (!patientId) {
      throw new HttpException(
        'Unauthorized: No patient ID found',
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      // 요청 body의 patientId 대신 인증된 patientId 사용
      return await this.intakeFormsService.createIntakeForm({
        ...body,
        patientId,
      });
    } catch (error) {
      console.error('Failed to create intake form:', error);
      throw new HttpException(
        'Failed to create intake form',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 현재 로그인한 환자의 최근 문진표 조회
   *
   * @route GET /api/intake-forms/me
   *
   * @description
   * 인증된 환자의 최근 문진표를 조회합니다 (최대 5개).
   */
  @Get('me')
  async getMyIntakeForms(@Req() req: Request) {
    const patientId = (req as any).patientId as string | undefined;

    if (!patientId) {
      throw new HttpException(
        'Unauthorized: No patient ID found',
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      const forms = await this.intakeFormsService.getIntakeForms(patientId);
      // 최근 5개만 반환
      return forms.slice(0, 5);
    } catch (error) {
      console.error('Failed to get my intake forms:', error);
      throw new HttpException(
        'Failed to get intake forms',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 환자의 문진표 목록 조회
   *
   * @route GET /api/intake-forms?patientId=xxx
   * @query patientId - 환자 ID
   *
   * @description
   * 특정 환자의 모든 문진표를 최신순으로 조회합니다.
   *
   * @example
   * GET /api/intake-forms?patientId=uuid
   * Response:
   * [
   *   {
   *     "id": "uuid",
   *     "patientId": "uuid",
   *     "facilityId": "uuid",
   *     "facility": { "id": "uuid", "name": "삼성서울병원", ... },
   *     "visitType": "new_symptom",
   *     "chiefComplaint": "감기/기침",
   *     "createdAt": "2024-01-01T00:00:00Z",
   *     ...
   *   }
   * ]
   */
  @Get()
  async getIntakeForms(@Query('patientId') patientId: string) {
    if (!patientId) {
      throw new HttpException(
        'patientId is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      return await this.intakeFormsService.getIntakeForms(patientId);
    } catch (error) {
      console.error('Failed to get intake forms:', error);
      throw new HttpException(
        'Failed to get intake forms',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
