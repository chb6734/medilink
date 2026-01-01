import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateIntakeFormDto } from './dto';

@Injectable()
export class IntakeFormsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * IntakeForm 생성
   * 문진표 데이터를 DB에 저장
   */
  async createIntakeForm(data: CreateIntakeFormDto) {
    return this.prisma.intakeForm.create({
      data: {
        patientId: data.patientId,
        facilityId: data.facilityId,
        visitType: data.visitType,
        relatedRecordId: data.relatedRecordId,
        chiefComplaint: data.chiefComplaint,
        onsetText: data.onsetText,
        course: data.course,
        courseNote: data.courseNote,
        adherence: data.adherence,
        adherenceReason: data.adherenceReason,
        adverseEvents: data.adverseEvents,
        allergies: data.allergies,
      },
      include: {
        facility: true,
      },
    });
  }

  /**
   * 환자의 IntakeForm 목록 조회
   */
  async getIntakeForms(patientId: string) {
    return this.prisma.intakeForm.findMany({
      where: { patientId },
      include: { facility: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
