import { IsUUID } from 'class-validator';

export class GetIntakeFormsQueryDto {
  @IsUUID()
  patientId: string;
}
