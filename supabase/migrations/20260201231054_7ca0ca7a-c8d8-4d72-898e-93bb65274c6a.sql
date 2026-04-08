-- Create role enum
CREATE TYPE public.app_role AS ENUM ('staff', 'admin', 'super_admin');

-- Create user status enum
CREATE TYPE public.user_status AS ENUM ('pending', 'approved', 'rejected');

-- Create centers table
CREATE TABLE public.centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create profiles table (for user application data)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    status public.user_status NOT NULL DEFAULT 'pending',
    center_id UUID REFERENCES public.centers(id) ON DELETE SET NULL,
    application_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create training tracks table
CREATE TABLE public.training_tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create modules table
CREATE TABLE public.modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    track_id UUID REFERENCES public.training_tracks(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create videos table
CREATE TABLE public.videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    video_url TEXT NOT NULL,
    duration_seconds INTEGER,
    is_required BOOLEAN NOT NULL DEFAULT true,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create quizzes table
CREATE TABLE public.quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    passing_score INTEGER NOT NULL DEFAULT 70,
    max_attempts INTEGER,
    is_required BOOLEAN NOT NULL DEFAULT true,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create quiz questions table
CREATE TABLE public.quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL DEFAULT 'multiple_choice',
    options JSONB,
    correct_answer JSONB NOT NULL,
    points INTEGER NOT NULL DEFAULT 1,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create homework assignments table
CREATE TABLE public.homework_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    instructions TEXT,
    due_days INTEGER,
    is_required BOOLEAN NOT NULL DEFAULT true,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create staff track assignments table
CREATE TABLE public.staff_track_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    track_id UUID REFERENCES public.training_tracks(id) ON DELETE CASCADE NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE (user_id, track_id)
);

-- Create video progress table
CREATE TABLE public.video_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
    percent_complete INTEGER NOT NULL DEFAULT 0,
    last_position_seconds INTEGER NOT NULL DEFAULT 0,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, video_id)
);

-- Create quiz attempts table
CREATE TABLE public.quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
    answers JSONB,
    score INTEGER NOT NULL DEFAULT 0,
    max_score INTEGER NOT NULL,
    passed BOOLEAN NOT NULL DEFAULT false,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

-- Create homework submissions table
CREATE TABLE public.homework_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    homework_id UUID REFERENCES public.homework_assignments(id) ON DELETE CASCADE NOT NULL,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    notes TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_status TEXT NOT NULL DEFAULT 'pending',
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    review_notes TEXT
);

-- Create document types table
CREATE TABLE public.document_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create staff documents table
CREATE TABLE public.staff_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    document_type_id UUID REFERENCES public.document_types(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    tags TEXT[],
    expires_at TIMESTAMPTZ,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create self reflections table
CREATE TABLE public.self_reflections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    module_id UUID REFERENCES public.modules(id) ON DELETE SET NULL,
    title TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_track_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.self_reflections ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user has any admin role
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'super_admin')
  )
$$;

-- Create function to check if user is approved
CREATE OR REPLACE FUNCTION public.is_approved(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND status = 'approved'
  )
$$;

-- Create function to get user's own profile
CREATE OR REPLACE FUNCTION public.get_own_profile()
RETURNS SETOF public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.profiles WHERE user_id = auth.uid()
$$;

-- RLS Policies for centers
CREATE POLICY "Approved users can view centers" ON public.centers
    FOR SELECT TO authenticated
    USING (public.is_approved(auth.uid()));

CREATE POLICY "Admins can manage centers" ON public.centers
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT TO authenticated
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update any profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles" ON public.user_roles
    FOR SELECT TO authenticated
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage roles" ON public.user_roles
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- RLS Policies for training_tracks
CREATE POLICY "Approved users can view active tracks" ON public.training_tracks
    FOR SELECT TO authenticated
    USING (public.is_approved(auth.uid()) AND is_active = true);

CREATE POLICY "Admins can view all tracks" ON public.training_tracks
    FOR SELECT TO authenticated
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage tracks" ON public.training_tracks
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- RLS Policies for modules
CREATE POLICY "Approved users can view active modules" ON public.modules
    FOR SELECT TO authenticated
    USING (public.is_approved(auth.uid()) AND is_active = true);

