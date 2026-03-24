-- Business Ownership & Customization System Migration
-- Part 1: Core Business & Location Tables

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Cities table
CREATE TABLE IF NOT EXISTS cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  state VARCHAR(50) NOT NULL,
  country VARCHAR(50) NOT NULL DEFAULT 'USA',
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Business categories table - Only create if it doesn't exist
-- Note: If this table already exists (from Start A Business feature), it will use existing schema
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_categories') THEN
        CREATE TABLE business_categories (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) NOT NULL UNIQUE,
          description TEXT,
          category_type VARCHAR(50) NOT NULL,
          is_featured BOOLEAN DEFAULT FALSE,
          min_startup_cost DECIMAL(12,2),
          max_startup_cost DECIMAL(12,2),
          avg_monthly_revenue DECIMAL(12,2),
          risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high', 'very_high')),
          min_credit_score INTEGER,
          time_to_profitability_months INTEGER,
          failure_rate DECIMAL(5,4),
          required_education_id UUID,
          min_experience_level INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END
$$;

-- Pre-defined business templates (per category)
CREATE TABLE IF NOT EXISTS business_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES business_categories(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  default_revenue DECIMAL(12,2),
  default_expenses DECIMAL(12,2),
  employee_capacity INTEGER,
  square_footage INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Physical businesses (20 per city, one per category)
CREATE TABLE IF NOT EXISTS physical_businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID REFERENCES cities(id) ON DELETE CASCADE,
  category_id UUID REFERENCES business_categories(id) ON DELETE RESTRICT,
  template_id UUID REFERENCES business_templates(id),
  location_id VARCHAR(100) NOT NULL,
  address_street VARCHAR(200) NOT NULL,
  address_city VARCHAR(100) NOT NULL,
  address_state VARCHAR(50) NOT NULL,
  address_zip VARCHAR(10),
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  current_owner_id UUID REFERENCES auth.users(id),
  initial_owner_id UUID REFERENCES auth.users(id),
  for_sale BOOLEAN DEFAULT TRUE,
  listing_price DECIMAL(12,2),
  purchase_price DECIMAL(12,2),
  business_status VARCHAR(20) DEFAULT 'active' CHECK (business_status IN ('active', 'inactive', 'closed', 'renovation')),
  customer_rating DECIMAL(3,2) CHECK (customer_rating BETWEEN 0 AND 5),
  total_reviews INTEGER DEFAULT 0,
  monthly_revenue DECIMAL(12,2) DEFAULT 0,
  monthly_expenses DECIMAL(12,2) DEFAULT 0,
  employee_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(city_id, category_id, location_id)
);

-- Business ownership history
CREATE TABLE IF NOT EXISTS business_ownership_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES physical_businesses(id) ON DELETE CASCADE,
  previous_owner_id UUID REFERENCES auth.users(id),
  new_owner_id UUID REFERENCES auth.users(id),
  transfer_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  transfer_price DECIMAL(12,2),
  transfer_type VARCHAR(20) CHECK (transfer_type IN ('purchase', 'inheritance', 'auction', 'admin_transfer')),
  notes TEXT
);

-- Performance indexes for business tables
CREATE INDEX IF NOT EXISTS idx_physical_businesses_city ON physical_businesses(city_id);
CREATE INDEX IF NOT EXISTS idx_physical_businesses_category ON physical_businesses(category_id);
CREATE INDEX IF NOT EXISTS idx_physical_businesses_owner ON physical_businesses(current_owner_id);
CREATE INDEX IF NOT EXISTS idx_physical_businesses_for_sale ON physical_businesses(for_sale) WHERE for_sale = TRUE;
CREATE INDEX IF NOT EXISTS idx_physical_businesses_location ON physical_businesses(location_id);
CREATE INDEX IF NOT EXISTS idx_business_ownership_history_business ON business_ownership_history(business_id);
CREATE INDEX IF NOT EXISTS idx_business_ownership_history_date ON business_ownership_history(transfer_date);

-- Row Level Security Policies
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE physical_businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_ownership_history ENABLE ROW LEVEL SECURITY;

-- Cities RLS policies (public read, admin write)
CREATE POLICY "Cities are viewable by everyone" ON cities
  FOR SELECT USING (true);

-- Physical businesses RLS policies
CREATE POLICY "Physical businesses are viewable by everyone" ON physical_businesses
  FOR SELECT USING (true);

CREATE POLICY "Users can update businesses they own" ON physical_businesses
  FOR UPDATE USING (auth.uid() = current_owner_id);

-- Business ownership history RLS policies
CREATE POLICY "Ownership history is viewable by everyone" ON business_ownership_history
  FOR SELECT USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_cities_updated_at BEFORE UPDATE ON cities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Only create trigger for business_categories if table exists (might already have it)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_categories') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_business_categories_updated_at') THEN
            CREATE TRIGGER update_business_categories_updated_at BEFORE UPDATE ON business_categories
              FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
    END IF;
END
$$;

CREATE TRIGGER update_business_templates_updated_at BEFORE UPDATE ON business_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_physical_businesses_updated_at BEFORE UPDATE ON physical_businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE cities IS 'List of cities in the game where businesses exist';
COMMENT ON TABLE business_categories IS '20 distinct business categories with configuration data';
COMMENT ON TABLE business_templates IS 'Pre-defined templates for each business category';
COMMENT ON TABLE physical_businesses IS 'Physical business locations (20 per city, one per category)';
COMMENT ON TABLE business_ownership_history IS 'History of business ownership transfers';