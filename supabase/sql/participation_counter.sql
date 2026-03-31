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

-- 행이 없을 때 UPDATE 0행만 하면 NULL 반환되어 앱에서 카운트가 안 올라가므로, 먼저 행을 보장한 뒤 +1
-- 기존 함수와 반환 타입이 다르면 CREATE OR REPLACE만으로는 교체 불가 → DROP 후 재생성
DROP FUNCTION IF EXISTS public.increment_participation();

CREATE OR REPLACE FUNCTION public.increment_participation()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count bigint;
BEGIN
  INSERT INTO public.participation_counter (id, count)
  VALUES (1, 1000)
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.participation_counter
  SET count = count + 1
  WHERE id = 1
  RETURNING count INTO new_count;

  RETURN new_count;
END;
$$;
