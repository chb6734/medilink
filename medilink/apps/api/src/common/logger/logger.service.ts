import { Injectable, LoggerService as NestLoggerService, Scope } from '@nestjs/common';

/**
 * CustomLoggerService
 *
 * NestJS Logger를 확장하여 일관된 로깅을 제공하는 서비스
 *
 * 특징:
 * - console.log를 대체
 * - 컨텍스트 기반 로깅 (어느 클래스/모듈에서 로그가 발생했는지 추적)
 * - 프로덕션 환경에서 외부 로깅 서비스 연동 가능 (Sentry, DataDog 등)
 * - 타임스탬프 자동 추가
 *
 * 사용법:
 * ```typescript
 * @Injectable()
 * export class SomeService {
 *   constructor(private readonly logger: CustomLoggerService) {
 *     this.logger.setContext('SomeService'); // 컨텍스트 설정
 *   }
 *
 *   someMethod() {
 *     this.logger.log('Processing started');
 *     this.logger.error('Something went wrong', err.stack);
 *     this.logger.warn('Deprecated method called');
 *   }
 * }
 * ```
 */
@Injectable({ scope: Scope.TRANSIENT })
export class CustomLoggerService implements NestLoggerService {
  private context?: string;

  setContext(context: string) {
    this.context = context;
  }

  /**
   * 일반 로그
   */
  log(message: string, context?: string) {
    const ctx = context ?? this.context ?? 'App';
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${ctx}] ${message}`);
  }

  /**
   * 에러 로그
   */
  error(message: string, trace?: string, context?: string) {
    const ctx = context ?? this.context ?? 'App';
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [${ctx}] ERROR: ${message}`);
    if (trace) {
      console.error(`[${timestamp}] [${ctx}] Stack: ${trace}`);
    }

    // TODO: 프로덕션 환경에서 Sentry 등 외부 서비스로 전송
    // if (process.env.NODE_ENV === 'production') {
    //   Sentry.captureException(new Error(message));
    // }
  }

  /**
   * 경고 로그
   */
  warn(message: string, context?: string) {
    const ctx = context ?? this.context ?? 'App';
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [${ctx}] WARN: ${message}`);
  }

  /**
   * 디버그 로그 (개발 환경에서만 출력)
   */
  debug(message: string, context?: string) {
    if (process.env.NODE_ENV === 'production') {
      return; // 프로덕션에서는 디버그 로그 생략
    }

    const ctx = context ?? this.context ?? 'App';
    const timestamp = new Date().toISOString();
    console.debug(`[${timestamp}] [${ctx}] DEBUG: ${message}`);
  }

  /**
   * 상세 로그 (verbose)
   */
  verbose(message: string, context?: string) {
    if (process.env.NODE_ENV === 'production') {
      return; // 프로덕션에서는 verbose 로그 생략
    }

    const ctx = context ?? this.context ?? 'App';
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${ctx}] VERBOSE: ${message}`);
  }
}
