import { supabase } from '@/lib/supabase';
import type { BusinessInventory, AvatarItem } from '@/types/customization';

export interface StockUpdateResult {
  success: boolean;
  inventory?: BusinessInventory;
  error?: string;
}

export interface RestockResult {
  success: boolean;
  restocked_items: number;
  failed_items: number;
  errors?: string[];
}

export interface AvailabilityResult {
  available: boolean;
  stock_quantity: number;
  price: number;
  discount_percentage: number;
  final_price: number;
  restock_date?: string;
}

export interface BusinessInventoryStats {
  total_items: number;
  total_stock: number;
  low_stock_items: number;
  out_of_stock_items: number;
  total_value: number;
}

export class BusinessInventoryService {
  /**
   * Get all inventory for a business
   */
  async getBusinessInventory(businessId: string): Promise<BusinessInventory[]> {
    try {
      const { data, error } = await supabase
        .from('business_inventory')
        .select('*, item:item_id(*)')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[BusinessInventoryService] Error fetching inventory:', error);
        return [];
      }

      return (data || []).map(this.mapToBusinessInventory);
    } catch (error) {
      console.error('[BusinessInventoryService] Error fetching inventory:', error);
      return [];
    }
  }

  /**
   * Get available inventory (in stock items only)
   */
  async getAvailableInventory(businessId: string): Promise<BusinessInventory[]> {
    try {
      const { data, error } = await supabase
        .from('business_inventory')
        .select('*, item:item_id(*)')
        .eq('business_id', businessId)
        .eq('is_available', true)
        .gt('stock_quantity', 0)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[BusinessInventoryService] Error fetching available inventory:', error);
        return [];
      }

      return (data || []).map(this.mapToBusinessInventory);
    } catch (error) {
      console.error('[BusinessInventoryService] Error fetching available inventory:', error);
      return [];
    }
  }

  /**
   * Update stock quantity for an item
   */
  async updateStock(
    businessId: string,
    itemId: string,
    quantity: number,
    operation: 'set' | 'add' | 'subtract' = 'set'
  ): Promise<StockUpdateResult> {
    try {
      console.log('[BusinessInventoryService] Updating stock:', { businessId, itemId, quantity, operation });

      const { data: existingInventory, error: fetchError } = await supabase
        .from('business_inventory')
        .select('*')
        .eq('business_id', businessId)
        .eq('item_id', itemId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('[BusinessInventoryService] Error fetching inventory:', fetchError);
        return { success: false, error: fetchError.message };
      }

      let newQuantity: number;

      if (existingInventory) {
        switch (operation) {
          case 'add':
            newQuantity = existingInventory.stock_quantity + quantity;
            break;
          case 'subtract':
            newQuantity = Math.max(0, existingInventory.stock_quantity - quantity);
            break;
          default:
            newQuantity = quantity;
        }

        const { data, error } = await supabase
          .from('business_inventory')
          .update({
            stock_quantity: newQuantity,
            is_available: newQuantity > 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingInventory.id)
          .select('*, item:item_id(*)')
          .single();

        if (error) {
          console.error('[BusinessInventoryService] Error updating stock:', error);
          return { success: false, error: error.message };
        }

        console.log('[BusinessInventoryService] Stock updated successfully:', { newQuantity });
        return { success: true, inventory: this.mapToBusinessInventory(data) };
      } else {
        const { data, error } = await supabase
          .from('business_inventory')
          .insert({
            business_id: businessId,
            item_id: itemId,
            stock_quantity: quantity,
            is_available: quantity > 0,
            discount_percentage: 0,
          })
          .select('*, item:item_id(*)')
          .single();

        if (error) {
          console.error('[BusinessInventoryService] Error creating inventory:', error);
          return { success: false, error: error.message };
        }

        console.log('[BusinessInventoryService] Inventory created successfully');
        return { success: true, inventory: this.mapToBusinessInventory(data) };
      }
    } catch (error) {
      console.error('[BusinessInventoryService] Error updating stock:', error);
      return { success: false, error: 'An error occurred while updating stock' };
    }
  }

  /**
   * Restock multiple items
   */
  async restockItems(
    businessId: string,
    items: Array<{ itemId: string; quantity: number }>
  ): Promise<RestockResult> {
    console.log('[BusinessInventoryService] Restocking items:', { businessId, itemCount: items.length });

    let restockedItems = 0;
    let failedItems = 0;
    const errors: string[] = [];

    for (const item of items) {
      const result = await this.updateStock(businessId, item.itemId, item.quantity, 'add');
      
      if (result.success) {
        restockedItems++;
      } else {
        failedItems++;
        errors.push(`Failed to restock item ${item.itemId}: ${result.error}`);
      }
    }

    console.log('[BusinessInventoryService] Restock complete:', { restockedItems, failedItems });

    return {
      success: failedItems === 0,
      restocked_items: restockedItems,
      failed_items: failedItems,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Restock all low stock items to a target quantity
   */
  async restockLowStockItems(
    businessId: string,
    lowStockThreshold: number = 5,
    targetQuantity: number = 20
  ): Promise<RestockResult> {
    try {
      console.log('[BusinessInventoryService] Restocking low stock items:', {
        businessId,
        lowStockThreshold,
        targetQuantity,
      });

      const { data: lowStockItems, error } = await supabase
        .from('business_inventory')
        .select('*')
        .eq('business_id', businessId)
        .lte('stock_quantity', lowStockThreshold);

      if (error) {
        console.error('[BusinessInventoryService] Error fetching low stock items:', error);
        return { success: false, restocked_items: 0, failed_items: 0, errors: [error.message] };
      }

      if (!lowStockItems || lowStockItems.length === 0) {
        console.log('[BusinessInventoryService] No low stock items found');
        return { success: true, restocked_items: 0, failed_items: 0 };
      }

      const itemsToRestock = lowStockItems.map((item) => ({
        itemId: item.item_id,
        quantity: targetQuantity - item.stock_quantity,
      }));

      return await this.restockItems(businessId, itemsToRestock);
    } catch (error) {
      console.error('[BusinessInventoryService] Error restocking low stock items:', error);
      return { success: false, restocked_items: 0, failed_items: 0, errors: ['An error occurred'] };
    }
  }

  /**
   * Check item availability at a business
   */
  async checkAvailability(businessId: string, itemId: string): Promise<AvailabilityResult> {
    try {
      console.log('[BusinessInventoryService] Checking availability:', { businessId, itemId });

      const { data, error } = await supabase
        .from('business_inventory')
        .select('*, item:item_id(*)')
        .eq('business_id', businessId)
        .eq('item_id', itemId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('[BusinessInventoryService] Item not found in inventory');
          return {
            available: false,
            stock_quantity: 0,
            price: 0,
            discount_percentage: 0,
            final_price: 0,
          };
        }
        console.error('[BusinessInventoryService] Error checking availability:', error);
        return {
          available: false,
          stock_quantity: 0,
          price: 0,
          discount_percentage: 0,
          final_price: 0,
        };
      }

      const basePrice = data.custom_price || data.item?.base_price || 0;
      const finalPrice = basePrice * (1 - data.discount_percentage / 100);

      return {
        available: data.is_available && data.stock_quantity > 0,
        stock_quantity: data.stock_quantity,
        price: basePrice,
        discount_percentage: data.discount_percentage,
        final_price: finalPrice,
        restock_date: data.restock_date,
      };
    } catch (error) {
      console.error('[BusinessInventoryService] Error checking availability:', error);
      return {
        available: false,
        stock_quantity: 0,
        price: 0,
        discount_percentage: 0,
        final_price: 0,
      };
    }
  }

  /**
   * Set custom price for an item
   */
  async setCustomPrice(
    businessId: string,
    itemId: string,
    customPrice: number
  ): Promise<StockUpdateResult> {
    try {
      console.log('[BusinessInventoryService] Setting custom price:', { businessId, itemId, customPrice });

      const { data, error } = await supabase
        .from('business_inventory')
        .update({
          custom_price: customPrice,
          updated_at: new Date().toISOString(),
        })
        .eq('business_id', businessId)
        .eq('item_id', itemId)
        .select('*, item:item_id(*)')
        .single();

      if (error) {
        console.error('[BusinessInventoryService] Error setting custom price:', error);
        return { success: false, error: error.message };
      }

      return { success: true, inventory: this.mapToBusinessInventory(data) };
    } catch (error) {
      console.error('[BusinessInventoryService] Error setting custom price:', error);
      return { success: false, error: 'An error occurred while setting custom price' };
    }
  }

  /**
   * Set discount percentage for an item
   */
  async setDiscount(
    businessId: string,
    itemId: string,
    discountPercentage: number
  ): Promise<StockUpdateResult> {
    try {
      console.log('[BusinessInventoryService] Setting discount:', { businessId, itemId, discountPercentage });

      const clampedDiscount = Math.min(100, Math.max(0, discountPercentage));

      const { data, error } = await supabase
        .from('business_inventory')
        .update({
          discount_percentage: clampedDiscount,
          updated_at: new Date().toISOString(),
        })
        .eq('business_id', businessId)
        .eq('item_id', itemId)
        .select('*, item:item_id(*)')
        .single();

      if (error) {
        console.error('[BusinessInventoryService] Error setting discount:', error);
        return { success: false, error: error.message };
      }

      return { success: true, inventory: this.mapToBusinessInventory(data) };
    } catch (error) {
      console.error('[BusinessInventoryService] Error setting discount:', error);
      return { success: false, error: 'An error occurred while setting discount' };
    }
  }

  /**
   * Get inventory statistics for a business
   */
  async getInventoryStats(businessId: string): Promise<BusinessInventoryStats> {
    try {
      const inventory = await this.getBusinessInventory(businessId);

      const stats: BusinessInventoryStats = {
        total_items: inventory.length,
        total_stock: 0,
        low_stock_items: 0,
        out_of_stock_items: 0,
        total_value: 0,
      };

      for (const item of inventory) {
        stats.total_stock += item.stock_quantity;

        if (item.stock_quantity === 0) {
          stats.out_of_stock_items++;
        } else if (item.stock_quantity <= 5) {
          stats.low_stock_items++;
        }

        const price = item.custom_price || item.item?.base_price || 0;
        stats.total_value += price * item.stock_quantity;
      }

      return stats;
    } catch (error) {
      console.error('[BusinessInventoryService] Error calculating stats:', error);
      return {
        total_items: 0,
        total_stock: 0,
        low_stock_items: 0,
        out_of_stock_items: 0,
        total_value: 0,
      };
    }
  }

  /**
   * Add new item to business inventory
   */
  async addItemToInventory(
    businessId: string,
    itemId: string,
    initialStock: number = 10,
    customPrice?: number,
    discountPercentage: number = 0
  ): Promise<StockUpdateResult> {
    try {
      console.log('[BusinessInventoryService] Adding item to inventory:', {
        businessId,
        itemId,
        initialStock,
      });

      const { data: existingItem } = await supabase
        .from('business_inventory')
        .select('*')
        .eq('business_id', businessId)
        .eq('item_id', itemId)
        .single();

      if (existingItem) {
        console.log('[BusinessInventoryService] Item already exists, updating stock');
        return await this.updateStock(businessId, itemId, initialStock, 'add');
      }

      const { data, error } = await supabase
        .from('business_inventory')
        .insert({
          business_id: businessId,
          item_id: itemId,
          stock_quantity: initialStock,
          is_available: initialStock > 0,
          custom_price: customPrice,
          discount_percentage: discountPercentage,
        })
        .select('*, item:item_id(*)')
        .single();

      if (error) {
        console.error('[BusinessInventoryService] Error adding item to inventory:', error);
        return { success: false, error: error.message };
      }

      console.log('[BusinessInventoryService] Item added to inventory successfully');
      return { success: true, inventory: this.mapToBusinessInventory(data) };
    } catch (error) {
      console.error('[BusinessInventoryService] Error adding item to inventory:', error);
      return { success: false, error: 'An error occurred while adding item to inventory' };
    }
  }

  /**
   * Remove item from business inventory
   */
  async removeItemFromInventory(businessId: string, itemId: string): Promise<boolean> {
    try {
      console.log('[BusinessInventoryService] Removing item from inventory:', { businessId, itemId });

      const { error } = await supabase
        .from('business_inventory')
        .delete()
        .eq('business_id', businessId)
        .eq('item_id', itemId);

      if (error) {
        console.error('[BusinessInventoryService] Error removing item:', error);
        return false;
      }

      console.log('[BusinessInventoryService] Item removed from inventory successfully');
      return true;
    } catch (error) {
      console.error('[BusinessInventoryService] Error removing item:', error);
      return false;
    }
  }

  /**
   * Schedule restock for future date
   */
  async scheduleRestock(
    businessId: string,
    itemId: string,
    restockDate: Date
  ): Promise<StockUpdateResult> {
    try {
      console.log('[BusinessInventoryService] Scheduling restock:', {
        businessId,
        itemId,
        restockDate,
      });

      const { data, error } = await supabase
        .from('business_inventory')
        .update({
          restock_date: restockDate.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('business_id', businessId)
        .eq('item_id', itemId)
        .select('*, item:item_id(*)')
        .single();

      if (error) {
        console.error('[BusinessInventoryService] Error scheduling restock:', error);
        return { success: false, error: error.message };
      }

      return { success: true, inventory: this.mapToBusinessInventory(data) };
    } catch (error) {
      console.error('[BusinessInventoryService] Error scheduling restock:', error);
      return { success: false, error: 'An error occurred while scheduling restock' };
    }
  }

  private mapToBusinessInventory(data: any): BusinessInventory {
    return {
      id: data.id,
      business_id: data.business_id,
      item_id: data.item_id,
      stock_quantity: data.stock_quantity,
      restock_date: data.restock_date,
      discount_percentage: data.discount_percentage || 0,
      is_available: data.is_available,
      custom_price: data.custom_price,
      created_at: data.created_at,
      updated_at: data.updated_at,
      item: data.item,
      business: data.business,
    };
  }
}

export const businessInventoryService = new BusinessInventoryService();
