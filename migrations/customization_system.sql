-- Customization & Inventory System Migration
-- Part 2: Avatar Items, Inventory, and Marketplace

-- Avatar customization items
CREATE TABLE IF NOT EXISTS avatar_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('outfit', 'hat', 'accessory', 'shoes', 'glasses', 'hair', 'skin', 'body', 'special')),
  category VARCHAR(50) NOT NULL, -- casual, formal, athletic, business, etc.
  rarity VARCHAR(20) DEFAULT 'common' CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  base_price DECIMAL(12,2) NOT NULL,
  currency_type VARCHAR(20) DEFAULT 'usd' CHECK (currency_type IN ('usd', 'muso', 'credits')),
  image_url TEXT,
  model_url TEXT, -- 3D model URL
  level_requirement INTEGER DEFAULT 0,
  credit_score_requirement INTEGER DEFAULT 0,
  is_exclusive BOOLEAN DEFAULT FALSE,
  is_limited BOOLEAN DEFAULT FALSE,
  is_default BOOLEAN DEFAULT FALSE,
  limited_quantity INTEGER,
  gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'unisex')),
  season VARCHAR(50), -- seasonal items
  tags TEXT[], -- flexible tagging system
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Business inventory (what items businesses sell)
CREATE TABLE IF NOT EXISTS business_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES physical_businesses(id) ON DELETE CASCADE,
  item_id UUID REFERENCES avatar_items(id) ON DELETE CASCADE,
  stock_quantity INTEGER DEFAULT 100,
  restock_date TIMESTAMP WITH TIME ZONE,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  is_available BOOLEAN DEFAULT TRUE,
  custom_price DECIMAL(12,2), -- Override base price
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(business_id, item_id)
);

-- Player inventory (what players own)
CREATE TABLE IF NOT EXISTS player_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id UUID REFERENCES avatar_items(id) ON DELETE CASCADE,
  purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  purchase_price DECIMAL(12,2),
  purchase_source VARCHAR(50) CHECK (purchase_source IN ('business', 'marketplace', 'reward', 'gift', 'achievement')),
  business_id UUID REFERENCES physical_businesses(id),
  is_equipped BOOLEAN DEFAULT FALSE,
  times_equipped INTEGER DEFAULT 0,
  condition_status VARCHAR(20) DEFAULT 'new' CHECK (condition_status IN ('new', 'good', 'fair', 'poor', 'damaged')),
  wear_percentage DECIMAL(5,2) DEFAULT 0,
  custom_color VARCHAR(20), -- For customizable items
  custom_pattern VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Player current avatar configuration
CREATE TABLE IF NOT EXISTS player_avatar_config (
  player_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_outfit_id UUID REFERENCES player_inventory(id),
  current_hat_id UUID REFERENCES player_inventory(id),
  current_accessory_id UUID REFERENCES player_inventory(id),
  current_shoes_id UUID REFERENCES player_inventory(id),
  current_glasses_id UUID REFERENCES player_inventory(id),
  current_hair_style VARCHAR(50),
  current_hair_color VARCHAR(20),
  current_skin_tone VARCHAR(50),
  current_body_type VARCHAR(50),
  avatar_name VARCHAR(100),
  avatar_gender VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Marketplace listings (player-to-player or business-to-player)
CREATE TABLE IF NOT EXISTS avatar_marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES physical_businesses(id),
  item_id UUID REFERENCES avatar_items(id),
  player_inventory_id UUID REFERENCES player_inventory(id) ON DELETE CASCADE,
  listing_price DECIMAL(12,2) NOT NULL,
  currency_type VARCHAR(20) DEFAULT 'usd' CHECK (currency_type IN ('usd', 'muso', 'credits')),
  listing_type VARCHAR(20) CHECK (listing_type IN ('player_sale', 'business_sale', 'auction')),
  auction_end_time TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  views_count INTEGER DEFAULT 0,
  watchers_count INTEGER DEFAULT 0,
  current_bid DECIMAL(12,2),
  current_bidder_id UUID REFERENCES auth.users(id),
  minimum_bid_increment DECIMAL(12,2) DEFAULT 0,
  buy_it_now_price DECIMAL(12,2),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sold_at TIMESTAMP WITH TIME ZONE,
  buyer_id UUID REFERENCES auth.users(id),
  final_price DECIMAL(12,2)
);

