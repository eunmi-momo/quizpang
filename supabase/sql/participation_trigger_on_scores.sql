-- =============================================================================
-- 누적 참여 수 +1 (권장): scores 행이 INSERT 될 때마다 participation_counter +1
-- PostgREST/RPC/앱 코드와 무관하게 DB 안에서만 처리됩니다 (SECURITY DEFINER).
--
-- ⚠️ 배포 순서 (이중 카운트 방지)
--   1) GitHub 최신 앱을 먼저 배포하세요 (POST /api/score 에서 increment_participation RPC 호출이 제거된 버전).
--   2) 그 다음 이 파일 전체를 Supabase SQL Editor에서 한 번 실행하세요.
-- 예전 앱이 아직 RPC를 호출하는 상태에서 이 트리거만 먼저 켜면, 한 번에 +2가 될 수 있습니다.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.increment_participation_on_score_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.participation_counter (id, count)
  VALUES (1, 1000)
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.participation_counter
  SET count = count + 1
  WHERE id = 1;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_scores_increment_participation ON public.scores;

CREATE TRIGGER trg_scores_increment_participation
  AFTER INSERT ON public.scores
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_participation_on_score_insert();
