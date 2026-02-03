ALTER TABLE public.pricing_settings
ADD COLUMN IF NOT EXISTS home_image_url TEXT;
