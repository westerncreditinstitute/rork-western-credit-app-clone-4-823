-- Initialize map data - Cities and Property Types

-- ============================================
-- Initialize Cities
-- ============================================

INSERT INTO cities (name, state, country, center_lat, center_lng, bounds_north, bounds_south, bounds_east, bounds_west, zoom_level, min_zoom, max_zoom, population, description, image_url, is_active) VALUES
(
  'Los Angeles',
  'CA',
  'USA',
  34.0522,
  -118.2437,
  34.3373,
  33.7037,
  -118.1553,
  -118.6682,
  11,
  10,
  18,
  3979576,
  'The entertainment capital of the world, home to Hollywood and beautiful beaches.',
  'https://images.unsplash.com/photo-1533930262524-5e0a7833f3c9?w=800',
  true
),
(
  'New York',
  'NY',
  'USA',
  40.7128,
  -74.0060,
  40.9176,
  40.4774,
  -73.7004,
  -74.2591,
  11,
  10,
  18,
  8336817,
  'The city that never sleeps, a global hub for finance, culture, and entertainment.',
  'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800',
  true
),
(
  'Miami',
  'FL',
  'USA',
  25.7617,
  -80.1918,
  25.9527,
  25.5967,
  -80.1235,
  -80.3428,
  11,
  10,
  18,
  467963,
  'A vibrant city known for its beaches, nightlife, and Art Deco architecture.',
  'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=800',
  true
),
(
  'Chicago',
  'IL',
  'USA',
  41.8781,
  -87.6298,
  42.0231,
  41.6442,
  -87.5240,
  -87.9401,
  11,
  10,
  18,
  2693976,
  'The Windy City, known for its architecture, deep-dish pizza, and Lake Michigan.',
  'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800',
  true
),
(
  'Houston',
  'TX',
  'USA',
  29.7604,
  -95.3698,
  30.1295,
  29.5167,
  -95.0254,
  -95.7875,
  11,
  10,
  18,
  2320268,
  'A sprawling metropolis known for its space center, diverse culture, and energy industry.',
  'https://images.unsplash.com/photo-1556398469-5e5246d696f6?w=800',
  true
),
(
  'Phoenix',
  'AZ',
  'USA',
  33.4484,
  -112.0740,
  33.8434,
  33.2903,
  -111.9214,
  -112.3172,
  11,
  10,
  18,
  1680992,
  'The Valley of the Sun, known for its year-round sunshine and desert landscapes.',
  'https://images.unsplash.com/photo-1545100220-7d99a4982d2b?w=800',
  true
),
(
  'Atlanta',
  'GA',
  'USA',
  33.7490,
  -84.3880,
  33.8868,
  33.6406,
  -84.2873,
  -84.5528,
  11,
  10,
  18,
  498715,
  'The capital of the South, known for its history, civil rights movement, and peaches.',
  'https://images.unsplash.com/photo-1575933427422-3568e627276e?w=800',
  true
)
ON CONFLICT (name, state) DO NOTHING;

-- ============================================
-- Initialize Property Types
-- ============================================

-- Residential
INSERT INTO property_types (id, name, category, icon, color, description, priority, is_active) VALUES
(1, 'Apartment', 'residential', 'apartment', '#3B82F6', 'Residential apartment units', 100, true),
(2, 'House', 'residential', 'home', '#10B981', 'Single-family houses', 90, true),
(3, 'Condo', 'residential', 'building', '#F59E0B', 'Condominium units', 80, true),
(4, 'Townhouse', 'residential', 'house-line', '#8B5CF6', 'Townhouse properties', 70, true)

ON CONFLICT (id) DO NOTHING;

-- Commercial - Entertainment
INSERT INTO property_types (id, name, category, icon, color, description, priority, is_active) VALUES
(10, 'Bowling Alley', 'commercial', 'bowling', '#EF4444', 'Bowling entertainment venue', 95, true),
(11, 'Movie Theater', 'commercial', 'movie', '#EC4899', 'Cinema and movie theaters', 95, true),
(12, 'Nightclub', 'commercial', 'music', '#8B5CF6', 'Nightclubs and bars with entertainment', 90, true),
(13, 'Bar', 'commercial', 'beer', '#F59E0B', 'Bars and pubs', 85, true),
(14, 'Billiards Hall', 'commercial', 'pool', '#6366F1', 'Billiards and pool halls', 80, true)

ON CONFLICT (id) DO NOTHING;

-- Commercial - Food & Dining
INSERT INTO property_types (id, name, category, icon, color, description, priority, is_active) VALUES
(20, 'Restaurant', 'commercial', 'utensils', '#EF4444', 'Restaurants and cafes', 100, true),
(21, 'Grocery Store', 'commercial', 'shopping-cart', '#10B981', 'Grocery and food stores', 95, true)

ON CONFLICT (id) DO NOTHING;

-- Commercial - Sports & Recreation
INSERT INTO property_types (id, name, category, icon, color, description, priority, is_active) VALUES
(30, 'Sports Arena', 'commercial', 'trophy', '#3B82F6', 'Sports arenas and stadiums', 95, true),
(31, 'Paintball Range', 'commercial', 'target', '#F59E0B', 'Paintball and gaming venues', 85, true),
(32, 'Golf Country Club', 'commercial', 'golf', '#10B981', 'Golf courses and country clubs', 90, true)

ON CONFLICT (id) DO NOTHING;

-- Commercial - Services
INSERT INTO property_types (id, name, category, icon, color, description, priority, is_active) VALUES
(40, 'Bank', 'commercial', 'bank', '#6366F1', 'Banks and financial institutions', 90, true),
(41, 'Event Hall', 'commercial', 'calendar', '#EC4899', 'Event halls and convention centers', 85, true)

ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Verification Queries
-- ============================================

-- Count cities
SELECT 
  'Cities initialized' as status,
  COUNT(*) as count
FROM cities;

-- Count property types
SELECT 
  'Property types initialized' as status,
  COUNT(*) as count
FROM property_types;

-- Show cities
SELECT 
  name,
  state,
  population,
  is_active
FROM cities
ORDER BY population DESC;

-- Show property types by category
SELECT 
  category,
  COUNT(*) as type_count,
  STRING_AGG(name, ', ') as types
FROM property_types
WHERE is_active = true
GROUP BY category
ORDER BY category;