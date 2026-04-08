-- Add allow_mark_complete and allow_download columns to module_presentations
ALTER TABLE public.module_presentations
ADD COLUMN allow_mark_complete boolean NOT NULL DEFAULT true,
ADD COLUMN allow_download boolean NOT NULL DEFAULT true;

-- Add allow_mark_complete and allow_download columns to module_documents
ALTER TABLE public.module_documents
ADD COLUMN allow_mark_complete boolean NOT NULL DEFAULT true,
ADD COLUMN allow_download boolean NOT NULL DEFAULT true;