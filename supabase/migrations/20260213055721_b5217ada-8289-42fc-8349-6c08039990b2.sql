
-- Fix 1: Remove user self-insert on track_certificates (prevents fake certificate creation)
DROP POLICY IF EXISTS "Users can insert own track certificates" ON track_certificates;

-- Fix 2: Prevent users from updating their own profile status
CREATE OR REPLACE FUNCTION public.prevent_status_self_update()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Users cannot change their own status';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_status_update
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_status_self_update();

-- Fix 3: Prevent non-super_admins from assigning super_admin role
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.role = 'super_admin' AND NOT has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Only super_admins can assign super_admin role';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_role_escalation
  BEFORE INSERT OR UPDATE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();

-- Fix 4: Create a secure function to fetch quiz questions without correct_answer for non-admins
CREATE OR REPLACE FUNCTION public.get_quiz_questions_safe(p_quiz_id uuid)
RETURNS TABLE (
  id uuid,
  quiz_id uuid,
  question_text text,
  question_type text,
  options jsonb,
  correct_answer jsonb,
  points integer,
  order_index integer,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF is_admin(auth.uid()) THEN
    RETURN QUERY
      SELECT qq.id, qq.quiz_id, qq.question_text, qq.question_type, qq.options, qq.correct_answer, qq.points, qq.order_index, qq.created_at
      FROM public.quiz_questions qq
      WHERE qq.quiz_id = p_quiz_id
      ORDER BY qq.order_index;
  ELSE
    RETURN QUERY
      SELECT qq.id, qq.quiz_id, qq.question_text, qq.question_type, qq.options, NULL::jsonb as correct_answer, qq.points, qq.order_index, qq.created_at
      FROM public.quiz_questions qq
      WHERE qq.quiz_id = p_quiz_id
      ORDER BY qq.order_index;
  END IF;
END;
$$;
