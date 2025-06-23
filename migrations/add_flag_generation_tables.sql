-- Flag generation tables for AI flag generator

-- Table to track all flag generations
CREATE TABLE IF NOT EXISTS flag_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  params JSONB NOT NULL,
  svg TEXT NOT NULL,
  tier VARCHAR(50) NOT NULL,
  metadata JSONB
);

-- Table to store user's saved flags
CREATE TABLE IF NOT EXISTS saved_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  flag_id UUID REFERENCES flag_generations(id) ON DELETE CASCADE,
  saved_at TIMESTAMP NOT NULL DEFAULT NOW(),
  slot_number INTEGER NOT NULL,
  name VARCHAR(255) DEFAULT 'Untitled Flag',
  is_active BOOLEAN DEFAULT false
);

-- Indexes for performance
CREATE INDEX idx_flag_generations_user_id ON flag_generations(user_id);
CREATE INDEX idx_flag_generations_generated_at ON flag_generations(generated_at);
CREATE INDEX idx_saved_flags_user_id ON saved_flags(user_id);
CREATE INDEX idx_saved_flags_slot_number ON saved_flags(user_id, slot_number);

-- Function to enforce slot limits per tier
CREATE OR REPLACE FUNCTION check_save_slot_limit()
RETURNS TRIGGER AS $$
DECLARE
  slot_count INTEGER;
  user_tier VARCHAR(50);
  max_slots INTEGER;
BEGIN
  -- Get user's current saved flag count
  SELECT COUNT(*) INTO slot_count
  FROM saved_flags
  WHERE user_id = NEW.user_id;
  
  -- Get user tier (would need to join with users table in production)
  -- For now, default to 'free' tier
  user_tier := 'free';
  
  -- Set max slots based on tier
  CASE user_tier
    WHEN 'free' THEN max_slots := 3;
    WHEN 'supporter' THEN max_slots := 10;
    WHEN 'premium' THEN max_slots := 25;
    WHEN 'elite' THEN max_slots := 50;
    WHEN 'sovereign' THEN max_slots := 100;
    ELSE max_slots := 3;
  END CASE;
  
  -- Check if limit exceeded
  IF slot_count >= max_slots THEN
    RAISE EXCEPTION 'Save slot limit (%) exceeded for tier %', max_slots, user_tier;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce slot limits
CREATE TRIGGER enforce_save_slot_limit
BEFORE INSERT ON saved_flags
FOR EACH ROW
EXECUTE FUNCTION check_save_slot_limit();

-- View for user flag statistics
CREATE VIEW user_flag_stats AS
SELECT 
  user_id,
  COUNT(DISTINCT fg.id) as total_generated,
  COUNT(DISTINCT sf.id) as total_saved,
  DATE(fg.generated_at) as generation_date,
  fg.tier
FROM flag_generations fg
LEFT JOIN saved_flags sf ON fg.id = sf.flag_id
GROUP BY user_id, DATE(fg.generated_at), fg.tier;