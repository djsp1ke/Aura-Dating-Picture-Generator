-- Migration: Add jukebox mode and song voting
-- Run this if you already have the Spotify migration deployed

-- Add mode column to events
ALTER TABLE events ADD COLUMN IF NOT EXISTS mode text DEFAULT 'dj' NOT NULL;

-- Song votes table
CREATE TABLE IF NOT EXISTS song_votes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  song_request_id uuid REFERENCES song_requests(id) ON DELETE CASCADE NOT NULL,
  participant_id uuid REFERENCES participants(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(song_request_id, participant_id)
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE song_votes;

-- RLS
ALTER TABLE song_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON song_votes FOR ALL USING (true) WITH CHECK (true);
