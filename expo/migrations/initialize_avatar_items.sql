-- Avatar Items Catalog - Data Initialization
-- This script initializes the avatar_items table with 60+ items across all 20 business categories

-- Common items (accessible to all players)
INSERT INTO avatar_items (name, description, item_type, category, rarity, base_price, currency_type, level_requirement, credit_score_requirement, is_default, gender, tags) VALUES
  -- Common Outfits
  ('Default Casual Outfit', 'A comfortable casual outfit for everyday wear', 'outfit', 'casual', 'common', 50, 'usd', 0, 0, true, 'unisex', ARRAY['everyday', 'comfortable']),
  ('Basic T-Shirt', 'Simple and comfortable t-shirt', 'outfit', 'casual', 'common', 25, 'usd', 0, 0, true, 'unisex', ARRAY['basic', 'casual']),
  ('Classic Jeans', 'Versatile jeans for any occasion', 'outfit', 'casual', 'common', 75, 'usd', 0, 0, true, 'unisex', ARRAY['basic', 'denim']),
  ('Comfortable Sneakers', 'Everyday sneakers for walking and casual wear', 'shoes', 'casual', 'common', 60, 'usd', 0, 0, true, 'unisex', ARRAY['basic', 'footwear']),
  ('Simple Watch', 'Basic watch for timekeeping', 'accessory', 'casual', 'common', 40, 'usd', 0, 0, true, 'unisex', ARRAY['basic', 'timepiece'])
ON CONFLICT DO NOTHING;

-- Real Estate Business Items
INSERT INTO avatar_items (name, description, item_type, category, rarity, base_price, currency_type, level_requirement, credit_score_requirement, is_default, gender, tags) VALUES
  ('Business Suit - Navy', 'Professional navy business suit', 'outfit', 'business', 'uncommon', 200, 'usd', 3, 650, false, 'unisex', ARRAY['formal', 'professional', 'real_estate']),
  ('Silk Tie - Red', 'Elegant red silk tie', 'accessory', 'business', 'common', 45, 'usd', 2, 600, false, 'male', ARRAY['formal', 'professional']),
  ('Leather Briefcase', 'Classic leather briefcase', 'accessory', 'business', 'uncommon', 150, 'usd', 3, 650, false, 'unisex', ARRAY['business', 'professional']),
  ('Dress Shoes - Black', 'Professional black dress shoes', 'shoes', 'business', 'uncommon', 120, 'usd', 3, 650, false, 'unisex', ARRAY['formal', 'footwear']),
  ('Property Portfolio', 'Leather-bound property portfolio', 'accessory', 'business', 'rare', 300, 'usd', 5, 700, false, 'unisex', ARRAY['business', 'real_estate', 'professional'])
ON CONFLICT DO NOTHING;

-- Retail Business Items
INSERT INTO avatar_items (name, description, item_type, category, rarity, base_price, currency_type, level_requirement, credit_score_requirement, is_default, gender, tags) VALUES
  ('Retail Manager Vest', 'Professional retail manager vest', 'outfit', 'retail', 'common', 80, 'usd', 2, 550, false, 'unisex', ARRAY['retail', 'service']),
  ('Name Tag', 'Professional name tag', 'accessory', 'retail', 'common', 15, 'usd', 1, 500, false, 'unisex', ARRAY['retail', 'service']),
  ('Comfortable Loafers', 'Comfortable shoes for retail work', 'shoes', 'retail', 'common', 70, 'usd', 2, 550, false, 'unisex', ARRAY['retail', 'footwear']),
  ('Customer Service Badge', 'Recognition for excellent service', 'accessory', 'retail', 'uncommon', 100, 'usd', 4, 650, false, 'unisex', ARRAY['retail', 'achievement']),
  ('Shopping Bag Collection', 'Stylish shopping bags', 'accessory', 'retail', 'common', 30, 'usd', 1, 500, false, 'unisex', ARRAY['retail', 'fashion'])
