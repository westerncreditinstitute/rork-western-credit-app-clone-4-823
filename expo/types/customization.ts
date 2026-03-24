// Customization & Inventory System Types

export interface AvatarItem {
  id: string;
  name: string;
  description?: string;
  item_type: 'outfit' | 'hat' | 'accessory' | 'shoes' | 'glasses' | 'hair' | 'skin' | 'body' | 'special';
  category: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  base_price: number;
  currency_type: 'usd' | 'muso' | 'credits';
  image_url?: string;
  model_url?: string;
  level_requirement: number;
  credit_score_requirement: number;
  is_exclusive: boolean;
  is_limited: boolean;
  is_default: boolean;
  limited_quantity?: number;
  gender?: 'male' | 'female' | 'unisex';
  season?: string;
  tags?: string[];
  is_deleted?: boolean;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BusinessInventory {
  id: string;
  business_id: string;
  item_id: string;
  stock_quantity: number;
  restock_date?: string;
  discount_percentage: number;
  is_available: boolean;
  custom_price?: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  item?: AvatarItem;
  business?: {
    id: string;
    name: string;
    category_id: string;
  };
}

export interface PlayerInventory {
  id: string;
  player_id: string;
  item_id: string;
  purchase_date: string;
  purchase_price?: number;
  purchase_source: 'business' | 'marketplace' | 'reward' | 'gift' | 'achievement';
  business_id?: string;
  is_equipped: boolean;
  times_equipped: number;
  condition_status: 'new' | 'good' | 'fair' | 'poor' | 'damaged';
  wear_percentage: number;
  custom_color?: string;
  custom_pattern?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  item?: AvatarItem;
}

export interface PlayerAvatarConfig {
  player_id: string;
  current_outfit_id?: string;
  current_hat_id?: string;
  current_accessory_id?: string;
  current_shoes_id?: string;
  current_glasses_id?: string;
  current_hair_style?: string;
  current_hair_color?: string;
  current_skin_tone?: string;
  current_body_type?: string;
  avatar_name?: string;
  avatar_gender?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  current_outfit?: PlayerInventory;
  current_hat?: PlayerInventory;
  current_accessory?: PlayerInventory;
  current_shoes?: PlayerInventory;
  current_glasses?: PlayerInventory;
}

export interface MarketplaceListing {
  id: string;
  seller_id: string;
  business_id?: string;
  item_id: string;
  player_inventory_id?: string;
  listing_price: number;
  currency_type: 'usd' | 'muso' | 'credits';
  listing_type: 'player_sale' | 'business_sale' | 'auction';
  auction_end_time?: string;
  is_active: boolean;
  views_count: number;
  watchers_count: number;
  current_bid?: number;
  current_bidder_id?: string;
  minimum_bid_increment?: number;
  buy_it_now_price?: number;
  description?: string;
  created_at: string;
  updated_at: string;
  sold_at?: string;
  buyer_id?: string;
  final_price?: number;
  // Joined fields
  item?: AvatarItem | null;
  seller?: {
    id: string;
    username?: string;
    is_active?: boolean;
    deactivated_at?: string;
  } | null;
  seller_name?: string;
  inventory_item?: PlayerInventory;
  time_remaining?: number; // Calculated for auctions
}

export interface CustomizationTransaction {
  id: string;
  player_id: string;
  transaction_type: 'purchase' | 'sell' | 'equip' | 'unequip' | 'gift' | 'trade' | 'craft' | 'repair';
  item_id?: string;
  source_type?: string;
  source_id?: string;
  amount?: number;
  currency_type?: string;
  quantity: number;
  notes?: string;
  created_at: string;
}

export interface ItemConditionHistory {
  id: string;
  player_inventory_id: string;
  previous_condition: string;
  new_condition: string;
  reason: string;
  timestamp: string;
}

export interface PurchaseResult {
  success: boolean;
  inventory_item?: PlayerInventory;
  error?: string;
  transaction_id?: string;
  remaining_stock?: number;
}

export interface EquipResult {
  success: boolean;
  equipped_items?: PlayerAvatarConfig;
  error?: string;
}

export interface MarketplaceFilter {
  item_type?: string;
  category?: string;
  rarity?: string;
  min_price?: number;
  max_price?: number;
  currency_type?: 'usd' | 'muso' | 'credits';
  seller_id?: string;
  business_id?: string;
  listing_type?: 'player_sale' | 'business_sale' | 'auction';
  search_query?: string;
  is_active?: boolean;
}

export interface AvailableItem {
  item: AvatarItem;
  available_from: {
    businesses: Array<{
      business_id: string;
      business_name: string;
      price: number;
      stock: number;
      distance?: number;
    }>;
    marketplace: Array<{
      listing_id: string;
      seller_name: string;
      price: number;
      condition: string;
      time_remaining?: number;
    }>;
  };
  best_price: number;
  total_availability: number;
  is_available_locally: boolean;
}

export interface AvatarCustomizationUpdate {
  outfit_id?: string;
  hat_id?: string;
  accessory_id?: string;
  shoes_id?: string;
  glasses_id?: string;
  hair_style?: string;
  hair_color?: string;
  skin_tone?: string;
  body_type?: string;
  avatar_name?: string;
  avatar_gender?: string;
}

export interface InventoryStats {
  total_items: number;
  equipped_items: number;
  items_by_type: Record<string, number>;
  items_by_rarity: Record<string, number>;
  total_value: number;
}

export interface WearUpdateResult {
  success: boolean;
  new_condition: string;
  wear_percentage: number;
  repair_cost?: number;
  error?: string;
}

export interface BidResult {
  success: boolean;
  listing_id?: string;
  bid_amount?: number;
  previous_bid?: number;
  previous_bidder_id?: string;
  minimum_bid?: number;
  current_bid?: number;
  message?: string;
  error?: string;
  code?: 'LISTING_NOT_FOUND' | 'LISTING_INACTIVE' | 'NOT_AUCTION' | 'AUCTION_ENDED' | 'SELF_BID' | 'BID_TOO_LOW' | 'ALREADY_HIGHEST' | 'SYSTEM_ERROR';
}

export interface AuctionBidHistory {
  id: string;
  listing_id: string;
  bidder_id: string;
  bid_amount: number;
  previous_bid?: number;
  previous_bidder_id?: string;
  bid_status: 'active' | 'outbid' | 'won' | 'cancelled' | 'refunded';
  created_at: string;
  bidder?: {
    id: string;
    username?: string;
  };
}

export interface AuctionProcessResult {
  success: boolean;
  has_winner?: boolean;
  winner_id?: string;
  final_price?: number;
  inventory_item_id?: string;
  message?: string;
  error?: string;
}

export interface AuctionDetails extends MarketplaceListing {
  bid_history?: AuctionBidHistory[];
  total_bids?: number;
  time_remaining_seconds?: number;
  is_ending_soon?: boolean;
}