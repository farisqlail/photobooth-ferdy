-- Add type column to templates table
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS type text DEFAULT '4r';
