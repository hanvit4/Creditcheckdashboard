# Gleam 릴리즈 노트

발행일: 2026-02-25  
버전 성격: 기능 안정화/정합화 릴리즈

---

## 한 줄 요약
Gleam은 **소셜 로그인 + 계정 연동**, **교회 등록/관리**, **성경 조회/필사**의 핵심 사용자 흐름이 연결된 상태이며, 문서/코드 기준을 현재 구현에 맞게 정리해 배포 준비도를 높였습니다.

## 이번 릴리즈 핵심

### 1) 소셜 로그인/연동 경험 고도화
- 로그인 화면에서 **Kakao / Google / Apple** 소셜 로그인 버튼 제공
- 프로필 내 소셜 연동 화면에서 provider 추가/해제 가능
- `Supabase Identity` 기반(`linkIdentity`, `unlinkIdentity`)으로 연동 처리
- OAuth 복귀 후 상태 복구, 중복/충돌/취소 케이스 에러 매핑 및 사용자 안내 강화

### 2) 교회 도메인 기능 운영 가능 수준 확보
- 교회 목록 조회(검색/도시 필터)
- 교회 등록(목록 선택, 코드 입력, 직접 등록)
- 내 교회 소속 조회/삭제
- 사용자당 최대 소속 개수 제한 UX 반영

### 3) 서버 구조 정리 및 안정성 개선
- 서버 코드 단일 소스 경로 확정: `supabase/functions/server/index.ts`
- 중복 서버 파일 제거로 유지보수 리스크 축소
- `/user/providers/disconnect-all` 중복 선언 제거 및 단일 핸들러로 통합
- disconnect-all 동작을 `users.provider` 초기화 + `user_providers` 정리로 일관화

### 4) 문서 정합화 완료
- 구현 보고서/설치 가이드/구현 요약 문서를 현재 코드 기준으로 갱신
- 레거시 API와 현재 실사용 경로(Supabase Identity 직결) 구분 명시
- 릴리즈 스모크 테스트 체크리스트 문서 신규 추가

---

## 아키텍처/기술 스택
- 프론트엔드: React + Vite + TypeScript
- 인증/백엔드: Supabase Auth + Supabase Edge Functions(Hono)
- 데이터: PostgreSQL (RLS 정책 적용)
- 핵심 도메인: 사용자 프로필, 소셜 계정 연동, 교회 소속, 성경 본문/검색, 필사 진행/크레딧

---

## 품질 상태
- 프로덕션 빌드: **성공** (`npm run build`)
- 중복 라우트: **정리 완료** (`/user/providers/disconnect-all` 1회 선언)
- 문서-코드 일치성: **정리 완료**
- 참고: 번들 크기 경고(500KB+)는 존재하며, 기능 안정화 이후 코드 스플릿 최적화 예정

---

## 현재 알려진 범위/제약
- GitHub OAuth provider는 미구현
- 자동 계정 통합(동일 이메일 자동 병합) 미구현
- 계정 병합 워크플로우 미구현
- 일부 `/user/providers*` 엔드포인트는 레거시 성격(현재 UI는 Supabase Identity 직접 사용)

---

## 다음 릴리즈 후보
1. GitHub OAuth provider 추가
2. 자동 계정 통합 및 병합 UX
3. 레거시 provider API 정리(현행 경로 기준 단순화)
4. 번들 크기 최적화(코드 스플릿, 청크 전략)

---

## 데모 포인트(대외 소개용)
1. 소셜 로그인 → 앱 진입
2. 프로필 탭에서 Google/Kakao/Apple 계정 추가 연동
3. 교회 검색/코드/직접 등록 흐름 시연
4. 성경 탭 조회 및 필사 진행 흐름 시연

---

## 관련 문서
- `COMPLETION_REPORT.md`
- `SOCIAL_LOGIN_SETUP.md`
- `SOCIAL_LOGIN_IMPLEMENTATION.md`
- `handoff/SMOKE_TEST_CHECKLIST.md`
