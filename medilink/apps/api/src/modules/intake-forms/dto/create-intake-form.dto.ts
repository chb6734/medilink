import { IsUUID, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateIntakeFormDto {
  @IsUUID()
  patientId: string;

  @IsOptional()
  @IsUUID()
  facilityId?: string;

  @IsEnum(['new_symptom', 'followup'])
  visitType: 'new_symptom' | 'followup';

  @IsOptional()
  @IsUUID()
  relatedRecordId?: string;

  @IsString()
  @MaxLength(200)
  chiefComplaint: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  onsetText?: string;

  @IsEnum(['improving', 'worsening', 'no_change', 'unknown'])
  course: 'improving' | 'worsening' | 'no_change' | 'unknown';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  courseNote?: string;

  @IsEnum(['yes', 'partial', 'no', 'unknown'])
  adherence: 'yes' | 'partial' | 'no' | 'unknown';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  adherenceReason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  adverseEvents?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  allergies?: string;
}
