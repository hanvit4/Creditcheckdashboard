-- ===================================
-- Church domain schema (mock-style)
-- - churches: 교회 마스터
-- - user_church_memberships: 사용자-교회 소속
-- - church_code: 영문+숫자 랜덤 코드 자동 생성
-- ===================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 랜덤 코드 생성 함수 (영문 대문자 + 숫자)
CREATE OR REPLACE FUNCTION public.generate_alnum_code(p_length INT DEFAULT 6)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars CONSTANT TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INT;
BEGIN
  IF p_length IS NULL OR p_length < 4 THEN
    p_length := 6;
  END IF;

  FOR i IN 1..p_length LOOP
    result := result || substr(chars, (floor(random() * length(chars))::INT + 1), 1);
  END LOOP;

  RETURN result;
END;
$$;

-- 교회 테이블 (목업 구조 반영)
CREATE TABLE IF NOT EXISTS public.churches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_code TEXT UNIQUE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT,
  phone TEXT,
  member_count INT NOT NULL DEFAULT 0,
  pastor TEXT,
  denomination TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 코드 자동 생성 트리거
CREATE OR REPLACE FUNCTION public.set_church_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  attempt INT := 0;
  candidate TEXT;
BEGIN
  IF NEW.church_code IS NOT NULL AND length(trim(NEW.church_code)) > 0 THEN
    NEW.church_code := upper(trim(NEW.church_code));
    RETURN NEW;
  END IF;

  LOOP
    attempt := attempt + 1;
    candidate := public.generate_alnum_code(6);

    EXIT WHEN NOT EXISTS (
      SELECT 1
      FROM public.churches c
      WHERE c.church_code = candidate
    );

    IF attempt > 20 THEN
      RAISE EXCEPTION 'Failed to generate unique church_code after % attempts', attempt;
    END IF;
  END LOOP;

  NEW.church_code := candidate;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_church_code ON public.churches;
CREATE TRIGGER trg_set_church_code
  BEFORE INSERT ON public.churches
  FOR EACH ROW
  EXECUTE FUNCTION public.set_church_code();

-- 사용자-교회 소속 테이블
CREATE TABLE IF NOT EXISTS public.user_church_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'approved', -- approved | pending | rejected
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, church_id)
);

-- 사용자당 primary 소속은 1개만 허용
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_church_primary_unique
  ON public.user_church_memberships(user_id)
  WHERE is_primary = TRUE;

-- 조회 성능 인덱스
CREATE INDEX IF NOT EXISTS idx_churches_city ON public.churches(city);
CREATE INDEX IF NOT EXISTS idx_churches_district ON public.churches(district);
CREATE INDEX IF NOT EXISTS idx_churches_name ON public.churches(name);
CREATE INDEX IF NOT EXISTS idx_churches_code ON public.churches(church_code);
CREATE INDEX IF NOT EXISTS idx_user_church_memberships_user ON public.user_church_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_church_memberships_church ON public.user_church_memberships(church_id);

-- 사용자당 최대 2개 소속 제한
CREATE OR REPLACE FUNCTION public.enforce_user_church_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  active_count INT;
BEGIN
  SELECT count(*)
  INTO active_count
  FROM public.user_church_memberships m
  WHERE m.user_id = NEW.user_id
    AND m.status IN ('approved', 'pending')
    AND (TG_OP <> 'UPDATE' OR m.id <> NEW.id);

  IF active_count >= 2 THEN
    RAISE EXCEPTION 'A user can only have up to 2 church memberships';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_user_church_limit ON public.user_church_memberships;
CREATE TRIGGER trg_enforce_user_church_limit
  BEFORE INSERT OR UPDATE ON public.user_church_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_user_church_limit();

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_churches_updated_at ON public.churches;
CREATE TRIGGER trg_touch_churches_updated_at
  BEFORE UPDATE ON public.churches
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_touch_user_church_memberships_updated_at ON public.user_church_memberships;
CREATE TRIGGER trg_touch_user_church_memberships_updated_at
  BEFORE UPDATE ON public.user_church_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

-- RLS
ALTER TABLE public.churches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_church_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read churches" ON public.churches;
CREATE POLICY "Authenticated users can read churches"
  ON public.churches
  FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

DROP POLICY IF EXISTS "Users can view own church memberships" ON public.user_church_memberships;
CREATE POLICY "Users can view own church memberships"
  ON public.user_church_memberships
  FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own church memberships" ON public.user_church_memberships;
CREATE POLICY "Users can insert own church memberships"
  ON public.user_church_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own church memberships" ON public.user_church_memberships;
CREATE POLICY "Users can update own church memberships"
  ON public.user_church_memberships
  FOR UPDATE
  TO authenticated
  USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete own church memberships" ON public.user_church_memberships;
CREATE POLICY "Users can delete own church memberships"
  ON public.user_church_memberships
  FOR DELETE
  TO authenticated
  USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

-- 샘플 데이터 (목업 대응)
INSERT INTO public.churches (name, address, city, district, phone, member_count, pastor, denomination)
VALUES
  ('은혜중앙교회', '서울시 강남구 테헤란로 123', '서울', '강남구', '02-1234-5678', 850, '김은혜 목사', '예장통합'),
  ('사랑의교회', '서울시 서초구 서초대로 456', '서울', '서초구', '02-2345-6789', 1200, '박사랑 목사', '예장합동'),
  ('믿음교회', '서울시 송파구 올림픽로 789', '서울', '송파구', '02-3456-7890', 650, '이믿음 목사', '기독교대한감리회'),
  ('소망교회', '경기도 성남시 분당구 정자로 321', '경기', '성남시', '031-1234-5678', 920, '최소망 목사', '예장통합'),
  ('빛과소금교회', '서울시 마포구 월드컵로 234', '서울', '마포구', '02-4567-8901', 430, '정빛나 목사', '예장고신')
ON CONFLICT DO NOTHING;