ON CONFLICT DO NOTHING;

-- Medical Business Items
INSERT INTO avatar_items (name, description, item_type, category, rarity, base_price, currency_type, level_requirement, credit_score_requirement, is_default, gender, tags) VALUES
  ('Lab Coat - White', 'Professional medical lab coat', 'outfit', 'medical', 'uncommon', 120, 'usd', 4, 700, false, 'unisex', ARRAY['medical', 'professional']),
  ('Stethoscope', 'Professional medical stethoscope', 'accessory', 'medical', 'uncommon', 180, 'usd', 4, 700, false, 'unisex', ARRAY['medical', 'professional']),
  ('Medical Scrubs - Blue', 'Comfortable medical scrubs', 'outfit', 'medical', 'common', 90, 'usd', 3, 650, false, 'unisex', ARRAY['medical', 'comfortable']),
  ('Comfortable Clogs', 'Comfortable shoes for medical professionals', 'shoes', 'medical', 'common', 85, 'usd', 3, 650, false, 'unisex', ARRAY['medical', 'footwear']),
  ('Medical Badge', 'Professional medical identification', 'accessory', 'medical', 'rare', 250, 'usd', 5, 750, false, 'unisex', ARRAY['medical', 'professional', 'achievement'])
ON CONFLICT DO NOTHING;

-- Financial Business Items
INSERT INTO avatar_items (name, description, item_type, category, rarity, base_price, currency_type, level_requirement, credit_score_requirement, is_default, gender, tags) VALUES
  ('Executive Suit - Charcoal', 'Premium charcoal executive suit', 'outfit', 'financial', 'rare', 450, 'usd', 6, 750, false, 'unisex', ARRAY['formal', 'professional', 'luxury', 'financial']),
  ('Luxury Watch - Gold', 'Elegant gold luxury watch', 'accessory', 'financial', 'epic', 800, 'usd', 7, 800, false, 'unisex', ARRAY['luxury', 'financial', 'prestige']),
  ('Cufflinks - Silver', 'Elegant silver cufflinks', 'accessory', 'financial', 'uncommon', 200, 'usd', 5, 700, false, 'male', ARRAY['formal', 'luxury']),
  ('Oxford Shoes - Brown', 'Premium brown oxford shoes', 'shoes', 'financial', 'rare', 300, 'usd', 6, 750, false, 'unisex', ARRAY['formal', 'luxury', 'footwear']),
  ('Financial Analyst Badge', 'Recognition of financial expertise', 'accessory', 'financial', 'epic', 1000, 'usd', 8, 850, false, 'unisex', ARRAY['financial', 'achievement', 'prestige'])
ON CONFLICT DO NOTHING;

-- Restaurant Business Items
INSERT INTO avatar_items (name, description, item_type, category, rarity, base_price, currency_type, level_requirement, credit_score_requirement, is_default, gender, tags) VALUES
  ('Chef Uniform - White', 'Professional chef uniform', 'outfit', 'restaurant', 'uncommon', 150, 'usd', 3, 600, false, 'unisex', ARRAY['restaurant', 'service', 'food']),
  ('Chef Hat - Tall', 'Classic tall chef hat', 'hat', 'restaurant', 'common', 60, 'usd', 2, 550, false, 'unisex', ARRAY['restaurant', 'food']),
  ('Apron - Black', 'Professional kitchen apron', 'accessory', 'restaurant', 'common', 50, 'usd', 2, 550, false, 'unisex', ARRAY['restaurant', 'food', 'service']),
  ('Non-Slip Kitchen Shoes', 'Safe shoes for kitchen work', 'shoes', 'restaurant', 'uncommon', 95, 'usd', 3, 600, false, 'unisex', ARRAY['restaurant', 'footwear', 'safety']),
  ('Culinary Award', 'Recognition of culinary excellence', 'accessory', 'restaurant', 'rare', 350, 'usd', 6, 700, false, 'unisex', ARRAY['restaurant', 'achievement', 'food'])
