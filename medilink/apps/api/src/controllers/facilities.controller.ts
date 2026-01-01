import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { FacilityType } from '@prisma/client';
import { VertexAI } from '@google-cloud/vertexai';
import { z } from 'zod';

/**
 * 병원/의료기관 검색 및 관리 컨트롤러
 *
 * @description
 * - 병원 이름으로 검색
 * - 진료 과목별 필터링 (이비인후과, 안과, 정형외과 등)
 * - 검색어가 있으면 과별 필터링 무시하고 전체 검색
 */
@Controller('api/facilities')
export class FacilitiesController {
  constructor(private readonly db: PrismaService) {}

  /**
   * 병원/의료기관 검색
   *
   * @route GET /api/facilities/search
   * @query keyword - 검색어 (병원 이름)
   * @query specialty - 진료 과목 (이비인후과, 안과, 정형외과 등)
   * @query type - 의료기관 종류 (clinic, hospital, pharmacy, unknown)
   *
   * @description
   * - keyword가 있으면: specialty 무시하고 병원 이름으로 전체 검색
   * - keyword 없고 specialty 있으면: 해당 진료 과목으로 필터링
   * - 둘 다 없으면: 전체 병원 조회 (최대 50개)
   *
   * @example
   * GET /api/facilities/search?keyword=한양
   * Response:
   * {
   *   "facilities": [
   *     {
   *       "id": "uuid",
   *       "name": "한양대병원",
   *       "type": "hospital",
   *       "typeLabel": "상급병원",
   *       "specialty": "종합진료",
   *       "address": "서울특별시 성동구 왕십리로 222",
   *       "phone": "02-2290-8114"
   *     },
   *     {
   *       "id": "uuid",
   *       "name": "한양정형외과",
   *       "type": "clinic",
   *       "typeLabel": "의원",
   *       "specialty": "정형외과",
   *       "address": "서울특별시 강남구",
   *       "phone": "02-1234-5678"
   *     }
   *   ]
   * }
   *
   * @example
   * GET /api/facilities/search?specialty=이비인후과
   * Response:
   * {
   *   "facilities": [
   *     {
   *       "id": "uuid",
   *       "name": "서울이비인후과",
   *       "type": "clinic",
   *       "typeLabel": "의원",
   *       "specialty": "이비인후과",
   *       "address": "서울특별시 종로구",
   *       "phone": "02-1234-5678"
   *     }
   *   ]
   * }
   */
  @Get('search')
  async searchFacilities(
    @Query('keyword') keyword?: string,
    @Query('specialty') specialty?: string,
    @Query('type') type?: string,
  ) {
    // 검색 조건 구성
    const where: any = {};

    // 1. keyword가 있으면 specialty 무시하고 이름으로 검색
    if (keyword && keyword.trim()) {
      where.name = {
        contains: keyword.trim(),
        mode: 'insensitive', // 대소문자 구분 없이
      };
    } else if (specialty && specialty.trim()) {
      // 2. keyword 없고 specialty 있으면 과별 필터링
      where.specialty = {
        contains: specialty.trim(),
        mode: 'insensitive',
      };
    }

    // 3. type 필터 (선택사항)
    if (type && Object.values(FacilityType).includes(type as FacilityType)) {
      where.type = type as FacilityType;
    }

    // DB 조회
    const facilities = await this.db.facility.findMany({
      where,
      select: {
        id: true,
        name: true,
        type: true,
        specialty: true,
        address: true,
        phone: true,
        createdAt: true,
      },
      orderBy: [
        { name: 'asc' }, // 이름순 정렬
      ],
      take: 50, // 최대 50개
    });

    // typeLabel 추가 (한글 라벨)
    const facilitiesWithLabel = facilities.map((f) => ({
      ...f,
      typeLabel: this.getFacilityTypeLabel(f.type),
    }));

    return {
      facilities: facilitiesWithLabel,
      count: facilitiesWithLabel.length,
    };
  }

  /**
   * 의료기관 종류 한글 라벨 반환
   */
  private getFacilityTypeLabel(type: FacilityType): string {
    const labels: Record<FacilityType, string> = {
      clinic: '의원',
      hospital: '병원',
      pharmacy: '약국',
      unknown: '기타',
    };
    return labels[type] || '기타';
  }

  /**
   * 특정 병원 상세 정보 조회
   *
   * @route GET /api/facilities/:id
   * @param id - 병원 ID
   *
   * @example
   * GET /api/facilities/uuid
   * Response:
   * {
   *   "id": "uuid",
   *   "name": "삼성서울병원",
   *   "type": "hospital",
   *   "typeLabel": "병원",
   *   "specialty": "종합진료",
   *   "address": "서울특별시 강남구 일원로 81",
   *   "phone": "02-3410-2114"
   * }
   */
  @Get(':id')
  async getFacilityById(@Query('id') id: string) {
    if (!id) {
      throw new HttpException(
        'Facility ID is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const facility = await this.db.facility.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        type: true,
        specialty: true,
        address: true,
        phone: true,
        createdAt: true,
      },
    });

