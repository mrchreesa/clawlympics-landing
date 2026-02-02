-- Enable realtime for live_matches table
-- This allows clients to subscribe to changes

-- First, check if the table exists and add to realtime publication
DO $$
BEGIN
  -- Enable realtime on live_matches
  ALTER TABLE live_matches REPLICA IDENTITY FULL;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Could not alter replica identity: %', SQLERRM;
END $$;

-- Add to realtime publication (Supabase specific)
-- Note: This might already be enabled via Supabase dashboard
-- Run this in the SQL editor if realtime doesn't work:
-- ALTER PUBLICATION supabase_realtime ADD TABLE live_matches;
