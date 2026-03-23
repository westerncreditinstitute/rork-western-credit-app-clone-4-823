-- Interactive Real-World Map System Migration
-- This migration creates the database schema for the location-based game map system

-- Enable PostGIS extension for geospatial data
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================
-- Cities Table
-- ============================================
CREATE TABLE IF NOT EXISTS cities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'USA',
  center_lat DECIMAL(10, 8) NOT NULL,
  center_lng DECIMAL(11, 8) NOT NULL,
  bounds_north DECIMAL(10, 8),
  bounds_south DECIMAL(10, 8),
  bounds_east DECIMAL(11, 8),
  bounds_west DECIMAL(11, 8),
  zoom_level INTEGER DEFAULT 12,
  min_zoom INTEGER DEFAULT 10,
  max_zoom INTEGER DEFAULT 18,
  is_active BOOLEAN DEFAULT true,
  population INTEGER,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_center CHECK (center_lat BETWEEN -90 AND 90 AND center_lng BETWEEN -180 AND 180)
);

-- Indexes for cities
CREATE INDEX idx_cities_active ON cities(is_active) WHERE is_active = true;
CREATE INDEX idx_cities_name ON cities(name);

-- ============================================
-- Property Types Table
-- ============================================
CREATE TABLE IF NOT EXISTS property_types (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('residential', 'commercial')),
  icon TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  description TEXT,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Properties Table
-- ============================================
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_id UUID NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  property_type_id INTEGER NOT NULL REFERENCES property_types(id),
  title TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  address2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  location GEOGRAPHY(POINT, 4326),
  image_url TEXT,
  thumbnail_url TEXT,
  sale_status TEXT NOT NULL DEFAULT 'available' CHECK (sale_status IN ('available', 'sold', 'pending', 'off_market', 'rented')),
  price DECIMAL(12, 2),
  rent_price DECIMAL(12, 2),
  property_details JSONB,
  amenities JSONB,
  capacity INTEGER,
  rating DECIMAL(3, 2),
  is_featured BOOLEAN DEFAULT false,
  visit_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_coordinates CHECK (lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180),
  CONSTRAINT valid_price CHECK (price IS NULL OR price >= 0)
);

-- Indexes for properties
CREATE INDEX idx_properties_city ON properties(city_id);
CREATE INDEX idx_properties_type ON properties(property_type_id);
CREATE INDEX idx_properties_status ON properties(sale_status);
CREATE INDEX idx_properties_location ON properties USING GIST(location);
CREATE INDEX idx_properties_coords ON properties(lat, lng);
CREATE INDEX idx_properties_featured ON properties(is_featured) WHERE is_featured = true;
CREATE INDEX idx_properties_price ON properties(price) WHERE price IS NOT NULL;

-- ============================================
-- Property Clusters Table (for performance)
-- ============================================
CREATE TABLE IF NOT EXISTS property_clusters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_id UUID NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  cluster_lat DECIMAL(10, 8) NOT NULL,
  cluster_lng DECIMAL(11, 8) NOT NULL,
  property_count INTEGER NOT NULL,
  property_ids UUID[] NOT NULL,
  property_type_ids INTEGER[],
  cluster_level INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for clusters
CREATE INDEX idx_clusters_city ON property_clusters(city_id);
CREATE INDEX idx_clusters_location ON property_clusters(cluster_lat, cluster_lng);

-- ============================================
-- User Favorites Table
-- ============================================
CREATE TABLE IF NOT EXISTS property_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, property_id)
);

-- Indexes for favorites
CREATE INDEX idx_favorites_user ON property_favorites(user_id);
CREATE INDEX idx_favorites_property ON property_favorites(property_id);

-- ============================================
-- Property Visits Table
-- ============================================
CREATE TABLE IF NOT EXISTS property_visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visit_count INTEGER DEFAULT 1,
  last_visited_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, property_id)
);

-- Indexes for visits
CREATE INDEX idx_visits_property ON property_visits(property_id);
CREATE INDEX idx_visits_user ON property_visits(user_id);

-- ============================================
-- Triggers for automatic timestamp updates
-- ============================================

-- Cities updated_at trigger
CREATE OR REPLACE FUNCTION update_cities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_cities_updated_at ON cities;
CREATE TRIGGER trigger_update_cities_updated_at
BEFORE UPDATE ON cities
FOR EACH ROW
EXECUTE FUNCTION update_cities_updated_at();

