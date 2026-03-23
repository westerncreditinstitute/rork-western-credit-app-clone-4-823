import { supabase } from '@/lib/supabase';
import type {
  AvatarItem,
  PlayerInventory,
  PlayerAvatarConfig,
  BusinessInventory,
  PurchaseResult,
  EquipResult,
  MarketplaceFilter,
  AvailableItem,
  AvatarCustomizationUpdate,
  InventoryStats,
  WearUpdateResult,
} from '@/types/customization';

export class CustomizationService {
  /**
   * Get player's complete inventory
   */
  async getPlayerInventory(playerId: string): Promise<PlayerInventory[]> {
    try {
      const { data, error } = await supabase
        .from('player_inventory')
        .select('*, item(*)')
        .eq('player_id', playerId)
        .order('purchase_date', { ascending: false });

      if (error) {
        console.error('Error fetching player inventory:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching player inventory:', error);
      return [];
    }
  }

  /**
   * Get player's current avatar configuration
   */
  async getPlayerAvatarConfig(playerId: string): Promise<PlayerAvatarConfig | null> {
    try {
      const { data, error } = await supabase
        .from('player_avatar_config')
        .select(`
          *,
          current_outfit:current_outfit_id(*, item(*)),
          current_hat:current_hat_id(*, item(*)),
          current_accessory:current_accessory_id(*, item(*)),
          current_shoes:current_shoes_id(*, item(*)),
          current_glasses:current_glasses_id(*, item(*))
        `)
        .eq('player_id', playerId)
        .single();

      if (error) {
        console.error('Error fetching avatar config:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching avatar config:', error);
      return null;
    }
  }

  /**
   * Purchase item from business
   */
  async purchaseFromBusiness(
    playerId: string,
    businessId: string,
    itemId: string,
    purchasePrice: number
  ): Promise<PurchaseResult> {
    try {
      // Get item details
      const { data: item, error: itemError } = await supabase
        .from('avatar_items')
        .select('*')
        .eq('id', itemId)
        .single();

      if (itemError || !item) {
        return { success: false, error: 'Item not found' };
      }

      // Validate purchase price
      const expectedPrice = item.base_price;
      if (Math.abs(purchasePrice - expectedPrice) > 100) {
        return { success: false, error: 'Invalid purchase price' };
      }

      // Get business inventory
      const { data: inventory, error: inventoryError } = await supabase
        .from('business_inventory')
        .select('*')
        .eq('business_id', businessId)
        .eq('item_id', itemId)
        .single();

      if (inventoryError || !inventory) {
        return { success: false, error: 'Item not available at this business' };
      }

      // Check stock
      if (inventory.stock_quantity <= 0) {
        return { success: false, error: 'Item out of stock' };
      }

      // Apply discount
      const finalPrice = purchasePrice * (1 - inventory.discount_percentage / 100);

      // TODO: Validate player has sufficient funds

      // Add to player inventory
      const { data: playerInventoryItem, error: addError } = await supabase
        .from('player_inventory')
        .insert({
          player_id: playerId,
          item_id: itemId,
          purchase_price: finalPrice,
          purchase_source: 'business',
          business_id: businessId,
          is_equipped: false,
          times_equipped: 0,
          condition_status: 'new',
          wear_percentage: 0,
        })
        .select()
        .single();

      if (addError) {
        return { success: false, error: 'Failed to add item to inventory' };
      }

      // Update business inventory stock
      const { error: stockError } = await supabase
        .from('business_inventory')
        .update({
          stock_quantity: inventory.stock_quantity - 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', inventory.id);

      if (stockError) {
        console.error('Failed to update stock:', stockError);
      }

      // Record transaction
      const { error: transactionError } = await supabase
        .from('customization_transactions')
        .insert({
          player_id: playerId,
          transaction_type: 'purchase',
          item_id: itemId,
          source_type: 'business',
          source_id: businessId,
          amount: finalPrice,
          currency_type: item.currency_type,
          quantity: 1,
          notes: `Purchased from business ${businessId}`,
        });

      if (transactionError) {
        console.error('Failed to record transaction:', transactionError);
      }

      // Get full inventory item with item data
      const { data: fullInventoryItem } = await supabase
        .from('player_inventory')
        .select('*, item(*)')
        .eq('id', playerInventoryItem.id)
        .single();

      return {
        success: true,
        inventory_item: fullInventoryItem,
        transaction_id: transactionError ? undefined : 'tx_' + Date.now(),
        remaining_stock: inventory.stock_quantity - 1,
      };
    } catch (error) {
      console.error('Error purchasing item:', error);
      return { success: false, error: 'An error occurred while purchasing the item' };
    }
  }

  /**
   * Equip item
   */
  async equipItem(playerId: string, inventoryId: string): Promise<EquipResult> {
    try {
      // Get inventory item
      const { data: inventoryItem, error: itemError } = await supabase
        .from('player_inventory')
        .select('*, item(*)')
        .eq('id', inventoryId)
        .eq('player_id', playerId)
        .single();

      if (itemError || !inventoryItem) {
        return { success: false, error: 'Item not found in inventory' };
      }

      // Unequip current item of same type
      const itemType = inventoryItem.item.item_type;
      await this.unequipItemType(playerId, itemType);

      // Equip new item
      const { error: updateError } = await supabase
        .from('player_inventory')
        .update({
          is_equipped: true,
          times_equipped: inventoryItem.times_equipped + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', inventoryId);

      if (updateError) {
        return { success: false, error: 'Failed to equip item' };
      }

      // Update avatar config
      const updateField: Record<string, string> = {};
      switch (itemType) {
        case 'outfit':
          updateField.current_outfit_id = inventoryId;
          break;
        case 'hat':
          updateField.current_hat_id = inventoryId;
          break;
        case 'accessory':
          updateField.current_accessory_id = inventoryId;
          break;
        case 'shoes':
          updateField.current_shoes_id = inventoryId;
          break;
        case 'glasses':
          updateField.current_glasses_id = inventoryId;
          break;
      }

      // Get or create avatar config
      const { data: existingConfig } = await supabase
        .from('player_avatar_config')
        .select('*')
        .eq('player_id', playerId)
        .single();

      if (existingConfig) {
        await supabase
          .from('player_avatar_config')
          .update(updateField)
          .eq('player_id', playerId);
      } else {
        await supabase
          .from('player_avatar_config')
          .insert({
            player_id: playerId,
            ...updateField,
          });
      }

      // Get updated avatar config
      const avatarConfig = await this.getPlayerAvatarConfig(playerId);

      // Record transaction
      await supabase
        .from('customization_transactions')
        .insert({
          player_id: playerId,
          transaction_type: 'equip',
          item_id: inventoryItem.item_id,
          amount: 0,
          currency_type: 'usd',
          quantity: 1,
          notes: `Equipped ${inventoryItem.item.name}`,
        });

      return {
        success: true,
        equipped_items: avatarConfig ?? undefined,
      };
    } catch (error) {
      console.error('Error equipping item:', error);
      return { success: false, error: 'An error occurred while equipping the item' };
    }
  }

  /**
   * Unequip item by type
   */
  async unequipItemType(playerId: string, itemType: string): Promise<void> {
    try {
      // Get current equipped item of this type
      const { data: currentConfig } = await supabase
        .from('player_avatar_config')
        .select('*')
        .eq('player_id', playerId)
        .single();

      if (!currentConfig) return;

      let currentItemId: string | undefined;
      switch (itemType) {
        case 'outfit':
          currentItemId = currentConfig.current_outfit_id;
          break;
        case 'hat':
          currentItemId = currentConfig.current_hat_id;
          break;
        case 'accessory':
          currentItemId = currentConfig.current_accessory_id;
          break;
        case 'shoes':
          currentItemId = currentConfig.current_shoes_id;
          break;
        case 'glasses':
          currentItemId = currentConfig.current_glasses_id;
          break;
      }

      if (currentItemId) {
        // Unequip item
        await supabase
          .from('player_inventory')
          .update({ is_equipped: false })
          .eq('id', currentItemId);

        // Update avatar config
        const updateField: Record<string, string | null> = {};
        switch (itemType) {
          case 'outfit':
            updateField.current_outfit_id = null;
            break;
          case 'hat':
            updateField.current_hat_id = null;
            break;
          case 'accessory':
            updateField.current_accessory_id = null;
            break;
          case 'shoes':
            updateField.current_shoes_id = null;
            break;
          case 'glasses':
            updateField.current_glasses_id = null;
            break;
        }

        await supabase
          .from('player_avatar_config')
          .update(updateField)
          .eq('player_id', playerId);

        // Record transaction
        await supabase
          .from('customization_transactions')
          .insert({
            player_id: playerId,
            transaction_type: 'unequip',
            amount: 0,
            currency_type: 'usd',
            quantity: 1,
            notes: `Unequipped ${itemType}`,
          });
      }
    } catch (error) {
      console.error('Error unequipping item:', error);
    }
  }

  /**
   * Update avatar configuration
   */
  async updateAvatarConfig(
    playerId: string,
    update: AvatarCustomizationUpdate
  ): Promise<PlayerAvatarConfig | null> {
    try {
      // Get or create avatar config
      const { data: existingConfig } = await supabase
        .from('player_avatar_config')
        .select('*')
        .eq('player_id', playerId)
        .single();

      if (existingConfig) {
        const { data, error } = await supabase
          .from('player_avatar_config')
          .update(update)
          .eq('player_id', playerId)
          .select()
          .single();

        if (error) {
          console.error('Error updating avatar config:', error);
          return null;
        }

        return data;
      } else {
        const { data, error } = await supabase
          .from('player_avatar_config')
          .insert({
            player_id: playerId,
            ...update,
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating avatar config:', error);
          return null;
        }

        return data;
      }
    } catch (error) {
      console.error('Error updating avatar config:', error);
      return null;
    }
  }

  /**
   * Get available items from all sources
   */
  async getAvailableItems(
    playerId: string,
    cityId?: string,
    filter?: MarketplaceFilter
  ): Promise<AvailableItem[]> {
    try {
      // Get all avatar items
      const { data: items, error: itemsError } = await supabase
        .from('avatar_items')
        .select('*')
        .order('name');

      if (itemsError || !items) {
        return [];
      }

      const availableItems: AvailableItem[] = [];

      for (const item of items) {
        const availableFrom: any = {
          businesses: [],
          marketplace: [],
        };

        // Get from businesses
        if (cityId) {
          const { data: businessInventory } = await supabase
            .from('business_inventory')
            .select('*, business(*)')
            .eq('item_id', item.id)
            .eq('is_available', true);

          if (businessInventory) {
            for (const inv of businessInventory) {
              if (inv.business?.city_id === cityId && inv.stock_quantity > 0) {
                availableFrom.businesses.push({
                  business_id: inv.business_id,
                  business_name: inv.business.name,
                  price: inv.custom_price || item.base_price,
                  stock: inv.stock_quantity,
                });
              }
            }
          }
        }

        // Get from marketplace
        const { data: marketplaceListings } = await supabase
          .from('avatar_marketplace_listings')
          .select('*')
          .eq('item_id', item.id)
          .eq('is_active', true);

        if (marketplaceListings) {
          for (const listing of marketplaceListings) {
            availableFrom.marketplace.push({
              listing_id: listing.id,
              seller_name: 'Seller',
              price: listing.listing_price,
              condition: 'good',
            });
          }
        }

        // Calculate best price
        const allPrices = [
          ...availableFrom.businesses.map((b: any) => b.price),
          ...availableFrom.marketplace.map((m: any) => m.price),
        ];

        const bestPrice = allPrices.length > 0 ? Math.min(...allPrices) : item.base_price;
        const totalAvailability =
          availableFrom.businesses.reduce((sum: number, b: any) => sum + b.stock, 0) +
          availableFrom.marketplace.length;

        availableItems.push({
          item,
          available_from: availableFrom,
          best_price: bestPrice,
          total_availability: totalAvailability,
          is_available_locally: availableFrom.businesses.length > 0,
        });
      }

      return availableItems;
    } catch (error) {
      console.error('Error fetching available items:', error);
      return [];
    }
  }

  /**
   * Get business inventory for a specific business
   */
  async getBusinessInventory(businessId: string): Promise<BusinessInventory[]> {
    try {
      const { data, error } = await supabase
        .from('business_inventory')
        .select('*, item(*), business(*)')
        .eq('business_id', businessId)
        .eq('is_available', true);

      if (error) {
        console.error('Error fetching business inventory:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching business inventory:', error);
      return [];
    }
  }

  /**
   * Get inventory statistics
   */
  async getInventoryStats(playerId: string): Promise<InventoryStats> {
    try {
      const inventory = await this.getPlayerInventory(playerId);

      const stats: InventoryStats = {
        total_items: inventory.length,
        equipped_items: inventory.filter((item) => item.is_equipped).length,
        items_by_type: {},
        items_by_rarity: {},
        total_value: 0,
      };

      for (const item of inventory) {
        // Count by type
        const itemType = item.item?.item_type || 'unknown';
        stats.items_by_type[itemType] = (stats.items_by_type[itemType] || 0) + 1;

        // Count by rarity
        const rarity = item.item?.rarity || 'common';
        stats.items_by_rarity[rarity] = (stats.items_by_rarity[rarity] || 0) + 1;

        // Calculate total value
        stats.total_value += item.purchase_price || item.item?.base_price || 0;
      }

      return stats;
    } catch (error) {
      console.error('Error calculating inventory stats:', error);
      return {
        total_items: 0,
        equipped_items: 0,
        items_by_type: {},
        items_by_rarity: {},
        total_value: 0,
      };
    }
  }

  /**
   * Update item wear and condition
   */
  async updateItemWear(inventoryId: string): Promise<WearUpdateResult> {
    try {
      const { data: inventoryItem, error } = await supabase
        .from('player_inventory')
        .select('*')
        .eq('id', inventoryId)
        .single();

      if (error || !inventoryItem) {
        return { success: false, error: 'Item not found', new_condition: '', wear_percentage: 0 };
      }

      // Calculate new wear
      const wearIncrease = 5; // 5% wear per use
      const newWear = Math.min(100, inventoryItem.wear_percentage + wearIncrease);

      // Determine new condition
      let newCondition = inventoryItem.condition_status;
      if (newWear >= 80) {
        newCondition = 'damaged';
      } else if (newWear >= 60) {
        newCondition = 'poor';
      } else if (newWear >= 40) {
        newCondition = 'fair';
      } else if (newWear >= 20) {
        newCondition = 'good';
      }

      // Calculate repair cost
      const repairCost = Math.round(inventoryItem.purchase_price || 0) * 0.1; // 10% of purchase price

      // Update inventory
      const { error: updateError } = await supabase
        .from('player_inventory')
        .update({
          wear_percentage: newWear,
          condition_status: newCondition,
          updated_at: new Date().toISOString(),
        })
        .eq('id', inventoryId);

      if (updateError) {
        return { success: false, error: 'Failed to update item wear', new_condition: '', wear_percentage: 0 };
      }

      // Record condition history
      if (newCondition !== inventoryItem.condition_status) {
        await supabase.from('item_condition_history').insert({
          player_inventory_id: inventoryId,
          previous_condition: inventoryItem.condition_status,
          new_condition: newCondition,
          reason: 'wear',
        });
      }

      return {
        success: true,
        new_condition: newCondition,
        wear_percentage: newWear,
        repair_cost: repairCost,
      };
    } catch (error) {
      console.error('Error updating item wear:', error);
      return { success: false, error: 'An error occurred while updating item wear', new_condition: '', wear_percentage: 0 };
    }
  }
}

export const customizationService = new CustomizationService();