-- Virtual Home Visitation System - Supabase Database Schema
-- This schema implements a complete home visitation system for React Native app

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. Player Homes Table
-- ============================================
CREATE TABLE IF NOT EXISTS player_homes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  home_tier INTEGER NOT NULL DEFAULT 1 CHECK (home_tier BETWEEN 1 AND 4),
  home_name TEXT NOT NULL DEFAULT 'My Home',
  home_description TEXT,
  home_layout JSONB NOT NULL DEFAULT '{}',
  is_public BOOLEAN NOT NULL DEFAULT false,
  max_visitors INTEGER NOT NULL DEFAULT 10,
  current_visitors INTEGER NOT NULL DEFAULT 0,
  total_visits INTEGER NOT NULL DEFAULT 0,
  total_rating DECIMAL(3, 2) DEFAULT 0.00,
  rating_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 2. Room Layouts Table
-- ============================================
CREATE TABLE IF NOT EXISTS room_layouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_id UUID NOT NULL REFERENCES player_homes(id) ON DELETE CASCADE,
  room_name TEXT NOT NULL,
  room_type TEXT NOT NULL, -- living_room, bedroom, kitchen, bathroom, garage, etc.
  position_x DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  position_y DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  position_z DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  dimensions_x DECIMAL(10, 2) NOT NULL DEFAULT 10.00,
  dimensions_y DECIMAL(10, 2) NOT NULL DEFAULT 3.00,
  dimensions_z DECIMAL(10, 2) NOT NULL DEFAULT 10.00,
  wall_color TEXT DEFAULT '#FFFFFF',
  floor_color TEXT DEFAULT '#E5E7EB',
  max_items INTEGER NOT NULL DEFAULT 20,
  layout_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(home_id, room_name)
);

-- ============================================
-- 3. Placed Items Table
-- ============================================
CREATE TABLE IF NOT EXISTS placed_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_id UUID NOT NULL REFERENCES player_homes(id) ON DELETE CASCADE,
  room_layout_id UUID NOT NULL REFERENCES room_layouts(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL, -- Marketplace item ID
  item_name TEXT NOT NULL,
  item_category TEXT NOT NULL, -- furniture, decoration, electronics, etc.
  item_image_url TEXT,
  position_x DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  position_y DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  position_z DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  rotation_x DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  rotation_y DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  rotation_z DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  scale DECIMAL(10, 2) NOT NULL DEFAULT 1.00,
  placed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 4. Home Visitors Table
-- ============================================
CREATE TABLE IF NOT EXISTS home_visitors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_id UUID NOT NULL REFERENCES player_homes(id) ON DELETE CASCADE,
  visitor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visit_start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  visit_end_time TIMESTAMPTZ,
  duration_seconds INTEGER,
  is_online BOOLEAN NOT NULL DEFAULT true,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 5. Home Tier Configuration Table
-- ============================================
CREATE TABLE IF NOT EXISTS home_tier_config (
  id INTEGER PRIMARY KEY,
  tier_name TEXT NOT NULL UNIQUE,
  max_rooms INTEGER NOT NULL,
  total_max_items INTEGER NOT NULL,
  max_visitors INTEGER NOT NULL,
  default_room_types TEXT[] NOT NULL,
  tier_description TEXT,
  unlock_price DECIMAL(15, 2) DEFAULT 0.00
);

-- Insert tier configurations
INSERT INTO home_tier_config (id, tier_name, max_rooms, total_max_items, max_visitors, default_room_types, tier_description, unlock_price) VALUES
(1, 'Studio', 1, 20, 5, ARRAY['living_room'], 'A cozy studio apartment perfect for starting out', 0.00),
(2, 'Apartment', 3, 50, 10, ARRAY['living_room', 'bedroom', 'kitchen'], 'A modern apartment with separate living spaces', 50000.00),
(3, 'House', 5, 100, 15, ARRAY['living_room', 'bedroom', 'kitchen', 'bathroom', 'garage'], 'A spacious house with multiple rooms', 200000.00),
(4, 'Mansion', 10, 200, 25, ARRAY['living_room', 'bedroom', 'kitchen', 'bathroom', 'garage', 'dining_room', 'library', 'office', 'pool', 'garden'], 'A luxurious mansion with ample space', 1000000.00)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 6. Home Analytics Table
-- ============================================
CREATE TABLE IF NOT EXISTS home_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_id UUID NOT NULL REFERENCES player_homes(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- visit, item_placed, item_removed, tier_upgrade, etc.
  event_data JSONB DEFAULT '{}',
  visitor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_player_homes_player_id ON player_homes(player_id);
CREATE INDEX idx_player_homes_home_tier ON player_homes(home_tier);
CREATE INDEX idx_player_homes_is_public ON player_homes(is_public);
CREATE INDEX idx_player_homes_created_at ON player_homes(created_at DESC);

CREATE INDEX idx_room_layouts_home_id ON room_layouts(home_id);
CREATE INDEX idx_room_layouts_room_type ON room_layouts(room_type);

CREATE INDEX idx_placed_items_home_id ON placed_items(home_id);
CREATE INDEX idx_placed_items_room_layout_id ON placed_items(room_layout_id);
CREATE INDEX idx_placed_items_item_category ON placed_items(item_category);

CREATE INDEX idx_home_visitors_home_id ON home_visitors(home_id);
CREATE INDEX idx_home_visitors_visitor_id ON home_visitors(visitor_id);
CREATE INDEX idx_home_visitors_visit_start_time ON home_visitors(visit_start_time DESC);
CREATE INDEX idx_home_visitors_is_online ON home_visitors(is_online);

CREATE INDEX idx_home_analytics_home_id ON home_analytics(home_id);
CREATE INDEX idx_home_analytics_event_type ON home_analytics(event_type);
CREATE INDEX idx_home_analytics_created_at ON home_analytics(created_at DESC);

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE player_homes ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE placed_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_tier_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for player_homes
CREATE POLICY "Users can view their own homes"
  ON player_homes FOR SELECT
  USING (auth.uid() = player_id);

CREATE POLICY "Users can view public homes"
  ON player_homes FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can insert their own homes"
  ON player_homes FOR INSERT
  WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Users can update their own homes"
  ON player_homes FOR UPDATE
  USING (auth.uid() = player_id);

CREATE POLICY "Users can delete their own homes"
  ON player_homes FOR DELETE
  USING (auth.uid() = player_id);

-- RLS Policies for room_layouts
CREATE POLICY "Users can view their own room layouts"
  ON room_layouts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM player_homes
      WHERE player_homes.id = room_layouts.home_id
      AND player_homes.player_id = auth.uid()
    )
  );

