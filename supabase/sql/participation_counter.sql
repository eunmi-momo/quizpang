-- Supabase → SQL Editor → New query → 아래 CREATE부터 끝까지만 복사해 실행 (파일 경로/이름은 붙이지 마세요)
-- 누적 참여 수: 기본 1000, 퀴즈 완료(점수 저장) 시마다 +1

CREATE TABLE IF NOT EXISTS public.participation_counter (
  id smallint PRIMARY KEY,
  CONSTRAINT participation_counter_single_row CHECK (id = 1),
  count bigint NOT NULL DEFAULT 1000
);

INSERT INTO public.participation_counter (id, count)
VALUES (1, 1000)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.increment_participation()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count bigint;
BEGIN
  UPDATE public.participation_counter
  SET count = count + 1
  WHERE id = 1
  RETURNING count INTO new_count;
  RETURN new_count;
END;
$$;

-- 익명/로그인 사용자가 읽을 필요가 있으면 SELECT 정책 추가 (선택)
-- ALTER TABLE public.participation_counter ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Anyone can read counter" ON public.participation_counter FOR SELECT USING (true);
