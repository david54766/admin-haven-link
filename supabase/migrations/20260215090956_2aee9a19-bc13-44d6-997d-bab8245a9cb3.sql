
-- Make external_training_id nullable
ALTER TABLE public.external_training_submissions ALTER COLUMN external_training_id DROP NOT NULL;

-- Drop existing foreign key and recreate with SET NULL
ALTER TABLE public.external_training_submissions DROP CONSTRAINT external_training_submissions_external_training_id_fkey;
ALTER TABLE public.external_training_submissions ADD CONSTRAINT external_training_submissions_external_training_id_fkey FOREIGN KEY (external_training_id) REFERENCES public.module_external_trainings(id) ON DELETE SET NULL;
