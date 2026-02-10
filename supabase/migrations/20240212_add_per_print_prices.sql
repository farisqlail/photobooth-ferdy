ALTER TABLE pricing_settings
ADD COLUMN IF NOT EXISTS per_print_price_2d numeric DEFAULT 5000,
ADD COLUMN IF NOT EXISTS per_print_price_4r numeric DEFAULT 5000;
