import {
  Controller,
  Get,
  Put,
  Body,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { PrismaService } from '../database/prisma.service';

/**
 * 환자 정보 업데이트 DTO
 */
const UpdatePatientDto = z.object({
  birthDate: z.string().optional(), // ISO 8601 날짜 문자열
  bloodType: z.string().optional(), // A+, B-, O+, AB- 등
  heightCm: z.number().positive().optional(), // 키 (cm)
  weightKg: z.number().positive().optional(), // 몸무게 (kg)
  allergies: z.string().optional(), // 알레르기 정보
  emergencyContact: z.string().optional(), // 비상연락처
});

type UpdatePatientDto = z.infer<typeof UpdatePatientDto>;

/**
 * 환자 정보 관리 컨트롤러
 *
 * @description
 * 환자의 기본 정보(생년월일, 혈액형, 키, 몸무게, 알레르기 등)를 관리합니다.
 * 문진표 작성 시 알레르기 정보를 자동으로 불러오기 위해 사용됩니다.
 */
@Controller('api/patients')
export class PatientsController {
  constructor(private readonly db: PrismaService) {}

  /**
   * 현재 로그인한 환자의 정보 조회
   *
   * @route GET /api/patients/me
   * @returns 환자 정보 (생년월일, 혈액형, 키, 몸무게, 알레르기 등)
   *
   * @example
   * GET /api/patients/me
   * Response:
   * {
   *   "id": "uuid",
   *   "birthDate": "1990-01-01T00:00:00.000Z",
   *   "age": 36,
   *   "bloodType": "A+",
   *   "heightCm": 175.5,
   *   "weightKg": 70.2,
   *   "allergies": "페니실린, 땅콩",
   *   "emergencyContact": "010-1234-5678"
   * }
   */
  @Get('me')
  async getMyInfo(@Req() req: Request) {
    const patientId = (req as any).patientId as string | undefined;

    if (!patientId) {
      throw new HttpException(
        'Unauthorized: No patient ID found',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const patient = await this.db.patient.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        birthDate: true,
        bloodType: true,
        heightCm: true,
        weightKg: true,
        allergies: true,
        emergencyContact: true,
        createdAt: true,
      },
    });

    if (!patient) {
      throw new HttpException('Patient not found', HttpStatus.NOT_FOUND);
    }

    // 만나이 계산 (생년월일이 있는 경우)
    let age: number | null = null;
    if (patient.birthDate) {
      const today = new Date();
      const birthDate = new Date(patient.birthDate);
      age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }
    }

    return {
      ...patient,
      age,
    };
  }

  /**
   * 현재 로그인한 환자의 정보 수정
   *
   * @route PUT /api/patients/me
   * @body UpdatePatientDto
   * @returns 업데이트된 환자 정보
   *
   * @example
   * PUT /api/patients/me
   * Body:
   * {
   *   "birthDate": "1990-01-01",
   *   "bloodType": "A+",
   *   "heightCm": 175.5,
   *   "weightKg": 70.2,
   *   "allergies": "페니실린, 땅콩",
   *   "emergencyContact": "010-1234-5678"
   * }
   */
  @Put('me')
  async updateMyInfo(@Req() req: Request, @Body() body: unknown) {
    const patientId = (req as any).patientId as string | undefined;

    if (!patientId) {
      throw new HttpException(
        'Unauthorized: No patient ID found',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // DTO 검증
    const validation = UpdatePatientDto.safeParse(body);
    if (!validation.success) {
      throw new HttpException(
        {
          message: 'Validation failed',
          errors: validation.error.issues,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const dto = validation.data;

    // birthDate 문자열을 Date 객체로 변환
    const updateData: any = { ...dto };
    if (dto.birthDate) {
      updateData.birthDate = new Date(dto.birthDate);
    }

    // 환자 정보 업데이트
    const updatedPatient = await this.db.patient.update({
      where: { id: patientId },
      data: updateData,
      select: {
        id: true,
        birthDate: true,
        bloodType: true,
        heightCm: true,
        weightKg: true,
        allergies: true,
        emergencyContact: true,
        createdAt: true,
      },
    });

    // 만나이 계산
    let age: number | null = null;
    if (updatedPatient.birthDate) {
      const today = new Date();
      const birthDate = new Date(updatedPatient.birthDate);
      age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }
    }

    return {
      ...updatedPatient,
      age,
    };
  }
}