ON CONFLICT DO NOTHING;

-- Technology Business Items
INSERT INTO avatar_items (name, description, item_type, category, rarity, base_price, currency_type, level_requirement, credit_score_requirement, is_default, gender, tags) VALUES
  ('Tech Hoodie - Black', 'Modern tech company hoodie', 'outfit', 'tech', 'common', 80, 'usd', 2, 550, false, 'unisex', ARRAY['tech', 'casual', 'modern']),
  ('Smart Glasses', 'Futuristic smart glasses', 'glasses', 'tech', 'epic', 600, 'usd', 7, 800, false, 'unisex', ARRAY['tech', 'modern', 'futuristic']),
  ('Laptop Bag', 'Professional laptop carrying bag', 'accessory', 'tech', 'uncommon', 130, 'usd', 3, 650, false, 'unisex', ARRAY['tech', 'professional']),
  ('Sneakers - Tech Brand', 'Modern tech-branded sneakers', 'shoes', 'tech', 'uncommon', 140, 'usd', 3, 650, false, 'unisex', ARRAY['tech', 'modern', 'footwear']),
  ('Innovation Award', 'Recognition of technological innovation', 'accessory', 'tech', 'legendary', 2000, 'usd', 9, 900, false, 'unisex', ARRAY['tech', 'achievement', 'innovation'])
ON CONFLICT DO NOTHING;

-- Professional Services Business Items
INSERT INTO avatar_items (name, description, item_type, category, rarity, base_price, currency_type, level_requirement, credit_score_requirement, is_default, gender, tags) VALUES
  ('Consultant Attire', 'Professional consultant outfit', 'outfit', 'professional', 'uncommon', 220, 'usd', 4, 680, false, 'unisex', ARRAY['professional', 'formal']),
  ('Briefcase - Modern', 'Modern professional briefcase', 'accessory', 'professional', 'uncommon', 160, 'usd', 4, 680, false, 'unisex', ARRAY['professional', 'business']),
  ('Professional Portfolio', 'Document portfolio case', 'accessory', 'professional', 'common', 90, 'usd', 3, 630, false, 'unisex', ARRAY['professional', 'business']),
  ('Business Casual Shoes', 'Versatile business casual footwear', 'shoes', 'professional', 'common', 110, 'usd', 3, 630, false, 'unisex', ARRAY['professional', 'footwear']),
  ('Client Relations Award', 'Recognition of excellent client service', 'accessory', 'professional', 'rare', 380, 'usd', 6, 720, false, 'unisex', ARRAY['professional', 'achievement'])
ON CONFLICT DO NOTHING;

-- Construction Business Items
INSERT INTO avatar_items (name, description, item_type, category, rarity, base_price, currency_type, level_requirement, credit_score_requirement, is_default, gender, tags) VALUES
  ('Work Boots - Steel Toe', 'Protective steel-toe work boots', 'shoes', 'work', 'uncommon', 130, 'usd', 2, 550, false, 'unisex', ARRAY['work', 'safety', 'construction']),
  ('Hard Hat - Yellow', 'Protective yellow hard hat', 'hat', 'work', 'common', 50, 'usd', 1, 500, false, 'unisex', ARRAY['work', 'safety', 'construction']),
  ('High Visibility Vest', 'Safety vest for construction work', 'accessory', 'work', 'common', 40, 'usd', 1, 500, false, 'unisex', ARRAY['work', 'safety', 'construction']),
  ('Work Gloves', 'Protective work gloves', 'accessory', 'work', 'common', 25, 'usd', 1, 500, false, 'unisex', ARRAY['work', 'safety']),
  ('Construction Excellence Award', 'Recognition of construction quality', 'accessory', 'work', 'rare', 320, 'usd', 5, 700, false, 'unisex', ARRAY['work', 'achievement', 'construction'])