    if (!facility) {
      throw new HttpException('Facility not found', HttpStatus.NOT_FOUND);
    }

    return {
      ...facility,
      typeLabel: this.getFacilityTypeLabel(facility.type),
    };
  }

  /**
   * AI 기반 증상 분석 및 진료 과목 추천
   *
   * @route POST /api/facilities/recommend-specialty
   * @body { symptoms: string }
   *
   * @description
   * 환자가 입력한 증상을 AI(Gemini)로 분석하여 적절한 진료 과목을 추천합니다.
   * process_new.md의 요구사항:
   * - "목이 아파요" -> "이비인후과"
   * - "배가 아파요" -> "내과"
   * - "허리가 아파요" -> "정형외과"
   *
   * @example
   * POST /api/facilities/recommend-specialty
   * Body:
   * {
   *   "symptoms": "목이 아프고 기침이 나요"
   * }
   * Response:
   * {
   *   "recommendedSpecialties": ["이비인후과", "내과"],
   *   "primarySpecialty": "이비인후과",
   *   "reasoning": "목 통증과 기침은 이비인후과 질환의 일반적인 증상입니다."
   * }
   */
  @Post('recommend-specialty')
  async recommendSpecialty(@Body() body: unknown) {
    // DTO 검증
    const RecommendSpecialtyDto = z.object({
      symptoms: z.string().min(1, '증상을 입력해주세요'),
    });

    const validation = RecommendSpecialtyDto.safeParse(body);
    if (!validation.success) {
      throw new HttpException(
        {
          message: 'Validation failed',
          errors: validation.error.issues,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const { symptoms } = validation.data;

    // AI 추천 기능 비활성화 시 기본값 반환
    if (process.env.GEMINI_ENABLED !== 'true') {
      return {
        recommendedSpecialties: ['내과'],
        primarySpecialty: '내과',
        reasoning: 'AI 추천 기능이 비활성화되어 기본 진료 과목을 반환합니다.',
      };
    }

    try {
      // Vertex AI Gemini 호출
      const project = process.env.GOOGLE_CLOUD_PROJECT;
      const location = process.env.GOOGLE_CLOUD_LOCATION ?? 'us-central1';

      if (!project) {
        throw new Error('GOOGLE_CLOUD_PROJECT 환경변수가 설정되지 않았습니다.');
      }

      const vertex = new VertexAI({ project, location });
      const modelName = process.env.GEMINI_MODEL ?? 'gemini-1.5-flash';
      const model = vertex.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 512,
        },
      });

      const prompt = `당신은 의료 증상을 분석하여 적절한 진료 과목을 추천하는 AI 어시스턴트입니다.

환자의 증상:
${symptoms}

위 증상을 분석하여 다음 진료 과목 중 가장 적합한 과목을 추천해주세요:
- 내과
- 이비인후과
- 안과
- 정형외과
- 피부과
- 산부인과
- 소아과
- 정신건강의학과
- 치과
- 응급의학과

다음 JSON 형식으로만 응답해주세요 (다른 설명 없이):
{
  "recommendedSpecialties": ["추천 과목 1", "추천 과목 2"],
  "primarySpecialty": "가장 적합한 과목",
  "reasoning": "추천 이유 (1-2문장)"
}

주의:
- 진단을 하지 마세요. 증상에 기반한 과목만 추천하세요.
- 응답은 반드시 위 JSON 형식만 포함하세요.`;

      const resp = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      const responseText =
        resp.response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

      // JSON 파싱
      let result;
      try {
        // Markdown 코드 블록 제거 (```json ... ``` 형식 제거)
        const cleanedText = responseText
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
        result = JSON.parse(cleanedText);
      } catch (parseError) {
        console.error('Failed to parse Gemini response:', responseText);
        // 파싱 실패 시 기본값 반환
        return {
          recommendedSpecialties: ['내과'],
          primarySpecialty: '내과',
          reasoning: '증상을 분석하지 못했습니다. 일반 내과 진료를 권장합니다.',
        };
      }

      return result;
    } catch (error) {
      console.error('Failed to recommend specialty:', error);
      // AI 오류 시 기본값 반환
      return {
        recommendedSpecialties: ['내과'],
        primarySpecialty: '내과',
        reasoning: 'AI 추천 중 오류가 발생했습니다. 일반 내과 진료를 권장합니다.',
      };
    }
  }
}
