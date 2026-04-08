export type AppRole = 'staff' | 'director' | 'super_admin';
export type UserStatus = 'pending' | 'approved' | 'rejected' | 'disabled' | 'inactive';
export type HomeworkReviewStatus = 'pending' | 'approved' | 'needs_revision' | 'rejected';

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  phone: string | null;
  position: string | null;
  status: UserStatus;
  center_id: string | null;
  application_message: string | null;
  checklist_email_notifications: boolean;
  hire_date: string | null;
  created_at: string;
  updated_at: string;
  center?: Center;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Center {
  id: string;
  name: string;
  address: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrainingTrack {
  id: string;
  title: string;
  description: string | null;
  is_active: boolean;
  auto_assign: boolean;
  is_priority: boolean;
  order_index: number;
  certificate_enabled: boolean;
  instructor_name: string | null;
  created_at: string;
  updated_at: string;
  modules?: Module[];
}

export interface Module {
  id: string;
  track_id: string;
  title: string;
  description: string | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  videos?: Video[];
  quizzes?: Quiz[];
  homework_assignments?: HomeworkAssignment[];
  module_presentations?: ModulePresentation[];
  module_documents?: ModuleDocument[];
  module_external_trainings?: ModuleExternalTraining[];
  module_lessons?: ModuleLesson[];
}

export interface Video {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  video_url: string;
  duration_seconds: number | null;
  is_required: boolean;
  order_index: number;
  allow_mark_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface Quiz {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  passing_score: number;
  max_attempts: number | null;
  is_required: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
  questions?: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: string;
  options: string[] | null;
  correct_answer: string | string[];
  points: number;
  order_index: number;
  created_at: string;
}

export interface HomeworkAssignment {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  due_days: number | null;
  is_required: boolean;
  file_required: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface StaffTrackAssignment {
  id: string;
  user_id: string;
  track_id: string;
  assigned_at: string;
  assigned_by: string | null;
  track?: TrainingTrack;
}

export interface VideoProgress {
  id: string;
  user_id: string;
  video_id: string;
  percent_complete: number;
  last_position_seconds: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuizAttempt {
  id: string;
  user_id: string;
  quiz_id: string;
  answers: Record<string, string | string[]> | null;
  score: number;
  max_score: number;
  passed: boolean;
  started_at: string;
  completed_at: string | null;
  quiz?: Quiz;
}

export interface HomeworkSubmission {
  id: string;
  user_id: string;
  homework_id: string;
  file_url: string;
  file_name: string;
  notes: string | null;
  submitted_at: string;
  reviewed_status: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  homework_assignment?: HomeworkAssignment;
}

export interface DocumentType {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface StaffDocument {
  id: string;
  user_id: string;
  document_type_id: string | null;
  title: string;
  file_url: string;
  file_name: string;
  tags: string[] | null;
  expires_at: string | null;
  uploaded_at: string;
  updated_at: string;
  document_type?: DocumentType;
}

export interface SelfReflection {
  id: string;
  user_id: string;
  module_id: string | null;
  title: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  module?: Module;
}

export interface ModulePresentation {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  is_required: boolean;
  order_index: number;
  allow_mark_complete: boolean;
  allow_download: boolean;
  created_at: string;
  updated_at: string;
}

export interface ModuleDocument {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  is_required: boolean;
  order_index: number;
  allow_mark_complete: boolean;
  allow_download: boolean;
  created_at: string;
  updated_at: string;
}

export interface PresentationProgress {
  id: string;
  user_id: string;
  presentation_id: string;
  viewed_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentProgress {
  id: string;
  user_id: string;
  document_id: string;
  viewed_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ModuleExternalTraining {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  external_url: string;
  requires_certificate: boolean;
  is_required: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface ExternalTrainingSubmission {
  id: string;
  external_training_id: string;
  user_id: string;
  file_url: string | null;
  file_name: string | null;
  notes: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  submitted_at: string;
  created_at: string;
}

export interface ModuleLesson {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  is_required: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
  lesson_pages?: LessonPage[];
}

export interface LessonPage {
  id: string;
  lesson_id: string;
  page_number: number;
  content: string;
  image_url: string | null;
  image_caption: string | null;
  created_at: string;
  updated_at: string;
}

export interface LessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  last_page_viewed: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}