ON CONFLICT DO NOTHING;

-- Creative Business Items
INSERT INTO avatar_items (name, description, item_type, category, rarity, base_price, currency_type, level_requirement, credit_score_requirement, is_default, gender, tags) VALUES
  ('Artist Smock', 'Protective artist smock', 'outfit', 'artistic', 'common', 70, 'usd', 2, 540, false, 'unisex', ARRAY['artistic', 'creative']),
  ('Painter Hat', 'Classic painter hat', 'hat', 'artistic', 'common', 35, 'usd', 1, 500, false, 'unisex', ARRAY['artistic', 'creative']),
  ('Sketchbook', 'Artist sketchbook', 'accessory', 'artistic', 'common', 45, 'usd', 1, 500, false, 'unisex', ARRAY['artistic', 'creative']),
  ('Comfortable Canvas Shoes', 'Comfortable shoes for creative work', 'shoes', 'artistic', 'common', 65, 'usd', 2, 540, false, 'unisex', ARRAY['artistic', 'footwear']),
  ('Artistic Excellence Award', 'Recognition of artistic achievement', 'accessory', 'artistic', 'rare', 340, 'usd', 5, 710, false, 'unisex', ARRAY['artistic', 'achievement', 'creative'])
ON CONFLICT DO NOTHING;

-- Education Business Items
INSERT INTO avatar_items (name, description, item_type, category, rarity, base_price, currency_type, level_requirement, credit_score_requirement, is_default, gender, tags) VALUES
  ('Academic Robe', 'Traditional academic robe', 'outfit', 'academic', 'uncommon', 180, 'usd', 4, 690, false, 'unisex', ARRAY['academic', 'formal']),
  ('Professor Glasses', 'Classic professor glasses', 'glasses', 'academic', 'common', 55, 'usd', 2, 560, false, 'unisex', ARRAY['academic', 'professional']),
  ('Teaching Certificate', 'Professional teaching certificate', 'accessory', 'academic', 'uncommon', 140, 'usd', 4, 690, false, 'unisex', ARRAY['academic', 'professional']),
  ('Comfortable Teaching Shoes', 'Comfortable shoes for teaching', 'shoes', 'academic', 'common', 90, 'usd', 2, 560, false, 'unisex', ARRAY['academic', 'footwear']),
  ('Educational Excellence Award', 'Recognition of educational achievement', 'accessory', 'academic', 'rare', 360, 'usd', 6, 730, false, 'unisex', ARRAY['academic', 'achievement'])
ON CONFLICT DO NOTHING;

-- Personal Services Business Items
INSERT INTO avatar_items (name, description, item_type, category, rarity, base_price, currency_type, level_requirement, credit_score_requirement, is_default, gender, tags) VALUES
  ('Spa Uniform', 'Professional spa uniform', 'outfit', 'wellness', 'common', 95, 'usd', 2, 560, false, 'unisex', ARRAY['wellness', 'service', 'spa']),
  ('Spa Slippers', 'Comfortable spa slippers', 'shoes', 'wellness', 'common', 45, 'usd', 1, 520, false, 'unisex', ARRAY['wellness', 'comfortable']),
  ('Aromatherapy Kit', 'Professional aromatherapy kit', 'accessory', 'wellness', 'uncommon', 120, 'usd', 3, 640, false, 'unisex', ARRAY['wellness', 'spa']),
  ('Wellness Bracelet', 'Natural wellness bracelet', 'accessory', 'wellness', 'common', 50, 'usd', 2, 560, false, 'unisex', ARRAY['wellness', 'natural']),
  ('Wellness Excellence Award', 'Recognition of wellness service', 'accessory', 'wellness', 'rare', 350, 'usd', 5, 710, false, 'unisex', ARRAY['wellness', 'achievement'])
ON CONFLICT DO NOTHING;

