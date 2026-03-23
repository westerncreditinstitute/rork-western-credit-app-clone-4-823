import { supabase } from '@/lib/supabase';
import { businessOwnershipService } from './BusinessOwnershipService';
import type { BusinessInitializationConfig } from '@/types/business-ownership';

export class BusinessInitializationService {
  /**
   * Initialize all cities with businesses
   */
  async initializeAllCities(): Promise<void> {
    console.log('Starting city business initialization...');

    // Get all cities
    const cities = await businessOwnershipService.getCities();
    console.log(`Found ${cities.length} cities`);

    // Get all business categories
    const categories = await businessOwnershipService.getBusinessCategories();
    console.log(`Found ${categories.length} business categories`);

    // Get system administrator user
    const adminId = await this.getSystemAdministratorId();
    if (!adminId) {
      console.error('System administrator not found');
      return;
    }

    // Initialize each city
    for (const city of cities) {
      console.log(`\nInitializing city: ${city.name}`);

      // Check if city already has businesses
      const existingBusinesses = await this.getCityBusinessCount(city.id);
      if (existingBusinesses > 0) {
        console.log(`  City already has ${existingBusinesses} businesses, skipping`);
        continue;
      }

      // Create business templates if they don't exist
      const templateIds = await this.createBusinessTemplates(categories);

      // Initialize businesses for this city
      const config: BusinessInitializationConfig = {
        city_id: city.id,
        administrator_id: adminId,
        category_ids: categories.map((c) => c.id),
        template_ids: templateIds,
      };

      await businessOwnershipService.initializeCityBusinesses(config);

      // Verify initialization
      const businessCount = await this.getCityBusinessCount(city.id);
      console.log(`  Created ${businessCount} businesses for ${city.name}`);
    }

    console.log('\nCity business initialization complete');
  }

  /**
   * Get system administrator user ID
   */
  private async getSystemAdministratorId(): Promise<string | null> {
    try {
      // First try to get the current authenticated user as admin
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        console.log(`Using authenticated user ${user.id} as administrator`);
        return user.id;
      }

      // Try to find admin user from profiles table
      const { data: adminProfile, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .single();

      if (!error && adminProfile) {
        console.log(`Found admin profile: ${adminProfile.id}`);
        return adminProfile.id;
      }

      // Fallback to system administrator placeholder
      console.log('No admin found, using system administrator placeholder');
      return this.createSystemAdministrator();
    } catch (error) {
      console.error('Error getting system administrator:', error);
      return this.createSystemAdministrator();
    }
  }

  /**
   * Create system administrator user
   */
  private async createSystemAdministrator(): Promise<string | null> {
    try {
      // This would typically be done through admin panel
      // For now, we'll use a placeholder approach
      console.log('Creating system administrator placeholder');
      return 'system-admin-id';
    } catch (error) {
      console.error('Error creating system administrator:', error);
      return null;
    }
  }

  /**
   * Create business templates for each category
   */
  private async createBusinessTemplates(
    categories: any[]
  ): Promise<string[]> {
    const templateIds: string[] = [];

    for (const category of categories) {
      // Check if template already exists
      const { data: existingTemplate } = await supabase
        .from('business_templates')
        .select('id')
        .eq('category_id', category.id)
        .single();

      if (existingTemplate) {
        templateIds.push(existingTemplate.id);
        continue;
      }

      // Create new template
      const templateName = this.generateTemplateName(category);
      const { data: template, error } = await supabase
        .from('business_templates')
        .insert({
          category_id: category.id,
          name: templateName,
          description: `Standard ${category.name} business template`,
          default_revenue: category.avg_monthly_revenue || 0,
          default_expenses: this.calculateDefaultExpenses(category),
          employee_capacity: this.calculateEmployeeCapacity(category),
          square_footage: this.calculateSquareFootage(category),
        })
        .select('id')
        .single();

      if (error) {
        console.error(`Error creating template for ${category.name}:`, error);
        templateIds.push('');
      } else {
        templateIds.push(template.id);
      }
    }

    return templateIds;
  }

  /**
   * Get business count for a city
   */
  private async getCityBusinessCount(cityId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('physical_businesses')
        .select('*', { count: 'exact', head: true })
        .eq('city_id', cityId);

      if (error) {
        console.error('Error counting city businesses:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error counting city businesses:', error);
      return 0;
    }
  }

  /**
   * Generate template name
   */
  private generateTemplateName(category: any): string {
    return `${category.name} - Standard Template`;
  }

  /**
   * Calculate default expenses
   */
  private calculateDefaultExpenses(category: any): number {
    // Expenses are typically 60-80% of revenue
    const revenue = category.avg_monthly_revenue || 0;
    return Math.round(revenue * 0.7);
  }

  /**
   * Calculate employee capacity
   */
  private calculateEmployeeCapacity(category: any): number {
    const revenue = category.avg_monthly_revenue || 0;

    // Simple heuristic: 1 employee per $5,000 of revenue
    return Math.max(1, Math.floor(revenue / 5000));
  }

  /**
   * Calculate square footage
   */
  private calculateSquareFootage(category: any): number {
    const revenue = category.avg_monthly_revenue || 0;

    // Simple heuristic: 100 sq ft per $1,000 of revenue
    return Math.max(500, revenue * 100);
  }

