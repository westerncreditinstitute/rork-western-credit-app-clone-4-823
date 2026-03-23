import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  BusinessMultiplayerData,
  BusinessPartnership,
  InvestmentPoolData,
  PoolInvestor,
} from '@/types/multiplayerIntegration';
import { multiplayerNotificationService } from './MultiplayerNotificationService';
import { multiplayerAnalyticsService } from './MultiplayerAnalyticsService';

const STORAGE_KEY = 'multiplayer_business';

type InvestmentCallback = (businessId: string, investment: PoolInvestor) => void;
type PartnershipCallback = (partnership: BusinessPartnership) => void;
type ViewerCallback = (businessId: string, viewerCount: number) => void;

class MultiplayerBusinessService {
  private businessChannels: Map<string, RealtimeChannel> = new Map();
  private businessData: Map<string, BusinessMultiplayerData> = new Map();
  private investmentCallbacks: InvestmentCallback[] = [];
  private partnershipCallbacks: PartnershipCallback[] = [];
  private viewerCallbacks: ViewerCallback[] = [];
  private currentUserId: string | null = null;
  private currentUserName: string | null = null;
  private currentUserAvatar: string | null = null;
  private isInitialized: boolean = false;

  async initialize(userId: string, userName: string, userAvatar?: string): Promise<void> {
    if (this.isInitialized) {
      console.log('[MultiplayerBusiness] Already initialized');
      return;
    }

    this.currentUserId = userId;
    this.currentUserName = userName;
    this.currentUserAvatar = userAvatar || null;

    await this.loadCachedData();
    this.isInitialized = true;

    console.log('[MultiplayerBusiness] Initialized for user:', userId);
  }

