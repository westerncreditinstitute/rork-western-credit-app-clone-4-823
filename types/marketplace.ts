export type CurrencyType = 'credits' | 'muso' | 'usd';
export type ListingType = 'player_sale' | 'business_sale' | 'auction';
export type ListingStatus = 'active' | 'sold' | 'expired' | 'cancelled';

export interface AvatarItem {
  id: string;
  name: string;
  description: string;
  category: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  image_url: string;
  base_price: number;
  attributes: Record<string, string | number | boolean>;
  is_tradeable: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlayerInventory {
  id: string;
  player_id: string;
  item_id: string;
  quantity: number;
  acquired_at: string;
  acquired_from: 'purchase' | 'reward' | 'trade' | 'gift' | 'business';
  is_equipped: boolean;
  item?: AvatarItem;
  created_at: string;
  updated_at: string;
}

export interface MarketplaceListing {
  id: string;
  seller_id: string;
  seller_name?: string;
  seller_avatar?: string;
  player_inventory_id: string;
  business_id?: string;
  item_id: string;
  item?: AvatarItem;
  listing_type: ListingType;
  listing_price: number;
  currency_type: CurrencyType;
  quantity: number;
  current_bid?: number;
  current_bidder_id?: string;
  min_bid_increment: number;
  auction_start_time?: string;
  auction_end_time?: string;
  is_active: boolean;
  status: ListingStatus;
  buyer_id?: string;
  final_price?: number;
  sold_at?: string;
  views_count: number;
  favorites_count: number;
  created_at: string;
  updated_at: string;
}

export interface MarketplaceBid {
  id: string;
  listing_id: string;
  bidder_id: string;
  bidder_name?: string;
  bid_amount: number;
  is_winning: boolean;
  is_refunded: boolean;
  created_at: string;
}

export interface MarketplaceTransaction {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  item_id: string;
  quantity: number;
  transaction_type: 'purchase' | 'auction_win';
  amount: number;
  currency_type: CurrencyType;
  platform_fee: number;
  seller_payout: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  created_at: string;
  completed_at?: string;
}

export interface MarketplaceFilter {
  category?: string;
  min_price?: number;
  max_price?: number;
  currency_type?: CurrencyType;
  listing_type?: ListingType;
  rarity?: AvatarItem['rarity'];
  search_query?: string;
  seller_id?: string;
  sort_by?: 'price_asc' | 'price_desc' | 'newest' | 'ending_soon' | 'most_viewed';
  page?: number;
  limit?: number;
}

export interface PurchaseResult {
  success: boolean;
  error?: string;
  transaction_id?: string;
  listing?: MarketplaceListing;
}

export interface BidResult {
  success: boolean;
  error?: string;
  bid_id?: string;
  current_bid?: number;
  is_winning?: boolean;
}

export interface PlayerWallet {
  id: string;
  player_id: string;
  credits_balance: number;
  muso_balance: number;
  usd_balance: number;
  total_spent: number;
  total_earned: number;
  created_at: string;
  updated_at: string;
}
