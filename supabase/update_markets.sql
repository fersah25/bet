-- Add 'category' column if it doesn't exist
ALTER TABLE public.markets ADD COLUMN IF NOT EXISTS category text DEFAULT 'fed';

-- Set existing records to 'fed'
UPDATE public.markets SET category = 'fed' WHERE category IS NULL;

-- Insert Bitcoin candidates
INSERT INTO public.markets (candidate_name, initials, color, pool_amount, category)
VALUES 
  ('Yes', 'Y', '#00d395', 0, 'bitcoin'),
  ('No', 'N', '#ff4d4d', 0, 'bitcoin')
ON CONFLICT (id) DO NOTHING; -- Assuming id is UUID and auto-generated, this just inserts. If candidate_name is unique, we could use that, but usually it's just an insert.
