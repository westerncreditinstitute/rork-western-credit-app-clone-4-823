// Business Ownership System Types

export interface City {
  id: string;
  name: string;
  state: string;
  country: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  updated_at: string;
}

export interface BusinessCategory {
  id: string;
  name: string;
  description?: string;
  category_type: string;
  is_featured: boolean;
  min_startup_cost?: number;
  max_startup_cost?: number;
  avg_monthly_revenue?: number;
  risk_level: 'low' | 'medium' | 'high' | 'very_high';
  min_credit_score?: number;
  time_to_profitability_months?: number;
  failure_rate?: number;
  required_education_id?: string;
  min_experience_level?: number;
  created_at: string;
  updated_at: string;
}

export interface BusinessTemplate {
  id: string;
  category_id: string;
  name: string;
  description?: string;
  default_revenue?: number;
  default_expenses?: number;
  employee_capacity?: number;
  square_footage?: number;
  created_at: string;
  updated_at: string;
}

export interface PhysicalBusiness {
  id: string;
  city_id: string;
  category_id: string;
  template_id?: string;
  location_id: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip?: string;
  latitude?: number;
  longitude?: number;
  name: string;
  description?: string;
  current_owner_id?: string;
  initial_owner_id?: string;
  for_sale: boolean;
  listing_price?: number;
  purchase_price?: number;
  business_status: 'active' | 'inactive' | 'closed' | 'renovation';
  customer_rating?: number;
  total_reviews: number;
  monthly_revenue: number;
  monthly_expenses: number;
  employee_count: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  city?: City;
  category?: BusinessCategory;
  template?: BusinessTemplate;
  current_owner_name?: string;
}

export interface BusinessOwnershipHistory {
  id: string;
  business_id: string;
  previous_owner_id?: string;
  new_owner_id?: string;
  transfer_date: string;
  transfer_price?: number;
  transfer_type: 'purchase' | 'inheritance' | 'auction' | 'admin_transfer';
  notes?: string;
}

export interface BusinessPurchaseResult {
  success: boolean;
  business?: PhysicalBusiness;
  error?: string;
  transaction_id?: string;
}

export interface BusinessSaleResult {
  success: boolean;
  listing_id?: string;
  error?: string;
}

export interface BusinessValuation {
  business_id: string;
  current_value: number;
  purchase_price: number;
  appreciation: number;
  appreciation_percentage: number;
  valuation_factors: {
    revenue_trend: number;
    customer_satisfaction: number;
    location_quality: number;
    market_conditions: number;
  };
}

export interface AvailableBusinessFilter {
  city_id?: string;
  category_id?: string;
  min_price?: number;
  max_price?: number;
  min_credit_score?: number;
  risk_level?: 'low' | 'medium' | 'high' | 'very_high';
  search_query?: string;
  for_sale_only?: boolean;
}

export interface BusinessInitializationConfig {
  city_id: string;
  administrator_id: string;
  category_ids: string[];
  template_ids: string[];
}

export interface BusinessLocation {
  location_id: string;
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  neighborhood?: string;
  distance_miles?: number;
}