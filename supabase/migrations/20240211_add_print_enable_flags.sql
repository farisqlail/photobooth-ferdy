ALTER TABLE pricing_settings
ADD COLUMN IF NOT EXISTS is_2d_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS is_4r_enabled boolean DEFAULT true;
