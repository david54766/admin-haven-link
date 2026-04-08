
-- Lessons table (one per module, like videos/quizzes)
CREATE TABLE public.module_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.module_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage lessons" ON public.module_lessons FOR ALL
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Approved users can view lessons" ON public.module_lessons FOR SELECT
  USING (is_approved(auth.uid()));

CREATE TRIGGER update_module_lessons_updated_at
  BEFORE UPDATE ON public.module_lessons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Lesson pages table
CREATE TABLE public.lesson_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.module_lessons(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL DEFAULT 1,
  content TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  image_caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lesson_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage lesson pages" ON public.lesson_pages FOR ALL
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Approved users can view lesson pages" ON public.lesson_pages FOR SELECT
  USING (is_approved(auth.uid()));

CREATE TRIGGER update_lesson_pages_updated_at
  BEFORE UPDATE ON public.lesson_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Lesson progress table
CREATE TABLE public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  lesson_id UUID NOT NULL REFERENCES public.module_lessons(id) ON DELETE CASCADE,
  last_page_viewed INTEGER NOT NULL DEFAULT 1,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own lesson progress" ON public.lesson_progress FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can view all lesson progress" ON public.lesson_progress FOR SELECT
  USING (is_admin(auth.uid()));

CREATE TRIGGER update_lesson_progress_updated_at
  BEFORE UPDATE ON public.lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for lesson images
INSERT INTO storage.buckets (id, name, public) VALUES ('lesson-images', 'lesson-images', true);

CREATE POLICY "Admins can upload lesson images" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'lesson-images' AND is_admin(auth.uid()));
CREATE POLICY "Admins can update lesson images" ON storage.objects FOR UPDATE
  USING (bucket_id = 'lesson-images' AND is_admin(auth.uid()));
CREATE POLICY "Admins can delete lesson images" ON storage.objects FOR DELETE
  USING (bucket_id = 'lesson-images' AND is_admin(auth.uid()));
CREATE POLICY "Anyone can view lesson images" ON storage.objects FOR SELECT
  USING (bucket_id = 'lesson-images');