CREATE POLICY "Users can view room layouts of public homes"
  ON room_layouts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM player_homes
      WHERE player_homes.id = room_layouts.home_id
      AND player_homes.is_public = true
    )
  );

CREATE POLICY "Users can insert their own room layouts"
  ON room_layouts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM player_homes
      WHERE player_homes.id = room_layouts.home_id
      AND player_homes.player_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own room layouts"
  ON room_layouts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM player_homes
      WHERE player_homes.id = room_layouts.home_id
      AND player_homes.player_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own room layouts"
  ON room_layouts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM player_homes
      WHERE player_homes.id = room_layouts.home_id
      AND player_homes.player_id = auth.uid()
    )
  );

-- RLS Policies for placed_items
CREATE POLICY "Users can view their own placed items"
  ON placed_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM player_homes
      WHERE player_homes.id = placed_items.home_id
      AND player_homes.player_id = auth.uid()
    )
  );

CREATE POLICY "Users can view placed items of public homes"
  ON placed_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM player_homes
      WHERE player_homes.id = placed_items.home_id
      AND player_homes.is_public = true
    )
  );

CREATE POLICY "Users can insert their own placed items"
  ON placed_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM player_homes
      WHERE player_homes.id = placed_items.home_id
      AND player_homes.player_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own placed items"
  ON placed_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM player_homes
      WHERE player_homes.id = placed_items.home_id
      AND player_homes.player_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own placed items"
  ON placed_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM player_homes
      WHERE player_homes.id = placed_items.home_id
      AND player_homes.player_id = auth.uid()
    )
  );

-- RLS Policies for home_visitors
CREATE POLICY "Users can view their own visits"
  ON home_visitors FOR SELECT
  USING (auth.uid() = visitor_id);

CREATE POLICY "Users can view visits to their homes"
  ON home_visitors FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM player_homes
      WHERE player_homes.id = home_visitors.home_id
      AND player_homes.player_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert visit records"
  ON home_visitors FOR INSERT
  WITH CHECK (auth.uid() = visitor_id);

CREATE POLICY "Users can update their own visits"
  ON home_visitors FOR UPDATE
  USING (auth.uid() = visitor_id);