-- Transportation Business Items
INSERT INTO avatar_items (name, description, item_type, category, rarity, base_price, currency_type, level_requirement, credit_score_requirement, is_default, gender, tags) VALUES
  ('Driver Uniform', 'Professional driver uniform', 'outfit', 'transport', 'common', 85, 'usd', 2, 550, false, 'unisex', ARRAY['transport', 'service']),
  ('Driving Gloves', 'Professional driving gloves', 'accessory', 'transport', 'common', 40, 'usd', 1, 510, false, 'unisex', ARRAY['transport', 'service']),
  ('Professional Cap', 'Driver professional cap', 'hat', 'transport', 'common', 30, 'usd', 1, 510, false, 'unisex', ARRAY['transport', 'service']),
  ('Comfortable Driving Shoes', 'Comfortable shoes for driving', 'shoes', 'transport', 'common', 75, 'usd', 2, 550, false, 'unisex', ARRAY['transport', 'footwear']),
  ('Transport Excellence Award', 'Recognition of transport service', 'accessory', 'transport', 'rare', 330, 'usd', 5, 700, false, 'unisex', ARRAY['transport', 'achievement'])
ON CONFLICT DO NOTHING;

-- Manufacturing Business Items
INSERT INTO avatar_items (name, description, item_type, category, rarity, base_price, currency_type, level_requirement, credit_score_requirement, is_default, gender, tags) VALUES
  ('Industrial Jumpsuit', 'Protective industrial jumpsuit', 'outfit', 'industrial', 'common', 90, 'usd', 2, 550, false, 'unisex', ARRAY['industrial', 'work', 'safety']),
  ('Safety Helmet - Industrial', 'Industrial safety helmet', 'hat', 'industrial', 'common', 55, 'usd', 1, 510, false, 'unisex', ARRAY['industrial', 'safety']),
  ('Safety Goggles', 'Protective safety goggles', 'accessory', 'industrial', 'common', 35, 'usd', 1, 510, false, 'unisex', ARRAY['industrial', 'safety']),
  ('Steel-Toed Work Boots', 'Protective work boots', 'shoes', 'industrial', 'uncommon', 125, 'usd', 2, 550, false, 'unisex', ARRAY['industrial', 'safety', 'footwear']),
  ('Manufacturing Excellence Award', 'Recognition of manufacturing quality', 'accessory', 'industrial', 'rare', 340, 'usd', 5, 710, false, 'unisex', ARRAY['industrial', 'achievement'])
ON CONFLICT DO NOTHING;

-- Agriculture Business Items
INSERT INTO avatar_items (name, description, item_type, category, rarity, base_price, currency_type, level_requirement, credit_score_requirement, is_default, gender, tags) VALUES
  ('Farm Overalls', 'Durable farm overalls', 'outfit', 'outdoor', 'common', 75, 'usd', 1, 510, false, 'unisex', ARRAY['outdoor', 'work', 'agriculture']),
  ('Wide-Brimmed Hat', 'Protective wide-brimmed hat', 'hat', 'outdoor', 'common', 40, 'usd', 1, 510, false, 'unisex', ARRAY['outdoor', 'agriculture']),
  ('Gardening Gloves', 'Protective gardening gloves', 'accessory', 'outdoor', 'common', 25, 'usd', 1, 510, false, 'unisex', ARRAY['outdoor', 'agriculture']),
  ('Mud Boots', 'Protective mud boots', 'shoes', 'outdoor', 'common', 65, 'usd', 1, 510, false, 'unisex', ARRAY['outdoor', 'agriculture', 'footwear']),
  ('Agricultural Excellence Award', 'Recognition of agricultural achievement', 'accessory', 'outdoor', 'rare', 320, 'usd', 5, 700, false, 'unisex', ARRAY['outdoor', 'achievement', 'agriculture'])
ON CONFLICT DO NOTHING;

