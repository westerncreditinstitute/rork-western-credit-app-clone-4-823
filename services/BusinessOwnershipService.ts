import { supabase } from '@/lib/supabase';
import type {
  PhysicalBusiness,
  BusinessPurchaseResult,
  BusinessSaleResult,
  BusinessValuation,
  AvailableBusinessFilter,
  BusinessOwnershipHistory,
  BusinessInitializationConfig,
  City,
  BusinessCategory,
} from '@/types/business-ownership';

export class BusinessOwnershipService {
  /**
   * Initialize city with 20 businesses (one per category)
   */
  async initializeCityBusinesses(config: BusinessInitializationConfig): Promise<void> {
    const { city_id, administrator_id, category_ids, template_ids } = config;

    for (let i = 0; i < category_ids.length; i++) {
      const category_id = category_ids[i];
      const template_id = template_ids[i];

      // Generate unique location ID
      const location_id = `${city_id}_${category_id}_loc_001`;

      // Get category data for pricing
      const { data: category } = await supabase
        .from('business_categories')
        .select('*')
        .eq('id', category_id)
        .single();

      if (!category) {
        console.error(`Category not found: ${category_id}`);
        continue;
      }

      // Calculate listing price based on category
      const listing_price = this.calculateListingPrice(category);

      // Generate business name
      const business_name = this.generateBusinessName(category_id, location_id);

      // Generate address
      const address = this.generateAddress(location_id, category_id);

      // Create business
      const { error } = await supabase.from('physical_businesses').insert({
        city_id,
        category_id,
        template_id: template_id || null,
        location_id,
        address_street: address.street,
        address_city: address.city,
        address_state: address.state,
        address_zip: address.zip,
        latitude: address.latitude,
        longitude: address.longitude,
        name: business_name,
        description: `A ${category.name} business available for purchase`,
        current_owner_id: administrator_id,
        initial_owner_id: administrator_id,
        for_sale: true,
        listing_price,
        purchase_price: null,
        business_status: 'active',
        customer_rating: null,
        total_reviews: 0,
        monthly_revenue: category.avg_monthly_revenue || 0,
        monthly_expenses: 0,
        employee_count: 0,
      });

      if (error) {
        console.error(`Failed to create business for category ${category_id}:`, error);
      }
    }
  }

  /**
   * Purchase a business
   */
  async purchaseBusiness(
    playerId: string,
    businessId: string,
    purchasePrice: number
  ): Promise<BusinessPurchaseResult> {
    try {
      // Get business details
      const { data: business, error: businessError } = await supabase
        .from('physical_businesses')
        .select('*')
        .eq('id', businessId)
        .single();

      if (businessError || !business) {
        return { success: false, error: 'Business not found' };
      }

      // Validate business is for sale
      if (!business.for_sale) {
        return { success: false, error: 'Business is not for sale' };
      }

      // Validate purchase price
      const expectedPrice = business.listing_price || business.purchase_price;
      if (Math.abs(purchasePrice - expectedPrice) > 100) {
        return { success: false, error: 'Invalid purchase price' };
      }

      // TODO: Validate player has sufficient funds
      // TODO: Validate player credit score

      // Update business ownership
      const { error: updateError } = await supabase
        .from('physical_businesses')
        .update({
          current_owner_id: playerId,
          for_sale: false,
          purchase_price: purchasePrice,
          updated_at: new Date().toISOString(),
        })
        .eq('id', businessId);

      if (updateError) {
        return { success: false, error: 'Failed to update business ownership' };
      }

      // Create ownership history record
      const { error: historyError } = await supabase
        .from('business_ownership_history')
        .insert({
          business_id: businessId,
          previous_owner_id: business.current_owner_id,
          new_owner_id: playerId,
          transfer_date: new Date().toISOString(),
          transfer_price: purchasePrice,
          transfer_type: 'purchase',
          notes: 'Initial purchase from administrator',
        });

      if (historyError) {
        console.error('Failed to create ownership history:', historyError);
      }

      // Get updated business
      const { data: updatedBusiness } = await supabase
        .from('physical_businesses')
        .select('*, city(*), category(*)')
        .eq('id', businessId)
        .single();

      return {
        success: true,
        business: updatedBusiness,
        transaction_id: historyError ? undefined : 'tx_' + Date.now(),
      };
    } catch (error) {
      console.error('Error purchasing business:', error);
      return { success: false, error: 'An error occurred while purchasing the business' };
    }
  }

  /**
   * List business for sale
   */
  async sellBusiness(
    playerId: string,
    businessId: string,
    listingPrice: number
  ): Promise<BusinessSaleResult> {
    try {
      // Validate ownership
      const { data: business, error: businessError } = await supabase
        .from('physical_businesses')
        .select('*')
        .eq('id', businessId)
        .eq('current_owner_id', playerId)
        .single();

      if (businessError || !business) {
        return { success: false, error: 'Business not found or not owned by player' };
      }

      // Update business listing
      const { error: updateError } = await supabase
        .from('physical_businesses')
        .update({
          for_sale: true,
          listing_price: listingPrice,
          updated_at: new Date().toISOString(),
        })
        .eq('id', businessId);

      if (updateError) {
        return { success: false, error: 'Failed to list business for sale' };
      }

      return {
        success: true,
        listing_id: businessId,
      };
    } catch (error) {
      console.error('Error listing business for sale:', error);
      return { success: false, error: 'An error occurred while listing the business' };
    }
  }