-- RLS Policies for home_analytics
CREATE POLICY "Users can view analytics for their homes"
  ON home_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM player_homes
      WHERE player_homes.id = home_analytics.home_id
      AND player_homes.player_id = auth.uid()
    )
  );

CREATE POLICY "System can insert analytics"
  ON home_analytics FOR INSERT
  WITH CHECK (true);

-- RLS Policies for home_tier_config (read-only for all)
CREATE POLICY "Everyone can view tier configurations"
  ON home_tier_config FOR SELECT
  USING (true);

-- ============================================
-- Views for Common Queries
-- ============================================

-- View for home with player info
CREATE OR REPLACE VIEW public_home_list AS
SELECT 
  h.id,
  h.player_id,
  h.home_tier,
  h.home_name,
  h.home_description,
  h.is_public,
  h.max_visitors,
  h.current_visitors,
  h.total_visits,
  h.total_rating,
  h.rating_count,
  h.created_at,
  p.email,
  p.raw_user_meta_data->>'username' as username,
  tc.tier_name,
  COUNT(DISTINCT r.id) as room_count,
  COUNT(DISTINCT i.id) as item_count
FROM player_homes h
LEFT JOIN auth.users p ON h.player_id = p.id
LEFT JOIN home_tier_config tc ON h.home_tier = tc.id
LEFT JOIN room_layouts r ON h.id = r.home_id
LEFT JOIN placed_items i ON h.id = i.home_id
WHERE h.is_public = true
GROUP BY h.id, h.player_id, h.home_tier, h.home_name, h.home_description, h.is_public, h.max_visitors, h.current_visitors, h.total_visits, h.total_rating, h.rating_count, h.created_at, p.email, p.raw_user_meta_data, tc.tier_name;

-- View for home details with all items
CREATE OR REPLACE VIEW home_details_with_items AS
SELECT 
  h.*,
  tc.tier_name,
  tc.max_rooms,
  tc.total_max_items,
  (SELECT COUNT(*) FROM room_layouts WHERE home_id = h.id) as actual_rooms,
  (SELECT COUNT(*) FROM placed_items WHERE home_id = h.id) as actual_items
FROM player_homes h
LEFT JOIN home_tier_config tc ON h.home_tier = tc.id;

-- View for visitor history
CREATE OR REPLACE VIEW visitor_history AS
SELECT 
  v.*,
  h.home_name,
  h.home_tier,
  tc.tier_name,
  p.email as visitor_email,
  p.raw_user_meta_data->>'username' as visitor_name
FROM home_visitors v
JOIN player_homes h ON v.home_id = h.id
LEFT JOIN home_tier_config tc ON h.home_tier = tc.id
LEFT JOIN auth.users p ON v.visitor_id = p.id
ORDER BY v.visit_start_time DESC;

-- ============================================
-- Functions and Triggers
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_player_homes_updated_at BEFORE UPDATE ON player_homes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_room_layouts_updated_at BEFORE UPDATE ON room_layouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_placed_items_updated_at BEFORE UPDATE ON placed_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update visitor count when someone visits
CREATE OR REPLACE FUNCTION update_visitor_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_online = true THEN
    UPDATE player_homes 
    SET current_visitors = current_visitors + 1,
        total_visits = total_visits + 1
    WHERE id = NEW.home_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.is_online = true AND NEW.is_online = false THEN
    UPDATE player_homes 
    SET current_visitors = current_visitors - 1
    WHERE id = NEW.home_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.is_online = false AND NEW.is_online = true THEN
    UPDATE player_homes 
    SET current_visitors = current_visitors + 1,
        total_visits = total_visits + 1
    WHERE id = NEW.home_id;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_visitor_count_trigger
AFTER INSERT OR UPDATE ON home_visitors
FOR EACH ROW EXECUTE FUNCTION update_visitor_count();

-- Function to update home rating
CREATE OR REPLACE FUNCTION update_home_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.rating IS NOT NULL AND NEW.rating BETWEEN 1 AND 5 THEN
    UPDATE player_homes
    SET total_rating = (
        SELECT COALESCE(AVG(rating), 0) 
        FROM home_visitors 
        WHERE home_id = NEW.home_id 
        AND rating IS NOT NULL
      ),
        rating_count = (
        SELECT COUNT(*) 
        FROM home_visitors 
        WHERE home_id = NEW.home_id 
        AND rating IS NOT NULL
      )
    WHERE id = NEW.home_id;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_home_rating_trigger
AFTER INSERT OR UPDATE ON home_visitors
FOR EACH ROW EXECUTE FUNCTION update_home_rating();