CREATE POLICY "Admins can view all modules" ON public.modules
    FOR SELECT TO authenticated
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage modules" ON public.modules
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- RLS Policies for videos
CREATE POLICY "Approved users can view videos" ON public.videos
    FOR SELECT TO authenticated
    USING (public.is_approved(auth.uid()));

CREATE POLICY "Admins can manage videos" ON public.videos
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- RLS Policies for quizzes
CREATE POLICY "Approved users can view quizzes" ON public.quizzes
    FOR SELECT TO authenticated
    USING (public.is_approved(auth.uid()));

CREATE POLICY "Admins can manage quizzes" ON public.quizzes
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- RLS Policies for quiz_questions
CREATE POLICY "Approved users can view questions" ON public.quiz_questions
    FOR SELECT TO authenticated
    USING (public.is_approved(auth.uid()));

CREATE POLICY "Admins can manage questions" ON public.quiz_questions
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- RLS Policies for homework_assignments
CREATE POLICY "Approved users can view homework" ON public.homework_assignments
    FOR SELECT TO authenticated
    USING (public.is_approved(auth.uid()));

CREATE POLICY "Admins can manage homework" ON public.homework_assignments
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- RLS Policies for staff_track_assignments
CREATE POLICY "Users can view own assignments" ON public.staff_track_assignments
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Admins can view all assignments" ON public.staff_track_assignments
    FOR SELECT TO authenticated
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage assignments" ON public.staff_track_assignments
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- RLS Policies for video_progress
CREATE POLICY "Users can manage own video progress" ON public.video_progress
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all video progress" ON public.video_progress
    FOR SELECT TO authenticated
    USING (public.is_admin(auth.uid()));

-- RLS Policies for quiz_attempts
CREATE POLICY "Users can manage own quiz attempts" ON public.quiz_attempts
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all quiz attempts" ON public.quiz_attempts
    FOR SELECT TO authenticated
    USING (public.is_admin(auth.uid()));

-- RLS Policies for homework_submissions
CREATE POLICY "Users can manage own submissions" ON public.homework_submissions
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all submissions" ON public.homework_submissions
    FOR SELECT TO authenticated
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update submissions" ON public.homework_submissions
    FOR UPDATE TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- RLS Policies for document_types
CREATE POLICY "Approved users can view doc types" ON public.document_types
    FOR SELECT TO authenticated
    USING (public.is_approved(auth.uid()));

CREATE POLICY "Admins can manage doc types" ON public.document_types
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- RLS Policies for staff_documents
CREATE POLICY "Users can manage own documents" ON public.staff_documents
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all documents" ON public.staff_documents
    FOR SELECT TO authenticated
    USING (public.is_admin(auth.uid()));

-- RLS Policies for self_reflections
CREATE POLICY "Users can manage own reflections" ON public.self_reflections
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all reflections" ON public.self_reflections
    FOR SELECT TO authenticated
    USING (public.is_admin(auth.uid()));

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Storage policies for documents bucket
CREATE POLICY "Users can upload own documents" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own documents" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins can view all documents" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'documents' AND public.is_admin(auth.uid()));

CREATE POLICY "Users can delete own documents" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Create homework submissions bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('homework', 'homework', false);

-- Storage policies for homework bucket
CREATE POLICY "Users can upload homework" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'homework' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own homework" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'homework' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins can view all homework" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'homework' AND public.is_admin(auth.uid()));

-- Create trigger function for updating updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at columns
CREATE TRIGGER update_centers_updated_at BEFORE UPDATE ON public.centers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_training_tracks_updated_at BEFORE UPDATE ON public.training_tracks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_modules_updated_at BEFORE UPDATE ON public.modules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON public.videos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON public.quizzes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_homework_assignments_updated_at BEFORE UPDATE ON public.homework_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_video_progress_updated_at BEFORE UPDATE ON public.video_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_staff_documents_updated_at BEFORE UPDATE ON public.staff_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_self_reflections_updated_at BEFORE UPDATE ON public.self_reflections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default document types
INSERT INTO public.document_types (name, description) VALUES
    ('Credential', 'Professional credentials and certifications'),
    ('License', 'Professional licenses'),
    ('Background Check', 'Background check documentation'),
    ('Training Certificate', 'Training completion certificates'),
    ('ID Document', 'Identification documents'),
    ('Other', 'Other documents');