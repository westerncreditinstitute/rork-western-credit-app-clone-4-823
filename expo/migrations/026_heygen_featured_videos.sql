-- 026_heygen_featured_videos.sql
-- Adds HeyGen embed support to the home page "Videos" section.
--
-- The featured_videos table originally only stored YouTube ids. The home page
-- now renders a HeyGen AI-avatar embed, so each record carries a video_type
-- plus a heygen_embed_id and the admin Promo Manager can swap the video
-- without a code change.

-- Table may not exist yet on fresh projects.
CREATE TABLE IF NOT EXISTS featured_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  youtube_id TEXT DEFAULT '',
  title TEXT NOT NULL,
  duration TEXT DEFAULT '',
  description TEXT DEFAULT '',
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- New columns (safe to re-run).
ALTER TABLE featured_videos ADD COLUMN IF NOT EXISTS heygen_embed_id TEXT DEFAULT '';
ALTER TABLE featured_videos ADD COLUMN IF NOT EXISTS video_type TEXT DEFAULT 'youtube';

-- HeyGen records have no YouTube id, so the old NOT NULL has to go.
ALTER TABLE featured_videos ALTER COLUMN youtube_id DROP NOT NULL;
ALTER TABLE featured_videos ALTER COLUMN youtube_id SET DEFAULT '';

UPDATE featured_videos SET youtube_id = '' WHERE youtube_id IS NULL;
UPDATE featured_videos SET heygen_embed_id = '' WHERE heygen_embed_id IS NULL;
UPDATE featured_videos SET video_type = 'youtube' WHERE video_type IS NULL OR video_type = '';

ALTER TABLE featured_videos ALTER COLUMN video_type SET NOT NULL;

ALTER TABLE featured_videos DROP CONSTRAINT IF EXISTS featured_videos_video_type_check;
ALTER TABLE featured_videos ADD CONSTRAINT featured_videos_video_type_check
  CHECK (video_type IN ('youtube', 'heygen'));

CREATE INDEX IF NOT EXISTS idx_featured_videos_order ON featured_videos(order_index);
CREATE INDEX IF NOT EXISTS idx_featured_videos_active_type
  ON featured_videos(video_type, is_active, order_index);

-- Row level security: mirror the policies used by the base schema so a table
-- created by this migration behaves the same as one created by supabase-schema.sql.
ALTER TABLE featured_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on featured_videos" ON featured_videos;
DROP POLICY IF EXISTS "Allow public insert on featured_videos" ON featured_videos;
DROP POLICY IF EXISTS "Allow public update on featured_videos" ON featured_videos;
DROP POLICY IF EXISTS "Allow public delete on featured_videos" ON featured_videos;

CREATE POLICY "Allow public read access on featured_videos" ON featured_videos FOR SELECT USING (true);
CREATE POLICY "Allow public insert on featured_videos" ON featured_videos FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on featured_videos" ON featured_videos FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on featured_videos" ON featured_videos FOR DELETE USING (true);

-- Seed the video that is currently hardcoded on the home page so the admin has
-- something to edit right after running this migration.
INSERT INTO featured_videos (youtube_id, heygen_embed_id, video_type, title, duration, description, order_index, is_active)
SELECT '', '92770d6dd5164282bbeabb6a890f3f41', 'heygen', 'Welcome to Western Credit Institute', '', 'Featured AI video shown in the Videos section on the home page.', 0, true
WHERE NOT EXISTS (SELECT 1 FROM featured_videos WHERE video_type = 'heygen');