-- Properties updated_at trigger
CREATE OR REPLACE FUNCTION update_properties_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_properties_updated_at ON properties;
CREATE TRIGGER trigger_update_properties_updated_at
BEFORE UPDATE ON properties
FOR EACH ROW
EXECUTE FUNCTION update_properties_updated_at();

-- Property clusters updated_at trigger
CREATE OR REPLACE FUNCTION update_property_clusters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_property_clusters_updated_at ON property_clusters;
CREATE TRIGGER trigger_update_property_clusters_updated_at
BEFORE UPDATE ON property_clusters
FOR EACH ROW
EXECUTE FUNCTION update_property_clusters_updated_at();

-- ============================================
-- Trigger to update location from lat/lng
-- ============================================
CREATE OR REPLACE FUNCTION update_property_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_property_location ON properties;
CREATE TRIGGER trigger_update_property_location
BEFORE INSERT OR UPDATE OF lat, lng
ON properties
FOR EACH ROW
EXECUTE FUNCTION update_property_location();

-- ============================================
-- Trigger to increment property visit count
-- ============================================
CREATE OR REPLACE FUNCTION increment_property_visit_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE properties
  SET visit_count = visit_count + 1
  WHERE id = NEW.property_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_increment_property_visit_count ON property_visits;
CREATE TRIGGER trigger_increment_property_visit_count
AFTER INSERT ON property_visits
FOR EACH ROW
EXECUTE FUNCTION increment_property_visit_count();

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_visits ENABLE ROW LEVEL SECURITY;

-- Cities RLS policies
CREATE POLICY "Anyone can view active cities"
ON cities FOR SELECT
USING (is_active = true);

-- Properties RLS policies
CREATE POLICY "Anyone can view available properties"
ON properties FOR SELECT
USING (true);

CREATE POLICY "Anyone can search properties"
ON properties FOR SELECT
USING (true);

-- Property clusters RLS policies
CREATE POLICY "Anyone can view clusters"
ON property_clusters FOR SELECT
USING (true);

-- Property favorites RLS policies
CREATE POLICY "Users can view own favorites"
ON property_favorites FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can add favorites"
ON property_favorites FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites"
ON property_favorites FOR DELETE
USING (auth.uid() = user_id);

-- Property visits RLS policies
CREATE POLICY "Users can view own visits"
ON property_visits FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can add visits"
ON property_visits FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own visits"
ON property_visits FOR UPDATE
USING (auth.uid() = user_id);

-- ============================================
-- Helper Functions
-- ============================================

-- Function to find properties within radius
CREATE OR REPLACE FUNCTION find_properties_within_radius(
  p_lat DECIMAL,
  p_lng DECIMAL,
  radius_meters INTEGER,
  p_city_id UUID DEFAULT NULL,
  p_type_id INTEGER DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  property_type_id INTEGER,
  lat DECIMAL,
  lng DECIMAL,
  price DECIMAL,
  sale_status TEXT,
  distance_meters DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.title,
    p.property_type_id,
    p.lat,
    p.lng,
    p.price,
    p.sale_status,
    ST_Distance(p.location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography) AS distance_meters
  FROM properties p
  WHERE 
    ST_DWithin(
      p.location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      radius_meters
    )
    AND (p_city_id IS NULL OR p.city_id = p_city_id)
    AND (p_type_id IS NULL OR p.property_type_id = p_type_id)
    AND (p_status IS NULL OR p.sale_status = p_status)
  ORDER BY distance_meters;
END;
$$ LANGUAGE plpgsql;

-- Function to get properties in bounds
CREATE OR REPLACE FUNCTION find_properties_in_bounds(
  bounds_north DECIMAL,
  bounds_south DECIMAL,
  bounds_east DECIMAL,
  bounds_west DECIMAL,
  p_city_id UUID DEFAULT NULL,
  p_type_id INTEGER DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS SETOF properties AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM properties
  WHERE 
    lat BETWEEN bounds_south AND bounds_north
    AND lng BETWEEN bounds_west AND bounds_east
    AND (p_city_id IS NULL OR city_id = p_city_id)
    AND (p_type_id IS NULL OR property_type_id = p_type_id)
    AND (p_status IS NULL OR sale_status = p_status)
  ORDER BY is_featured DESC, created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Verification Queries
-- ============================================

-- Verify tables exist
DO $$
BEGIN
  RAISE NOTICE 'Tables created: cities, property_types, properties, property_clusters, property_favorites, property_visits';
END $$;

-- Verify PostGIS extension
SELECT postgis_full_version();

-- Verify spatial index
SELECT 
  tablename,
  indexname
FROM pg_indexes
WHERE tablename = 'properties' AND indexname LIKE '%location%';