-- Business Ownership System - Data Initialization
-- This script initializes the database with cities, business templates, and physical businesses

-- Insert 7 major US cities
INSERT INTO cities (name, state, country, latitude, longitude) VALUES
  ('Los Angeles', 'California', 'USA', 34.0522, -118.2437),
  ('Miami', 'Florida', 'USA', 25.7617, -80.1918),
  ('New York', 'New York', 'USA', 40.7128, -74.0060),
  ('Chicago', 'Illinois', 'USA', 41.8781, -87.6298),
  ('Houston', 'Texas', 'USA', 29.7604, -95.3698),
  ('Phoenix', 'Arizona', 'USA', 33.4484, -112.0740),
  ('Atlanta', 'Georgia', 'USA', 33.7490, -84.3880)
ON CONFLICT (name) DO NOTHING;

-- Get city IDs for reference
DO $$
DECLARE
  v_city_id UUID;
  v_category_id UUID;
  v_template_id UUID;
  counter INTEGER := 0;
BEGIN
  -- Insert business templates for each existing business category
  -- Note: This assumes business_categories table already exists with data
  
  FOR v_category_id IN 
    SELECT id FROM business_categories ORDER BY name
  LOOP
    counter := counter + 1;
    
    -- Create a template for each category
    INSERT INTO business_templates (category_id, name, description, default_revenue, default_expenses, employee_capacity, square_footage)
    SELECT 
      v_category_id,
      name || ' - Standard Template',
      'Standard ' || name || ' business template',
      COALESCE(avg_monthly_revenue, 10000),
      COALESCE(ROUND(avg_monthly_revenue * 0.7), 7000),
      GREATEST(1, FLOOR(COALESCE(avg_monthly_revenue, 10000) / 5000)),
      GREATEST(500, COALESCE(avg_monthly_revenue, 10000) * 100)
    FROM business_categories 
    WHERE id = v_category_id
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Created template for category %', counter;
  END LOOP;
  
  RAISE NOTICE 'Created % business templates', counter;
END
$$;

-- Create physical businesses (20 per city, one per category)
DO $$
DECLARE
  v_city RECORD;
  v_category RECORD;
  v_template RECORD;
  v_administrator_id UUID := '00000000-0000-0000-0000-000000000001'; -- Placeholder admin ID
  counter INTEGER := 0;
BEGIN
  -- For each city
  FOR v_city IN SELECT id, name FROM cities ORDER BY name LOOP
    RAISE NOTICE 'Creating businesses for city: %', v_city.name;
    
    -- For each business category
    FOR v_category IN SELECT id, name FROM business_categories ORDER BY name LOOP
      counter := counter + 1;
      
      -- Get the template for this category
      SELECT id INTO v_template 
      FROM business_templates 
      WHERE category_id = v_category.id
      LIMIT 1;
      
      -- Create a physical business
      INSERT INTO physical_businesses (
        city_id,
        category_id,
        template_id,
        location_id,
        address_street,
        address_city,
        address_state,
        address_zip,
        latitude,
        longitude,
        name,
        description,
        current_owner_id,
        initial_owner_id,
        for_sale,
        listing_price,
        purchase_price,
        business_status,
        customer_rating,
        total_reviews,
        monthly_revenue,
        monthly_expenses,
        employee_count
      ) VALUES (
        v_city.id,
        v_category.id,
        v_template.id,
        'LOC-' || v_city.id || '-' || v_category.id,
        counter || ' ' || v_category.name || ' Street',
        v_city.name,
        (SELECT state FROM cities WHERE id = v_city.id),
        '10000',
        (SELECT latitude FROM cities WHERE id = v_city.id),
        (SELECT longitude FROM cities WHERE id = v_city.id),
        v_city.name || ' ' || v_category.name,
        'A ' || v_category.name || ' business in ' || v_city.name,
        v_administrator_id,
        v_administrator_id,
        true,
        COALESCE((SELECT max_startup_cost FROM business_categories WHERE id = v_category.id), 50000) * 1.2,
        COALESCE((SELECT max_startup_cost FROM business_categories WHERE id = v_category.id), 50000),
        'active',
        4.0,
        10,
        COALESCE((SELECT avg_monthly_revenue FROM business_categories WHERE id = v_category.id), 10000),
        COALESCE(ROUND((SELECT avg_monthly_revenue FROM business_categories WHERE id = v_category.id) * 0.7), 7000),
        GREATEST(1, FLOOR(COALESCE((SELECT avg_monthly_revenue FROM business_categories WHERE id = v_category.id), 10000) / 5000))
      )
      ON CONFLICT (city_id, category_id, location_id) DO NOTHING;
    END LOOP;
    
    RAISE NOTICE 'Created businesses for city: %', v_city.name;
  END LOOP;
  
  RAISE NOTICE 'Created % physical businesses total', counter;
END
$$;

-- Verify the initialization
SELECT 
  c.name as city,
  COUNT(pb.id) as business_count,
  SUM(pb.listing_price) as total_value
FROM cities c
LEFT JOIN physical_businesses pb ON pb.city_id = c.id
GROUP BY c.id, c.name
ORDER BY c.name;

SELECT 
  bc.name as category,
  COUNT(DISTINCT pb.id) as business_count
FROM business_categories bc
LEFT JOIN business_templates bt ON bt.category_id = bc.id
LEFT JOIN physical_businesses pb ON pb.category_id = bc.id
GROUP BY bc.id, bc.name
ORDER BY bc.name;