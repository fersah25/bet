-- Insert Base Tweet Markets
INSERT INTO markets (name, candidate_name, current_odds, pool_amount, initials, color, category, image_url)
VALUES 
    ('Base Tweet', 'Yes', 0.50, 0, 'Y', '#0052ff', 'base_tweet', 'https://cryptologos.cc/logos/base-base-logo.png'),
    ('Base Tweet', 'No', 0.50, 0, 'N', '#ff4d4d', 'base_tweet', 'https://cryptologos.cc/logos/base-base-logo.png');

-- Create RPC to reset the base_tweet market pool
CREATE OR REPLACE FUNCTION reset_base_tweet_market()
RETURNS void AS $$
BEGIN
  UPDATE markets
  SET pool_amount = 0
  WHERE category = 'base_tweet';
END;
$$ LANGUAGE plpgsql;
