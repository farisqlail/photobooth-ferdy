-- Add slots_config column to templates table
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS slots_config jsonb DEFAULT '[]'::jsonb;
