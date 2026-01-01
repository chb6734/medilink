import {
  IsOptional,
  IsObject,
  IsArray,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Medication Item DTO for Update Record
 */
export class MedicationItemDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsString()
  dosage: string;

  @IsString()
  frequency: string;
}

/**
 * Update Record Body DTO
 *
 * PUT /api/records/:id 엔드포인트의 Body 검증
 * 복약 순응도 추적용
 */
export class UpdateRecordBodyDto {
  @IsOptional()
  @IsObject()
  dailyLog?: Record<string, boolean>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  alarmTimes?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MedicationItemDto)
  medications?: MedicationItemDto[];
}