-- Entertainment Business Items
INSERT INTO avatar_items (name, description, item_type, category, rarity, base_price, currency_type, level_requirement, credit_score_requirement, is_default, gender, tags) VALUES
  ('Performance Outfit', 'Eye-catching performance outfit', 'outfit', 'entertainment', 'uncommon', 190, 'usd', 4, 670, false, 'unisex', ARRAY['entertainment', 'creative']),
  ('Stage Makeup Kit', 'Professional stage makeup kit', 'accessory', 'entertainment', 'common', 70, 'usd', 2, 550, false, 'unisex', ARRAY['entertainment', 'creative']),
  ('Microphone Accessory', 'Stylish microphone accessory', 'accessory', 'entertainment', 'common', 60, 'usd', 2, 550, false, 'unisex', ARRAY['entertainment', 'performance']),
  ('Performance Shoes', 'Professional performance shoes', 'shoes', 'entertainment', 'uncommon', 135, 'usd', 3, 620, false, 'unisex', ARRAY['entertainment', 'footwear', 'performance']),
  ('Entertainment Excellence Award', 'Recognition of entertainment achievement', 'accessory', 'entertainment', 'rare', 370, 'usd', 6, 740, false, 'unisex', ARRAY['entertainment', 'achievement'])
ON CONFLICT DO NOTHING;

-- Hospitality Business Items
INSERT INTO avatar_items (name, description, item_type, category, rarity, base_price, currency_type, level_requirement, credit_score_requirement, is_default, gender, tags) VALUES
  ('Hotel Uniform', 'Professional hotel uniform', 'outfit', 'service', 'common', 100, 'usd', 3, 620, false, 'unisex', ARRAY['service', 'hospitality']),
  ('Name Badge - Premium', 'Premium name badge', 'accessory', 'service', 'common', 35, 'usd', 1, 530, false, 'unisex', ARRAY['service', 'hospitality']),
  ('Service Gloves', 'Professional service gloves', 'accessory', 'service', 'common', 30, 'usd', 1, 530, false, 'unisex', ARRAY['service', 'hospitality']),
  ('Comfortable Service Shoes', 'Comfortable service shoes', 'shoes', 'service', 'common', 80, 'usd', 2, 560, false, 'unisex', ARRAY['service', 'footwear', 'hospitality']),
  ('Hospitality Excellence Award', 'Recognition of hospitality service', 'accessory', 'service', 'rare', 340, 'usd', 5, 720, false, 'unisex', ARRAY['service', 'achievement', 'hospitality'])
ON CONFLICT DO NOTHING;

-- Wellness Business Items
INSERT INTO avatar_items (name, description, item_type, category, rarity, base_price, currency_type, level_requirement, credit_score_requirement, is_default, gender, tags) VALUES
  ('Fitness Trainer Outfit', 'Professional fitness trainer outfit', 'outfit', 'athletic', 'common', 110, 'usd', 3, 630, false, 'unisex', ARRAY['athletic', 'fitness', 'wellness']),
  ('Smart Fitness Watch', 'Advanced fitness tracking watch', 'accessory', 'athletic', 'uncommon', 200, 'usd', 4, 680, false, 'unisex', ARRAY['athletic', 'fitness', 'tech']),
  ('Yoga Mat Bag', 'Stylish yoga mat bag', 'accessory', 'athletic', 'common', 50, 'usd', 2, 560, false, 'unisex', ARRAY['athletic', 'yoga', 'wellness']),
  ('Running Shoes', 'Professional running shoes', 'shoes', 'athletic', 'uncommon', 145, 'usd', 3, 630, false, 'unisex', ARRAY['athletic', 'footwear', 'fitness']),
  ('Wellness Champion Award', 'Recognition of wellness achievement', 'accessory', 'athletic', 'rare', 360, 'usd', 6, 740, false, 'unisex', ARRAY['athletic', 'achievement', 'wellness'])
ON CONFLICT DO NOTHING;

