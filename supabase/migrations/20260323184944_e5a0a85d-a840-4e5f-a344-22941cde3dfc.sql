
CREATE OR REPLACE FUNCTION public.grade_quiz_attempt(
  p_quiz_id uuid,
  p_answers jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_score integer := 0;
  v_max_score integer := 0;
  v_question record;
  v_user_answer jsonb;
  v_correct boolean;
  v_passing_score integer;
  v_passed boolean;
  v_results jsonb := '[]'::jsonb;
BEGIN
  SELECT passing_score INTO v_passing_score
  FROM public.quizzes WHERE id = p_quiz_id;

  IF v_passing_score IS NULL THEN
    RAISE EXCEPTION 'Quiz not found';
  END IF;

  FOR v_question IN
    SELECT id, correct_answer, points, question_type
    FROM public.quiz_questions
    WHERE quiz_id = p_quiz_id
    ORDER BY order_index
  LOOP
    v_max_score := v_max_score + v_question.points;
    v_user_answer := p_answers -> (v_question.id::text);
    v_correct := false;

    IF v_user_answer IS NOT NULL THEN
      IF jsonb_typeof(v_question.correct_answer) = 'array' THEN
        IF jsonb_typeof(v_user_answer) = 'array' THEN
          IF (
            SELECT jsonb_agg(val ORDER BY val)
            FROM jsonb_array_elements_text(v_user_answer) AS val
          ) = (
            SELECT jsonb_agg(val ORDER BY val)
            FROM jsonb_array_elements_text(v_question.correct_answer) AS val
          ) THEN
            v_correct := true;
          END IF;
        END IF;
      ELSIF v_question.question_type = 'short_answer' THEN
        IF lower(trim(v_user_answer #>> '{}')) = lower(trim(v_question.correct_answer #>> '{}')) THEN
          v_correct := true;
        END IF;
      ELSE
        IF (v_user_answer #>> '{}') = (v_question.correct_answer #>> '{}') THEN
          v_correct := true;
        END IF;
      END IF;
    END IF;

    IF v_correct THEN
      v_score := v_score + v_question.points;
    END IF;

    v_results := v_results || jsonb_build_object(
      'question_id', v_question.id,
      'correct', v_correct,
      'correct_answer', v_question.correct_answer
    );
  END LOOP;

  v_passed := (v_max_score > 0 AND ((v_score::numeric / v_max_score::numeric) * 100) >= v_passing_score);

  RETURN jsonb_build_object(
    'score', v_score,
    'max_score', v_max_score,
    'passed', v_passed,
    'percent', CASE WHEN v_max_score > 0 THEN round((v_score::numeric / v_max_score::numeric) * 100) ELSE 0 END,
    'results', v_results
  );
END;
$$;
