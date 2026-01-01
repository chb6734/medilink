import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CustomLoggerService } from '../logger/logger.service';

/**
 * AllExceptionsFilter
 *
 * 모든 예외를 잡아서 일관된 형식으로 응답하는 Global Exception Filter
 *
 * 특징:
 * - 모든 예외를 자동으로 catch
 * - 일관된 에러 응답 형식
 * - 자동 로깅
 * - 프로덕션 환경에서 스택 트레이스 숨김
 *
 * 응답 형식:
 * ```json
 * {
 *   "statusCode": 400,
 *   "timestamp": "2026-01-01T00:00:00.000Z",
 *   "path": "/api/records",
 *   "message": "Bad Request",
 *   "error": "invalid_query"
 * }
 * ```
 *
 * 사용법 (main.ts):
 * ```typescript
 * const logger = app.get(CustomLoggerService);
 * logger.setContext('AllExceptionsFilter');
 * app.useGlobalFilters(new AllExceptionsFilter(logger));
 * ```
 */
@Catch()
@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: CustomLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // HTTP 상태 코드 결정
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // 에러 메시지 추출
    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error' };

    // 에러 로깅
    const errorMessage = exception instanceof Error ? exception.message : String(exception);
    const errorStack = exception instanceof Error ? exception.stack : undefined;

    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${errorMessage}`,
      errorStack,
      'AllExceptionsFilter',
    );

    // 응답 객체 생성
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      ...(typeof message === 'string' ? { message } : message),
    };

    // 프로덕션 환경에서는 스택 트레이스 제거
    if (process.env.NODE_ENV === 'production') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (errorResponse as any).stack;
    } else {
      // 개발 환경에서는 스택 트레이스 포함
      if (errorStack) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (errorResponse as any).stack = errorStack;
      }
    }

    response.status(status).json(errorResponse);
  }
}
