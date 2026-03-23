-- Business Inventory Population
-- This script populates business_inventory with relevant avatar items for each business

-- Populate business inventory with items based on business category
DO $$
DECLARE
  v_business RECORD;
  v_item RECORD;
  v_category_map TEXT[];
  inserted_count INTEGER := 0;
BEGIN
  -- Define category mappings: business category ID to avatar item categories
  -- This maps each business type to relevant avatar item categories
  
  FOR v_business IN 
    SELECT pb.id as business_id, pb.category_id as business_category_id, bc.name as business_name
    FROM physical_businesses pb
    JOIN business_categories bc ON pb.category_id = bc.id
    WHERE pb.for_sale = true
    ORDER BY bc.name
  LOOP
    -- Determine relevant item categories based on business category
    v_category_map := CASE 
      WHEN v_business.business_name = 'Real Estate' THEN ARRAY['business', 'formal']
      WHEN v_business.business_name = 'Retail' THEN ARRAY['retail', 'casual']
      WHEN v_business.business_name = 'Medical' THEN ARRAY['medical', 'professional']
      WHEN v_business.business_name = 'Financial' THEN ARRAY['financial', 'business', 'formal', 'luxury']
      WHEN v_business.business_name = 'Restaurant' THEN ARRAY['restaurant', 'food', 'service']
      WHEN v_business.business_name = 'Technology' THEN ARRAY['tech', 'casual', 'modern']
      WHEN v_business.business_name = 'Professional Services' THEN ARRAY['professional', 'formal', 'business']
      WHEN v_business.business_name = 'Construction' THEN ARRAY['work', 'safety', 'construction']
      WHEN v_business.business_name = 'Creative' THEN ARRAY['artistic', 'creative']
      WHEN v_business.business_name = 'Education' THEN ARRAY['academic', 'formal']
      WHEN v_business.business_name = 'Personal Services' THEN ARRAY['wellness', 'spa', 'service']
      WHEN v_business.business_name = 'Transportation' THEN ARRAY['transport', 'service']
      WHEN v_business.business_name = 'Manufacturing' THEN ARRAY['work', 'industrial', 'safety']
      WHEN v_business.business_name = 'Agriculture' THEN ARRAY['outdoor', 'work', 'agriculture']
      WHEN v_business.business_name = 'Entertainment' THEN ARRAY['entertainment', 'party', 'creative']
      WHEN v_business.business_name = 'Hospitality' THEN ARRAY['service', 'hospitality']
      WHEN v_business.business_name = 'Wellness' THEN ARRAY['fitness', 'athletic', 'wellness']
      WHEN v_business.business_name = 'Automotive' THEN ARRAY['work', 'automotive', 'service']
      WHEN v_business.business_name = 'Pet Services' THEN ARRAY['pet', 'casual']
      WHEN v_business.business_name = 'E-commerce' THEN ARRAY['tech', 'casual', 'modern']
      ELSE ARRAY['casual']
    END;
    
    -- Add relevant items to this business
    FOR v_item IN 
      SELECT id, base_price
      FROM avatar_items
      WHERE category = ANY(v_category_map)
         OR tags && v_category_map
      ORDER BY RANDOM()
      LIMIT 15  -- Each business gets up to 15 relevant items
    LOOP
      -- Check if item already exists in business inventory
      IF NOT EXISTS (
        SELECT 1 FROM business_inventory 
        WHERE business_id = v_business.business_id 
          AND item_id = v_item.id
      ) THEN
        -- Insert item into business inventory
        INSERT INTO business_inventory (
          business_id,
          item_id,
          stock_quantity,
          restock_date,
          discount_percentage,
          is_available,
          custom_price
        ) VALUES (
          v_business.business_id,
          v_item.id,
          (FLOOR(RANDOM() * 50) + 10)::INTEGER,  -- 10-60 items in stock
          NOW() + INTERVAL '30 days',  -- Restock date
          0,  -- No discount
          true,  -- Available
          NULL  -- No custom price
        );
        
        inserted_count := inserted_count + 1;
      END IF;
    END LOOP;
    
    RAISE NOTICE 'Populated inventory for business: %', v_business.business_name;
  END LOOP;
  
  RAISE NOTICE 'Total inventory items populated: %', inserted_count;
END
$$;

-- Verify the inventory population
SELECT 
  c.name as city,
  bc.name as business_category,
  COUNT(DISTINCT pb.id) as business_count,
  COUNT(bi.id) as total_inventory_items,
  AVG(bi.stock_quantity) as avg_stock_per_item
FROM cities c
JOIN physical_businesses pb ON pb.city_id = c.id
JOIN business_categories bc ON pb.category_id = bc.id
LEFT JOIN business_inventory bi ON bi.business_id = pb.id
GROUP BY c.id, c.name, bc.id, bc.name
ORDER BY c.name, bc.name;

-- Summary statistics
SELECT 
  COUNT(DISTINCT business_id) as businesses_with_inventory,
  COUNT(DISTINCT item_id) as unique_items_in_inventory,
  SUM(stock_quantity) as total_items_in_stock,
  AVG(stock_quantity) as avg_stock_quantity
FROM business_inventory;