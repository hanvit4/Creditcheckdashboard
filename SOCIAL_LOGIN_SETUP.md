# 소셜로그인 연동 기능 설치 가이드

## 📋 개요
이 가이드는 신뢰보험의 소셜로그인 연동(Social Login Link/Unlink) 기능을 Supabase에 설치하는 방법을 설명합니다.

### 주요 기능
- **여러 소셜 계정 하나로 통합**: Google, Kakao, Apple, GitHub 등 다양한 소셜 계정을 하나의 사용자 계정에 연동
- **계정 연동 관리**: 프로필 탭에서 연동된 소셜 계정 조회, 추가, 해제 가능
- **자동 계정 생성**: 신규 사용자 생성 시 자동으로 users 테이블에 레코드 생성
- **RLS 보안**: Row Level Security를 통한 사용자별 데이터 격리

---

## 🚀 설치 단계

### 1단계: Supabase SQL 마이그레이션 실행

1. [Supabase 대시보드](https://supabase.com/dashboard) 로그인
2. 프로젝트 선택: **wrdxngjzffmsrnnemmel**
3. **SQL Editor** 메뉴로 이동
4. **New Query** 클릭
5. [001_social_login_setup.sql](../supabase/migrations/001_social_login_setup.sql) 파일의 전체 내용을 복사
6. SQL 에디터에 붙여넣기
7. **Run** 버튼으로 실행

**예상 결과**:
- `auth.users` 생성 시 자동으로 `public.users` 레코드 생성 (Trigger)
- 다음 6개 테이블 생성:
  - `users`: 사용자 기본 정보
  - `user_providers`: 소셜 계정 연동 정보
  - `completed_verses`: 필사 완료 구절
  - `transcriptions`: 필사 기록
  - `daily_stats`: 일일 통계
  - 인덱스 및 RLS 정책

---

### 2단계: 클라이언트 코드 확인

이미 다음 파일들이 구현되어 있습니다:

#### 서버 API (src/supabase/functions/server/index.tsx)
```typescript
// 소셜 계정 연동 API 엔드포인트
GET  /make-server-3ed9c009/user/providers           // 연동된 계정 조회
POST /make-server-3ed9c009/user/providers/link      // 계정 연동
DELETE /make-server-3ed9c009/user/providers/:id    // 계정 연동 해제
POST /make-server-3ed9c009/user/providers/disconnect-all // 모든 계정 연동 해제
```

#### 클라이언트 API 래퍼 (src/utils/api.tsx)
```typescript
getUserProviders()                    // 연동된 계정 조회
linkProvider(data: ProviderLinkData) // 계정 연동
unlinkProvider(providerId: string)   // 계정 연동 해제
disconnectAllProviders()              // 모든 계정 연동 해제
```

#### UI 컴포넌트 (src/components/LinkedProviders.tsx)
- 연동된 소셜 계정 목록 표시
- 계정 연동 해제 버튼
- 새로운 소셜 계정 연동 버튼 (Google, Kakao, Apple)
- 로딩/에러 상태 처리

---

## 🔗 소셜 계정 연동 구현 (미완성 - 추가 작업 필요)

현재 `LinkedProviders.tsx`의 `handleLinkGoogle()`, `handleLinkKakao()` 등은 스텁 상태입니다.  
실제 구현을 위해서는 다음 과정이 필요합니다:

### Google OAuth 연동 예시

1. **Supabase 대시보드에서 Google OAuth 설정**
   - Authentication → Providers → Google 활성화
   - Google Cloud Console에서 OAuth 2.0 자격증명 생성
   - 클라이언트 ID, 클라이언트 시크릿 복사
   - Authorized redirect URIs에 `https://wrdxngjzffmsrnnemmel.supabase.co/auth/v1/callback` 추가

2. **클라이언트 코드에서 Google OAuth 호출**
   ```typescript
   // LinkedProviders.tsx에서 구현 필요
   const handleLinkGoogle = async () => {
     const { data, error } = await supabase.auth.signInWithOAuth({
       provider: 'google',
       options: {
         queryParams: {
           access_type: 'offline',
           prompt: 'consent',
         },
       },
     });

     if (error) {
       console.error('Google OAuth failed:', error);
       return;
     }

     // OAuth 성공 후 user 정보 추출
     const user = data.user;
     const provider_id = user.identities?.find(i => i.provider === 'google')?.id;

     // linkProvider() API 호출
     await api.linkProvider({
       provider: 'google',
       provider_user_id: provider_id,
       provider_email: user.email,
       provider_name: user.user_metadata?.full_name,
     });
   };
   ```

3. **Kakao OAuth 연동** (마찬가지로 구현)
   - Supabase에서 Kakao OAuth 설정
   - Kakao Developers 콘솔에서 앱 생성
   - 같은 방식으로 `handleLinkKakao()` 구현

---

## 📊 DB 스키마 상세 설명

### users 테이블
```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY,              -- auth.users.id 참조
  email TEXT NOT NULL UNIQUE,       -- 이메일
  nickname TEXT,                    -- 닉네임
  church TEXT,                      -- 소속 교회
  credits INT DEFAULT 0,            -- 크레딧
  bio TEXT,                         -- 자기소개
  avatar_url TEXT,                  -- 프로필 이미지
  created_at TIMESTAMPTZ,           -- 생성 시간
  updated_at TIMESTAMPTZ            -- 수정 시간
);
```

### user_providers 테이블
```sql
CREATE TABLE public.user_providers (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,            -- users.id 참조
  provider TEXT NOT NULL,           -- 'google', 'kakao', 'apple' 등
  provider_user_id TEXT NOT NULL,   -- provider에서 받은 고유 ID
  provider_email TEXT,              -- provider의 이메일
  provider_name TEXT,               -- provider의 사용자 이름
  provider_metadata JSONB,          -- 추가 정보 (JSON)
  linked_at TIMESTAMPTZ,            -- 연동 시간
  last_used_at TIMESTAMPTZ,         -- 마지막 사용 시간
  UNIQUE(provider, provider_user_id),
  UNIQUE(user_id, provider)
);
```

### RLS 정책
- **users 테이블**: 자신의 프로필만 조회/수정 가능
- **user_providers 테이블**: 자신의 연동 계정만 조회/삭제 가능
- **completed_verses, transcriptions, daily_stats 테이블**: 자신의 데이터만 조회 가능

---

## 🔄 데이터 마이그레이션 (KV 스토어 → RDB)

현재 사용 중인 KV 스토어(kv_store_3ed9c009)의 프로필 데이터를 RDB로 마이그레이션할 수 있습니다.

### 마이그레이션 스크립트 예시
```sql
-- KV 스토어의 프로필 데이터를 users 테이블로 마이그레이션
-- (추가적으로 작성 필요 - KV 스토어에서 데이터 추출 방식에 따라 다름)
```

---

## ✅ 테스트 방법

### 1. 프로필 탭에서 LinkedProviders 컴포넌트 확인
```
앱 실행 → 프로필 탭 → "소셜 계정 연동" 섹션 보임
```

### 2. API 테스트 (curl)
```bash
# 현재 사용자의 연동된 계정 조회
curl -X GET https://wrdxngjzffmsrnnemmel.supabase.co/functions/v1/make-server-3ed9c009/user/providers \
  -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>" \
  -H "Content-Type: application/json"

# Google 계정 연동 (테스트용)
curl -X POST https://wrdxngjzffmsrnnemmel.supabase.co/functions/v1/make-server-3ed9c009/user/providers/link \
  -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "google",
    "provider_user_id": "123456789",
    "provider_email": "user@example.com",
    "provider_name": "John Doe"
  }'

# 계정 연동 해제
curl -X DELETE https://wrdxngjzffmsrnnemmel.supabase.co/functions/v1/make-server-3ed9c009/user/providers/{provider_id} \
  -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>" \
  -H "Content-Type: application/json"
```

---

## 🐛 트러블슈팅

### 1. "Unauthorized: Invalid token" 에러
- Supabase 인증 확인
- 로그인 후 다시 시도

### 2. "UNIQUE constraint failed" (provider 중복 연동)
- 이미 연동된 provider는 자동으로 `last_used_at` 업데이트만 됨
- 기존 연동을 먼저 해제 후 재연동

### 3. LinkedProviders UI가 나타나지 않음
- React 컴포넌트 import 확인
- ProfileTab.tsx에 `<LinkedProviders />` 추가되어 있는지 확인

---

## 📝 다음 구현 사항

1. **Google/Kakao/Apple OAuth 통합** - handleLink* 함수 구현
2. **자동 계정 통합** - 이미 존재하는 이메일로 새 OAuth 시도 시 자동 연동
3. **계정 병합** - 같은 이메일의 여러 OAuth 계정을 하나로 통합
4. **소셜 로그인 버튼** - 로그인 화면에 "Google/Kakao로 로그인" 추가

---

## 📞 문의
소셜로그인 기능 구현 중 문제가 있으면 개발팀에 문의하세요.