-- Transaction history for customization purchases
CREATE TABLE IF NOT EXISTS customization_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type VARCHAR(30) NOT NULL CHECK (transaction_type IN ('purchase', 'sell', 'equip', 'unequip', 'gift', 'trade', 'craft', 'repair')),
  item_id UUID REFERENCES avatar_items(id),
  source_type VARCHAR(50), -- 'business', 'marketplace', 'reward', 'craft'
  source_id UUID,
  amount DECIMAL(12,2),
  currency_type VARCHAR(20),
  quantity INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Item conditions history (for wear tracking)
CREATE TABLE IF NOT EXISTS item_condition_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_inventory_id UUID REFERENCES player_inventory(id) ON DELETE CASCADE,
  previous_condition VARCHAR(20),
  new_condition VARCHAR(20),
  reason VARCHAR(100), -- 'wear', 'repair', 'damage'
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_player_inventory_player ON player_inventory(player_id);
CREATE INDEX IF NOT EXISTS idx_player_inventory_item ON player_inventory(item_id);
CREATE INDEX IF NOT EXISTS idx_player_inventory_equipped ON player_inventory(is_equipped) WHERE is_equipped = TRUE;
CREATE INDEX IF NOT EXISTS idx_business_inventory_business ON business_inventory(business_id);
CREATE INDEX IF NOT EXISTS idx_business_inventory_item ON business_inventory(item_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_active ON avatar_marketplace_listings(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_marketplace_item ON avatar_marketplace_listings(item_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_seller ON avatar_marketplace_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_business ON avatar_marketplace_listings(business_id);
CREATE INDEX IF NOT EXISTS idx_avatar_items_type ON avatar_items(item_type);
CREATE INDEX IF NOT EXISTS idx_avatar_items_rarity ON avatar_items(rarity);
CREATE INDEX IF NOT EXISTS idx_avatar_items_category ON avatar_items(category);
CREATE INDEX IF NOT EXISTS idx_customization_transactions_player ON customization_transactions(player_id);
CREATE INDEX IF NOT EXISTS idx_customization_transactions_item ON customization_transactions(item_id);

-- Row Level Security Policies
ALTER TABLE avatar_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_avatar_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE avatar_marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE customization_transactions ENABLE ROW LEVEL SECURITY;

-- Avatar items RLS policies
CREATE POLICY "Avatar items are viewable by everyone" ON avatar_items
  FOR SELECT USING (true);

-- Business inventory RLS policies
CREATE POLICY "Business inventory is viewable by everyone" ON business_inventory
  FOR SELECT USING (true);

-- Player inventory RLS policies
CREATE POLICY "Players can view their own inventory" ON player_inventory
  FOR SELECT USING (auth.uid() = player_id);

CREATE POLICY "Players can insert into their own inventory" ON player_inventory
  FOR INSERT WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Players can update their own inventory" ON player_inventory
  FOR UPDATE USING (auth.uid() = player_id);

-- Player avatar config RLS policies
CREATE POLICY "Players can view their own avatar config" ON player_avatar_config
  FOR SELECT USING (auth.uid() = player_id);

CREATE POLICY "Players can update their own avatar config" ON player_avatar_config
  FOR UPDATE USING (auth.uid() = player_id);

CREATE POLICY "Players can insert their own avatar config" ON player_avatar_config
  FOR INSERT WITH CHECK (auth.uid() = player_id);

-- Marketplace RLS policies
CREATE POLICY "Marketplace listings are viewable by everyone" ON avatar_marketplace_listings
  FOR SELECT USING (true);

CREATE POLICY "Users can create listings" ON avatar_marketplace_listings
  FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Users can update their own listings" ON avatar_marketplace_listings
  FOR UPDATE USING (auth.uid() = seller_id);

-- Customization transactions RLS policies
CREATE POLICY "Users can view their own transactions" ON customization_transactions
  FOR SELECT USING (auth.uid() = player_id);

-- Triggers for updated_at
CREATE TRIGGER update_avatar_items_updated_at BEFORE UPDATE ON avatar_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_inventory_updated_at BEFORE UPDATE ON business_inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_inventory_updated_at BEFORE UPDATE ON player_inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_avatar_config_updated_at BEFORE UPDATE ON player_avatar_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketplace_listings_updated_at BEFORE UPDATE ON avatar_marketplace_listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update avatar config when item is equipped
CREATE OR REPLACE FUNCTION update_avatar_config_on_equip()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if the item is being equipped or unequipped
  -- Check INSERT (no OLD) or UPDATE (has OLD)
  IF (TG_OP = 'INSERT' AND NEW.is_equipped = TRUE) OR
     (TG_OP = 'UPDATE' AND (NEW.is_equipped = TRUE OR OLD.is_equipped = TRUE)) THEN
    
    -- Update the appropriate field in avatar config based on item type
    IF NEW.is_equipped = TRUE THEN
      UPDATE player_avatar_config
      SET 
        current_outfit_id = CASE 
          WHEN (SELECT item_type FROM avatar_items WHERE id = NEW.item_id) = 'outfit' THEN NEW.id
          ELSE current_outfit_id 
        END,
        current_hat_id = CASE 
          WHEN (SELECT item_type FROM avatar_items WHERE id = NEW.item_id) = 'hat' THEN NEW.id
          ELSE current_hat_id 
        END,
        current_accessory_id = CASE 
          WHEN (SELECT item_type FROM avatar_items WHERE id = NEW.item_id) = 'accessory' THEN NEW.id
          ELSE current_accessory_id 
        END,
        current_shoes_id = CASE 
          WHEN (SELECT item_type FROM avatar_items WHERE id = NEW.item_id) = 'shoes' THEN NEW.id
          ELSE current_shoes_id 
        END,
        current_glasses_id = CASE 
          WHEN (SELECT item_type FROM avatar_items WHERE id = NEW.item_id) = 'glasses' THEN NEW.id
          ELSE current_glasses_id 
        END,
        updated_at = NOW()
      WHERE player_id = NEW.player_id;
    ELSE
      -- Item was unequipped - clear the specific field
      UPDATE player_avatar_config
      SET 
        current_outfit_id = CASE 
          WHEN (SELECT item_type FROM avatar_items WHERE id = OLD.item_id) = 'outfit' THEN NULL
          ELSE current_outfit_id 
        END,
        current_hat_id = CASE 
          WHEN (SELECT item_type FROM avatar_items WHERE id = OLD.item_id) = 'hat' THEN NULL
          ELSE current_hat_id 
        END,
        current_accessory_id = CASE 
          WHEN (SELECT item_type FROM avatar_items WHERE id = OLD.item_id) = 'accessory' THEN NULL
          ELSE current_accessory_id 
        END,
        current_shoes_id = CASE 
          WHEN (SELECT item_type FROM avatar_items WHERE id = OLD.item_id) = 'shoes' THEN NULL
          ELSE current_shoes_id 
        END,
        current_glasses_id = CASE 
          WHEN (SELECT item_type FROM avatar_items WHERE id = OLD.item_id) = 'glasses' THEN NULL
          ELSE current_glasses_id 
        END,
        updated_at = NOW()
      WHERE player_id = OLD.player_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_avatar_config_on_equip
  AFTER INSERT OR UPDATE ON player_inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_avatar_config_on_equip();

-- Comments for documentation
COMMENT ON TABLE avatar_items IS 'Catalog of all avatar customization items';
COMMENT ON TABLE business_inventory IS 'Items available for purchase at each business';
COMMENT ON TABLE player_inventory IS 'Items owned by players';
COMMENT ON TABLE player_avatar_config IS 'Current avatar configuration for each player';
COMMENT ON TABLE avatar_marketplace_listings IS 'Marketplace for trading items';
COMMENT ON TABLE customization_transactions IS 'History of all customization-related transactions';