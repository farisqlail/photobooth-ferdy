ALTER TABLE public.templates
ADD COLUMN photo_x integer DEFAULT 0,
ADD COLUMN photo_y integer DEFAULT 0,
ADD COLUMN photo_width integer DEFAULT 0,
ADD COLUMN photo_height integer DEFAULT 0;