  async subscribeToBusiness(businessId: string): Promise<void> {
    if (!isSupabaseConfigured || !this.currentUserId) return;

    if (this.businessChannels.has(businessId)) {
      console.log('[MultiplayerBusiness] Already subscribed to:', businessId);
      return;
    }

    const channel = supabase.channel(`business-${businessId}`, {
      config: {
        presence: {
          key: this.currentUserId,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const viewerCount = Object.keys(state).length;
        this.updateViewerCount(businessId, viewerCount);
      })
      .on('broadcast', { event: 'investment' }, ({ payload }) => {
        this.handleInvestment(businessId, payload as PoolInvestor);
      })
      .on('broadcast', { event: 'partnership_update' }, ({ payload }) => {
        this.handlePartnershipUpdate(payload as BusinessPartnership);
      })
      .on('broadcast', { event: 'pool_update' }, ({ payload }) => {
        this.handlePoolUpdate(businessId, payload as InvestmentPoolData);
      });

    await channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          user_id: this.currentUserId,
          user_name: this.currentUserName,
          viewing_since: Date.now(),
        });
        console.log('[MultiplayerBusiness] Subscribed to business:', businessId);
      }
    });

    this.businessChannels.set(businessId, channel);
  }

  async unsubscribeFromBusiness(businessId: string): Promise<void> {
    const channel = this.businessChannels.get(businessId);
    if (channel) {
      await channel.untrack();
      await supabase.removeChannel(channel);
      this.businessChannels.delete(businessId);
      console.log('[MultiplayerBusiness] Unsubscribed from business:', businessId);
    }
  }

  async createInvestmentPool(
    businessId: string,
    businessName: string,
    targetAmount: number,
    minInvestment: number,
    maxInvestment: number,
    deadline?: number
  ): Promise<InvestmentPoolData> {
    const pool: InvestmentPoolData = {
      poolId: `pool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      businessId,
      targetAmount,
      currentAmount: 0,
      investorCount: 0,
      status: 'open',
      minInvestment,
      maxInvestment,
      deadline,
      investors: [],
    };

    const data = this.getOrCreateBusinessData(businessId);
    data.investmentPool = pool;
    this.businessData.set(businessId, data);

    if (isSupabaseConfigured) {
      try {
        await supabase.from('investment_pools').insert({
          id: pool.poolId,
          business_id: businessId,
          target_amount: targetAmount,
          current_amount: 0,
          investor_count: 0,
          status: 'open',
          min_investment: minInvestment,
          max_investment: maxInvestment,
          deadline: deadline ? new Date(deadline).toISOString() : null,
          created_at: new Date().toISOString(),
        });
      } catch (error) {
        console.warn('[MultiplayerBusiness] Failed to create pool in database:', error);
      }
    }

    await this.saveCachedData();
    console.log('[MultiplayerBusiness] Investment pool created:', pool.poolId);
    return pool;
  }

  async investInBusiness(
    businessId: string,
    businessName: string,
    businessOwnerId: string,
    amount: number
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.currentUserId || !this.currentUserName) {
      return { success: false, error: 'User not initialized' };
    }

    const data = this.businessData.get(businessId);
    if (!data?.investmentPool) {
      return { success: false, error: 'No investment pool found' };
    }

    const pool = data.investmentPool;

    if (pool.status !== 'open') {
      return { success: false, error: 'Investment pool is closed' };
    }

    if (amount < pool.minInvestment) {
      return { success: false, error: `Minimum investment is $${pool.minInvestment}` };
    }

    if (amount > pool.maxInvestment) {
      return { success: false, error: `Maximum investment is $${pool.maxInvestment}` };
    }

    if (pool.currentAmount + amount > pool.targetAmount) {
      return { success: false, error: 'Investment exceeds remaining pool capacity' };
    }

    const investor: PoolInvestor = {
      userId: this.currentUserId,
      userName: this.currentUserName,
      userAvatar: this.currentUserAvatar || undefined,
      amount,
      percentage: (amount / pool.targetAmount) * 100,
      investedAt: Date.now(),
    };

    pool.investors.push(investor);
    pool.currentAmount += amount;
    pool.investorCount = pool.investors.length;

    if (pool.currentAmount >= pool.targetAmount) {
      pool.status = 'funded';
    }

    data.totalInvestment += amount;
    data.totalInvestors = pool.investorCount;

    this.businessData.set(businessId, data);
    await this.saveCachedData();

    const channel = this.businessChannels.get(businessId);
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'investment',
        payload: investor,
      });
      await channel.send({
        type: 'broadcast',
        event: 'pool_update',
        payload: pool,
      });
    }

    if (isSupabaseConfigured) {
      try {
        await supabase.from('pool_investments').insert({
          pool_id: pool.poolId,
          investor_id: this.currentUserId,
          investor_name: this.currentUserName,
          amount,
          percentage: investor.percentage,
          invested_at: new Date().toISOString(),
        });

        await supabase
          .from('investment_pools')
          .update({
            current_amount: pool.currentAmount,
            investor_count: pool.investorCount,
            status: pool.status,
          })
          .eq('id', pool.poolId);
      } catch (error) {
        console.warn('[MultiplayerBusiness] Failed to save investment to database:', error);
      }
    }

    await multiplayerNotificationService.sendInvestmentNotification(
      businessOwnerId,
      this.currentUserName,
      amount,
      businessId,
      businessName
    );

    multiplayerAnalyticsService.trackInvestment(this.currentUserId, businessId, amount);

    console.log('[MultiplayerBusiness] Investment made:', amount, 'in business:', businessId);
    return { success: true };
  }

  async requestPartnership(
    businessId: string,
    businessName: string,
    businessOwnerId: string,
    ownershipPercentage: number,
    investmentAmount: number
  ): Promise<{ success: boolean; partnership?: BusinessPartnership; error?: string }> {
    if (!this.currentUserId || !this.currentUserName) {
      return { success: false, error: 'User not initialized' };
    }

    if (ownershipPercentage <= 0 || ownershipPercentage > 49) {
      return { success: false, error: 'Ownership percentage must be between 1% and 49%' };
    }

    const partnership: BusinessPartnership = {
      id: `partnership_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      businessId,
      partnerId: this.currentUserId,
      partnerName: this.currentUserName,
      partnerAvatar: this.currentUserAvatar || undefined,
      ownershipPercentage,
      investmentAmount,
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const data = this.getOrCreateBusinessData(businessId);
    data.partnerships.push(partnership);
    this.businessData.set(businessId, data);

    await this.saveCachedData();

    const channel = this.businessChannels.get(businessId);
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'partnership_update',
        payload: partnership,
      });
    }

    if (isSupabaseConfigured) {
      try {
        await supabase.from('business_partnerships').insert({
          id: partnership.id,
          business_id: businessId,
          partner_id: this.currentUserId,
          partner_name: this.currentUserName,
          ownership_percentage: ownershipPercentage,
          investment_amount: investmentAmount,
          status: 'pending',
          created_at: new Date().toISOString(),
        });
      } catch (error) {
        console.warn('[MultiplayerBusiness] Failed to save partnership to database:', error);
      }
    }

    await multiplayerNotificationService.sendPartnershipRequestNotification(
      businessOwnerId,
      this.currentUserName,
      businessName,
      businessId,
      ownershipPercentage
    );

    multiplayerAnalyticsService.trackPartnership(this.currentUserId, businessId, businessOwnerId, 'request');

    console.log('[MultiplayerBusiness] Partnership requested:', partnership.id);
    return { success: true, partnership };
  }

  async respondToPartnership(
    partnershipId: string,
    businessId: string,
    accept: boolean
  ): Promise<{ success: boolean; error?: string }> {
    const data = this.businessData.get(businessId);
    if (!data) {
      return { success: false, error: 'Business data not found' };
    }

    const partnership = data.partnerships.find(p => p.id === partnershipId);
    if (!partnership) {
      return { success: false, error: 'Partnership not found' };
    }

    partnership.status = accept ? 'active' : 'dissolved';
    partnership.updatedAt = Date.now();

    this.businessData.set(businessId, data);
    await this.saveCachedData();

    const channel = this.businessChannels.get(businessId);
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'partnership_update',
        payload: partnership,
      });
    }

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('business_partnerships')
          .update({
            status: partnership.status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', partnershipId);
      } catch (error) {
        console.warn('[MultiplayerBusiness] Failed to update partnership in database:', error);
      }
    }

    if (accept) {
      await multiplayerNotificationService.sendNotification(
        partnership.partnerId,
        'partnership_accepted',
        'Partnership Accepted!',
        `Your partnership request has been accepted!`,
        { businessId, partnershipId }
      );
    }

    multiplayerAnalyticsService.trackPartnership(
      this.currentUserId || '',
      businessId,
      partnership.partnerId,
      accept ? 'accept' : 'reject'
    );

    console.log('[MultiplayerBusiness] Partnership response:', partnershipId, accept ? 'accepted' : 'rejected');
    return { success: true };
  }

  async dissolvePartnership(partnershipId: string, businessId: string): Promise<{ success: boolean; error?: string }> {
    return this.respondToPartnership(partnershipId, businessId, false);
  }

  getBusinessData(businessId: string): BusinessMultiplayerData | null {
    return this.businessData.get(businessId) || null;
  }

  getInvestmentPool(businessId: string): InvestmentPoolData | null {
    return this.businessData.get(businessId)?.investmentPool || null;
  }

  getPartnerships(businessId: string): BusinessPartnership[] {
    return this.businessData.get(businessId)?.partnerships || [];
  }

  getActivePartnerships(businessId: string): BusinessPartnership[] {
    return this.getPartnerships(businessId).filter(p => p.status === 'active');
  }

  getPendingPartnerships(businessId: string): BusinessPartnership[] {
    return this.getPartnerships(businessId).filter(p => p.status === 'pending');
  }

  getViewerCount(businessId: string): number {
    return this.businessData.get(businessId)?.realtimeViewers || 0;
  }

  getTotalInvestment(businessId: string): number {
    return this.businessData.get(businessId)?.totalInvestment || 0;
  }

  getInvestorCount(businessId: string): number {
    return this.businessData.get(businessId)?.totalInvestors || 0;
  }

  onInvestment(callback: InvestmentCallback): () => void {
    this.investmentCallbacks.push(callback);
    return () => {
      const index = this.investmentCallbacks.indexOf(callback);
      if (index > -1) this.investmentCallbacks.splice(index, 1);
    };
  }

  onPartnershipUpdate(callback: PartnershipCallback): () => void {
    this.partnershipCallbacks.push(callback);
    return () => {
      const index = this.partnershipCallbacks.indexOf(callback);
      if (index > -1) this.partnershipCallbacks.splice(index, 1);
    };
  }

  onViewerCountChange(callback: ViewerCallback): () => void {
    this.viewerCallbacks.push(callback);
    return () => {
      const index = this.viewerCallbacks.indexOf(callback);
      if (index > -1) this.viewerCallbacks.splice(index, 1);
    };
  }

  private handleInvestment(businessId: string, investor: PoolInvestor): void {
    if (investor.userId === this.currentUserId) return;

    const data = this.businessData.get(businessId);
    if (data?.investmentPool) {
      const existingIndex = data.investmentPool.investors.findIndex(i => i.userId === investor.userId);
      if (existingIndex === -1) {
        data.investmentPool.investors.push(investor);
      }
    }

    this.investmentCallbacks.forEach(cb => cb(businessId, investor));
  }

  private handlePartnershipUpdate(partnership: BusinessPartnership): void {
    const data = this.businessData.get(partnership.businessId);
    if (data) {
      const index = data.partnerships.findIndex(p => p.id === partnership.id);
      if (index >= 0) {
        data.partnerships[index] = partnership;
      } else {
        data.partnerships.push(partnership);
      }
      this.businessData.set(partnership.businessId, data);
    }

    this.partnershipCallbacks.forEach(cb => cb(partnership));
  }

  private handlePoolUpdate(businessId: string, pool: InvestmentPoolData): void {
    const data = this.businessData.get(businessId);
    if (data) {
      data.investmentPool = pool;
      data.totalInvestment = pool.currentAmount;
      data.totalInvestors = pool.investorCount;
      this.businessData.set(businessId, data);
    }
  }

  private updateViewerCount(businessId: string, count: number): void {
    const data = this.getOrCreateBusinessData(businessId);
    data.realtimeViewers = count;
    this.businessData.set(businessId, data);

    this.viewerCallbacks.forEach(cb => cb(businessId, count));
  }

  private getOrCreateBusinessData(businessId: string): BusinessMultiplayerData {
    let data = this.businessData.get(businessId);
    if (!data) {
      data = {
        businessId,
        ownerId: '',
        totalInvestors: 0,
        totalInvestment: 0,
        partnerships: [],
        investmentPool: {
          poolId: '',
          businessId,
          targetAmount: 0,
          currentAmount: 0,
          investorCount: 0,
          status: 'closed',
          minInvestment: 0,
          maxInvestment: 0,
          investors: [],
        },
        realtimeViewers: 0,
      };
      this.businessData.set(businessId, data);
    }
    return data;
  }

  private async loadCachedData(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(`${STORAGE_KEY}_${this.currentUserId}`);
      if (stored) {
        const data = JSON.parse(stored);
        this.businessData = new Map(Object.entries(data));
        console.log('[MultiplayerBusiness] Loaded cached data');
      }
    } catch (error) {
      console.error('[MultiplayerBusiness] Failed to load cached data:', error);
    }
  }

  private async saveCachedData(): Promise<void> {
    try {
      const data = Object.fromEntries(this.businessData);
      await AsyncStorage.setItem(
        `${STORAGE_KEY}_${this.currentUserId}`,
        JSON.stringify(data)
      );
    } catch (error) {
      console.error('[MultiplayerBusiness] Failed to save cached data:', error);
    }
  }

  async cleanup(): Promise<void> {
    for (const [businessId] of this.businessChannels) {
      await this.unsubscribeFromBusiness(businessId);
    }

    await this.saveCachedData();

    this.investmentCallbacks = [];
    this.partnershipCallbacks = [];
    this.viewerCallbacks = [];
    this.isInitialized = false;

    console.log('[MultiplayerBusiness] Cleanup complete');
  }
}

export const multiplayerBusinessService = new MultiplayerBusinessService();
export default multiplayerBusinessService;
