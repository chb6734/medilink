import {
  IsUUID,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  IsISO8601,
  IsArray,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Medication from Client DTO
 * 클라이언트에서 분석된 약물 정보
 */
export class ClientMedicationDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  dosage?: string;

  @IsOptional()
  @IsString()
  frequency?: string;

  @IsOptional()
  @IsNumber()
  confidence?: number;
}

/**
 * Create Record Query DTO
 *
 * POST /api/records 엔드포인트의 Query 파라미터 검증
 */
export class CreateRecordQueryDto {
  @IsUUID('4', { message: 'patientId must be a valid UUID' })
  patientId: string;

  @IsEnum(['dispensing_record', 'prescription'], {
    message: 'recordType must be either dispensing_record or prescription',
  })
  recordType: 'dispensing_record' | 'prescription';

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  facilityName?: string;

  @IsOptional()
  @IsEnum(['clinic', 'hospital', 'pharmacy', 'unknown'], {
    message: 'facilityType must be one of: clinic, hospital, pharmacy, unknown',
  })
  facilityType?: 'clinic' | 'hospital' | 'pharmacy' | 'unknown';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  chiefComplaint?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  doctorDiagnosis?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  noteDoctorSaid?: string;

  @IsOptional()
  @IsISO8601()
  prescribedAt?: string;

  @IsOptional()
  @IsISO8601()
  dispensedAt?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClientMedicationDto)
  medications?: ClientMedicationDto[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  daysSupply?: number;
}