-- Automotive Business Items
INSERT INTO avatar_items (name, description, item_type, category, rarity, base_price, currency_type, level_requirement, credit_score_requirement, is_default, gender, tags) VALUES
  ('Mechanic Coveralls', 'Durable mechanic coveralls', 'outfit', 'automotive', 'common', 95, 'usd', 2, 560, false, 'unisex', ARRAY['automotive', 'work', 'service']),
  ('Mechanic Gloves', 'Protective mechanic gloves', 'accessory', 'automotive', 'common', 35, 'usd', 1, 520, false, 'unisex', ARRAY['automotive', 'service']),
  ('Tool Belt', 'Professional tool belt', 'accessory', 'automotive', 'common', 60, 'usd', 2, 560, false, 'unisex', ARRAY['automotive', 'work']),
  ('Work Boots - Automotive', 'Automotive work boots', 'shoes', 'automotive', 'uncommon', 115, 'usd', 2, 560, false, 'unisex', ARRAY['automotive', 'footwear', 'service']),
  ('Automotive Excellence Award', 'Recognition of automotive service', 'accessory', 'automotive', 'rare', 330, 'usd', 5, 710, false, 'unisex', ARRAY['automotive', 'achievement'])
ON CONFLICT DO NOTHING;

-- Pet Services Business Items
INSERT INTO avatar_items (name, description, item_type, category, rarity, base_price, currency_type, level_requirement, credit_score_requirement, is_default, gender, tags) VALUES
  ('Groomer Apron', 'Professional groomer apron', 'accessory', 'pet', 'common', 55, 'usd', 1, 520, false, 'unisex', ARRAY['pet', 'service']),
  ('Pet Care Uniform', 'Professional pet care uniform', 'outfit', 'pet', 'common', 85, 'usd', 2, 560, false, 'unisex', ARRAY['pet', 'service']),
  ('Grooming Kit', 'Professional grooming kit', 'accessory', 'pet', 'uncommon', 150, 'usd', 3, 640, false, 'unisex', ARRAY['pet', 'service']),
  ('Non-Slip Pet Shoes', 'Comfortable shoes for pet work', 'shoes', 'pet', 'common', 70, 'usd', 2, 560, false, 'unisex', ARRAY['pet', 'footwear', 'service']),
  ('Pet Care Excellence Award', 'Recognition of pet care service', 'accessory', 'pet', 'rare', 320, 'usd', 5, 700, false, 'unisex', ARRAY['pet', 'achievement'])
ON CONFLICT DO NOTHING;

-- E-commerce Business Items
INSERT INTO avatar_items (name, description, item_type, category, rarity, base_price, currency_type, level_requirement, credit_score_requirement, is_default, gender, tags) VALUES
  ('E-commerce Casual', 'Modern e-commerce casual outfit', 'outfit', 'tech', 'common', 85, 'usd', 2, 550, false, 'unisex', ARRAY['tech', 'casual', 'modern']),
  ('Tablet Stand', 'Professional tablet stand', 'accessory', 'tech', 'common', 45, 'usd', 1, 520, false, 'unisex', ARRAY['tech', 'modern']),
  ('Wireless Headphones', 'Professional wireless headphones', 'accessory', 'tech', 'uncommon', 180, 'usd', 3, 640, false, 'unisex', ARRAY['tech', 'modern']),
  ('Modern Sneakers', 'Modern tech-branded sneakers', 'shoes', 'tech', 'common', 95, 'usd', 2, 550, false, 'unisex', ARRAY['tech', 'modern', 'footwear']),
  ('E-commerce Excellence Award', 'Recognition of e-commerce achievement', 'accessory', 'tech', 'rare', 350, 'usd', 5, 720, false, 'unisex', ARRAY['tech', 'achievement', 'modern'])
ON CONFLICT DO NOTHING;

-- Verify the initialization
SELECT 
  category,
  rarity,
  COUNT(*) as item_count,
  AVG(base_price) as avg_price
FROM avatar_items
GROUP BY category, rarity
ORDER BY category, rarity;