# 환경변수(운영/테스트) 정리

> 주의: 이 문서에는 **실제 비밀번호/토큰을 절대 커밋하지 않습니다.**
> 운영/테스트 값은 배포 플랫폼(Secret/Env 설정) 또는 로컬 `.env`에만 저장하세요.

## 공통
- **DATABASE_URL**: 애플리케이션이 사용하는 Postgres 연결 문자열
  - 형식(예시): `postgresql://USER:PASSWORD@HOST:PORT/DBNAME?sslmode=require`
  - 커밋 가능한 예시는 `docs/ops/env_example.md` 참고

## 운영(Production)
- **DB 유형**: Neon Postgres(예: managed Postgres)
- **권장**: SSL 사용
  - 예: `sslmode=require` (또는 Neon 권장 옵션)
- (선택) 분리 변수로 운영을 명확히 하고 싶다면:
  - **DATABASE_URL_PROD**: 운영 DB URL

## 테스트/개발(Test/Dev)
- **DB 유형**: 로컬/컨테이너 Postgres (예: docker service `helium`)
- 로컬 테스트에서는 SSL 미사용인 경우가 많음
  - 예: `sslmode=disable`
- (선택) 분리 변수:
  - **DATABASE_URL_TEST**: 테스트 DB URL

## 운영 방식(권장)
### 옵션 A: 환경별로 `DATABASE_URL`만 다르게 세팅(가장 단순)
- 운영 환경: `DATABASE_URL = (운영 DB URL)`
- 테스트/개발 환경: `DATABASE_URL = (테스트 DB URL)`

### 옵션 B: `DATABASE_URL_PROD/TEST`를 두고 런타임에서 선택
- 코드에서 `NODE_ENV`/`APP_ENV`로 분기하여 사용
- 장점: 실수로 운영 DB를 로컬에서 건드릴 위험 감소