  /**
   * Get available businesses for purchase
   */
  async getAvailableBusinesses(filter: AvailableBusinessFilter): Promise<PhysicalBusiness[]> {
    try {
      let query = supabase
        .from('physical_businesses')
        .select('*, city(*), category(*)')
        .eq('for_sale', true)
        .eq('business_status', 'active');

      if (filter.city_id) {
        query = query.eq('city_id', filter.city_id);
      }

      if (filter.category_id) {
        query = query.eq('category_id', filter.category_id);
      }

      if (filter.min_price) {
        query = query.gte('listing_price', filter.min_price);
      }

      if (filter.max_price) {
        query = query.lte('listing_price', filter.max_price);
      }

      if (filter.search_query) {
        query = query.or(`name.ilike.%${filter.search_query}%,description.ilike.%${filter.search_query}%`);
      }

      const { data, error } = await query.order('listing_price', { ascending: true });

      if (error) {
        console.error('Error fetching available businesses:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching available businesses:', error);
      return [];
    }
  }

  /**
   * Get player-owned businesses
   */
  async getPlayerOwnedBusinesses(playerId: string): Promise<PhysicalBusiness[]> {
    try {
      const { data, error } = await supabase
        .from('physical_businesses')
        .select('*, city(*), category(*)')
        .eq('current_owner_id', playerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching player businesses:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching player businesses:', error);
      return [];
    }
  }

  /**
   * Get business ownership history
   */
  async getBusinessOwnershipHistory(businessId: string): Promise<BusinessOwnershipHistory[]> {
    try {
      const { data, error } = await supabase
        .from('business_ownership_history')
        .select('*')
        .eq('business_id', businessId)
        .order('transfer_date', { ascending: false });

      if (error) {
        console.error('Error fetching ownership history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching ownership history:', error);
      return [];
    }
  }

  /**
   * Calculate business valuation
   */
  async calculateBusinessValuation(businessId: string): Promise<BusinessValuation | null> {
    try {
      const { data: business, error } = await supabase
        .from('physical_businesses')
        .select('*')
        .eq('id', businessId)
        .single();

      if (error || !business) {
        return null;
      }

      // Simple valuation based on revenue multiple
      const revenueMultiple = 2.5;
      const currentValue = business.monthly_revenue * 12 * revenueMultiple;
      const purchasePrice = business.purchase_price || 0;
      const appreciation = currentValue - purchasePrice;
      const appreciationPercentage = purchasePrice > 0 ? (appreciation / purchasePrice) * 100 : 0;

      return {
        business_id: businessId,
        current_value: currentValue,
        purchase_price: purchasePrice,
        appreciation,
        appreciation_percentage: appreciationPercentage,
        valuation_factors: {
          revenue_trend: 1.0,
          customer_satisfaction: business.customer_rating ? business.customer_rating / 5 : 0.8,
          location_quality: 1.0,
          market_conditions: 1.0,
        },
      };
    } catch (error) {
      console.error('Error calculating business valuation:', error);
      return null;
    }
  }

  /**
   * Get all cities
   */
  async getCities(): Promise<City[]> {
    try {
      const { data, error } = await supabase
        .from('cities')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching cities:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching cities:', error);
      return [];
    }
  }

  /**
   * Get all business categories
   */
  async getBusinessCategories(): Promise<BusinessCategory[]> {
    try {
      const { data, error } = await supabase
        .from('business_categories')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching business categories:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching business categories:', error);
      return [];
    }
  }

  /**
   * Helper: Calculate listing price based on category
   */
  private calculateListingPrice(category: BusinessCategory): number {
    const baseCost = category.min_startup_cost || 50000;
    const multiplier = 1.5; // Premium for existing business
    return Math.round(baseCost * multiplier);
  }

  /**
   * Helper: Generate business name
   */
  private generateBusinessName(categoryId: string, locationId: string): string {
    const prefixes = ['Premium', 'Elite', 'Grand', 'Metro', 'City', 'Prime'];
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const categoryNames: Record<string, string> = {
      cat_real_estate: 'Real Estate',
      cat_retail: 'Retail',
      cat_medical: 'Medical Center',
      cat_financial: 'Financial Services',
      cat_restaurant: 'Restaurant',
      cat_tech_startup: 'Tech Hub',
      cat_professional: 'Professional Services',
      cat_construction: 'Construction',
      cat_creative: 'Creative Studio',
      cat_education: 'Education Center',
      cat_personal_services: 'Personal Services',
      cat_transportation: 'Transportation',
      cat_manufacturing: 'Manufacturing',
      cat_agriculture: 'Agricultural Business',
      cat_entertainment: 'Entertainment Venue',
      cat_hospitality: 'Hospitality',
      cat_wellness: 'Wellness Center',
      cat_automotive: 'Automotive Services',
      cat_pet_services: 'Pet Services',
      cat_ecommerce: 'E-Commerce Store',
    };

    const categoryName = categoryNames[categoryId] || 'Business';
    return `${randomPrefix} ${categoryName}`;
  }

  /**
   * Helper: Generate address
   */
  private generateAddress(locationId: string, categoryId: string): any {
    const streetNumbers = Math.floor(Math.random() * 9999) + 1;
    const streetNames = [
      'Main Street', 'Oak Avenue', 'Pine Street', 'Elm Boulevard',
      'Maple Drive', 'Cedar Lane', 'Washington Avenue', 'Jefferson Street',
    ];
    const randomStreet = streetNames[Math.floor(Math.random() * streetNames.length)];
    const zipCode = Math.floor(Math.random() * 89999) + 10000;

    return {
      street: `${streetNumbers} ${randomStreet}`,
      city: 'Los Angeles', // Default, would be dynamic based on city
      state: 'CA',
      zip: zipCode.toString(),
      latitude: 34.0522 + (Math.random() - 0.5) * 0.1,
      longitude: -118.2437 + (Math.random() - 0.5) * 0.1,
    };
  }
}

export const businessOwnershipService = new BusinessOwnershipService();