  /**
   * Populate business inventory with default items
   */
  async populateBusinessInventory(): Promise<void> {
    console.log('Populating business inventory...');

    // Get all businesses
    const { data: businesses, error: businessesError } = await supabase
      .from('physical_businesses')
      .select('id, category_id')
      .eq('for_sale', true);

    if (businessesError || !businesses) {
      console.error('Error fetching businesses:', businessesError);
      return;
    }

    console.log(`Found ${businesses.length} businesses to populate`);

    // Get all avatar items
    const { data: items, error: itemsError } = await supabase
      .from('avatar_items')
      .select('*');

    if (itemsError || !items) {
      console.error('Error fetching items:', itemsError);
      return;
    }

    console.log(`Found ${items.length} items to distribute`);

    // Populate each business with relevant items
    for (const business of businesses) {
      const relevantItems = this.getRelevantItemsForCategory(
        items,
        business.category_id
      );

      console.log(
        `Populating business ${business.id} with ${relevantItems.length} items`
      );

      for (const item of relevantItems) {
        // Check if item already exists in business inventory
        const { data: existingInventory } = await supabase
          .from('business_inventory')
          .select('id')
          .eq('business_id', business.id)
          .eq('item_id', item.id)
          .single();

        if (existingInventory) {
          continue;
        }

        // Add item to business inventory
        await supabase.from('business_inventory').insert({
          business_id: business.id,
          item_id: item.id,
          stock_quantity: Math.floor(Math.random() * 50) + 10, // 10-60 items
          discount_percentage: 0,
          is_available: true,
        });
      }
    }

    console.log('Business inventory population complete');
  }

  /**
   * Get relevant items for a business category
   */
  private getRelevantItemsForCategory(items: any[], categoryId: string): any[] {
    // Map category to item categories
    const categoryItemMap: Record<string, string[]> = {
      cat_real_estate: ['business', 'formal'],
      cat_retail: ['casual', 'everyday'],
      cat_medical: ['medical', 'professional'],
      cat_financial: ['business', 'formal', 'luxury'],
      cat_restaurant: ['food', 'service'],
      cat_tech_startup: ['tech', 'casual'],
      cat_professional: ['business', 'formal'],
      cat_construction: ['work', 'safety'],
      cat_creative: ['artistic', 'creative'],
      cat_education: ['academic', 'formal'],
      cat_personal_services: ['spa', 'wellness'],
      cat_transportation: ['service', 'work'],
      cat_manufacturing: ['work', 'industrial'],
      cat_agriculture: ['outdoor', 'work'],
      cat_entertainment: ['entertainment', 'party'],
      cat_hospitality: ['service', 'formal'],
      cat_wellness: ['fitness', 'athletic'],
      cat_automotive: ['work', 'automotive'],
      cat_pet_services: ['pet', 'casual'],
      cat_ecommerce: ['tech', 'casual'],
    };

    const relevantCategories = categoryItemMap[categoryId] || ['casual'];

    return items.filter((item) => {
      return (
        relevantCategories.includes(item.category) ||
        relevantCategories.some((cat) => item.tags?.includes(cat))
      );
    });
  }

  /**
   * Initialize default avatar items catalog
   */
  async initializeAvatarItems(): Promise<void> {
    console.log('Initializing avatar items catalog...');

    // This would typically load from a JSON file or database
    // For now, we'll create a basic set of items

    const defaultItems = this.getDefaultAvatarItems();

    for (const item of defaultItems) {
      // Check if item already exists
      const { data: existingItem } = await supabase
        .from('avatar_items')
        .select('id')
        .eq('name', item.name)
        .single();

      if (existingItem) {
        continue;
      }

      // Insert item
      const { error } = await supabase.from('avatar_items').insert(item);

      if (error) {
        console.error(`Error inserting item ${item.name}:`, error);
      }
    }

    console.log(`Initialized ${defaultItems.length} avatar items`);
  }

  /**
   * Get default avatar items
   */
  private getDefaultAvatarItems(): any[] {
    // This would be expanded with actual item data
    return [
      {
        name: 'Default Casual Outfit',
        description: 'A comfortable casual outfit for everyday wear',
        item_type: 'outfit',
        category: 'casual',
        rarity: 'common',
        base_price: 50,
        currency_type: 'usd',
        level_requirement: 0,
        credit_score_requirement: 0,
        is_exclusive: false,
        is_limited: false,
        is_default: true,
        gender: 'unisex',
        tags: ['everyday', 'comfortable'],
      },
      {
        name: 'Business Suit',
        description: 'Professional business suit for formal occasions',
        item_type: 'outfit',
        category: 'business',
        rarity: 'uncommon',
        base_price: 200,
        currency_type: 'usd',
        level_requirement: 3,
        credit_score_requirement: 650,
        is_exclusive: false,
        is_limited: false,
        is_default: false,
        gender: 'unisex',
        tags: ['formal', 'professional'],
      },
      // More items would be added here
    ];
  }

  /**
   * Complete system initialization
   */
  async completeInitialization(): Promise<void> {
    console.log('=== Starting Complete System Initialization ===\n');

    try {
      // Step 1: Initialize avatar items
      console.log('Step 1: Initializing avatar items...');
      await this.initializeAvatarItems();

      // Step 2: Initialize cities with businesses
      console.log('\nStep 2: Initializing cities with businesses...');
      await this.initializeAllCities();

      // Step 3: Populate business inventory
      console.log('\nStep 3: Populating business inventory...');
      await this.populateBusinessInventory();

      console.log('\n=== System Initialization Complete ===');
    } catch (error) {
      console.error('Error during system initialization:', error);
    }
  }
}

export const businessInitializationService = new BusinessInitializationService();