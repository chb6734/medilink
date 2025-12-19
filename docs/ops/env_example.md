# 환경변수 예시(커밋용)

> 이 파일은 **예시**입니다. 실제 비밀번호/토큰을 넣지 마세요.

## 운영(Production) 예시 (placeholder)

```text
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require"
```

- managed Postgres(예: Neon) 사용 시 보통 SSL이 필요합니다.

## 테스트/개발(Test/Dev) 예시 (placeholder)

```text
DATABASE_URL="postgresql://postgres:password@helium/heliumdb?sslmode=disable"
```

- 로컬/도커 Postgres는 SSL을 끄는 구성이 흔합니다.


