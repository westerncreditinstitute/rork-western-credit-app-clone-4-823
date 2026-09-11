import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================
// TestingService — Local data persistence for testing mode
// ============================================================
// When EXPO_PUBLIC_TESTING_MODE=true, this service stores all
// testing data locally (disputes, users, AI conversations) so the
// entire workflow can be tested without a live Supabase backend.
//
// Data is automatically synced to Supabase when it comes online,
// but testing mode prioritizes local-first operation.

const TESTING_MODE_KEY = 'wci_testing_mode_enabled';
const TEST_USERS_KEY = 'wci_test_users';
const TEST_DISPUTES_KEY = 'wci_test_disputes';
const TEST_CONVERSATIONS_KEY = 'wci_test_conversations';

interface TestUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  createdAt: string;
  lastLogin?: string;
}

interface TestDispute {
  id: string;
  userId: string;
  creditor: string;
  accountNumber: string;
  disputeType: string;
  dateSent: string;
  status: 'sent' | 'in-progress' | 'resolved' | 'rejected';
  responseBy: string;
  letterContent?: string;
  timeline: Array<{
    date: string;
    action: string;
    note?: string;
  }>;
  documents: Array<{
    name: string;
    type: string;
    uploadDate: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface TestConversation {
  id: string;
  userId: string;
  agentId: string;
  createdAt: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
}

class TestingService {
  private isEnabled: boolean = false;

  async initialize(): Promise<void> {
    try {
      const testing = process.env.EXPO_PUBLIC_TESTING_MODE === 'true';
      this.isEnabled = testing;
      if (this.isEnabled) {
        await AsyncStorage.setItem(TESTING_MODE_KEY, 'true');
        console.log('[TestingService] Testing mode ENABLED - data will be stored locally');
      } else {
        await AsyncStorage.removeItem(TESTING_MODE_KEY);
        console.log('[TestingService] Testing mode DISABLED - using production flow');
      }
    } catch (error) {
      console.error('[TestingService] Failed to initialize:', error);
    }
  }

  isTestingModeEnabled(): boolean {
    return this.isEnabled;
  }

  // ============================================================
  // User Management
  // ============================================================

  async createTestUser(userData: {
    name: string;
    email: string;
    phone?: string;
  }): Promise<TestUser> {
    if (!this.isEnabled) {
      throw new Error('Testing mode is not enabled');
    }

    try {
      const users = await this.getTestUsers();
      
      // Check for duplicate email
      if (users.some(u => u.email === userData.email)) {
        throw new Error('A test user with this email already exists');
      }

      const newUser: TestUser = {
        id: `test_user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email: userData.email,
        name: userData.name,
        phone: userData.phone,
        avatar: `https://images.unsplash.com/photo-${Math.floor(Math.random() * 1000000)}-?w=150&h=150&fit=crop&crop=face`,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      };

      users.push(newUser);
      await AsyncStorage.setItem(TEST_USERS_KEY, JSON.stringify(users));
      console.log('[TestingService] Created test user:', newUser.id);
      return newUser;
    } catch (error) {
      console.error('[TestingService] Error creating test user:', error);
      throw error;
    }
  }

  async getTestUsers(): Promise<TestUser[]> {
    if (!this.isEnabled) return [];

    try {
      const data = await AsyncStorage.getItem(TEST_USERS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[TestingService] Error getting test users:', error);
      return [];
    }
  }

  async getTestUserById(userId: string): Promise<TestUser | null> {
    if (!this.isEnabled) return null;

    try {
      const users = await this.getTestUsers();
      return users.find(u => u.id === userId) || null;
    } catch (error) {
      console.error('[TestingService] Error getting test user:', error);
      return null;
    }
  }

  // ============================================================
  // Dispute Management
  // ============================================================

  async createTestDispute(userId: string, data: {
    creditor: string;
    accountNumber: string;
    disputeType?: string;
  }): Promise<TestDispute> {
    if (!this.isEnabled) {
      throw new Error('Testing mode is not enabled');
    }

    try {
      const disputes = await this.getTestDisputes();
      
      const today = new Date();
      const responseBy = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

      const newDispute: TestDispute = {
        id: `test_dispute_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        creditor: data.creditor,
        accountNumber: data.accountNumber,
        disputeType: data.disputeType || 'validation',
        dateSent: today.toISOString().split('T')[0],
        responseBy: responseBy.toISOString().split('T')[0],
        status: 'sent',
        timeline: [
          {
            date: today.toISOString().split('T')[0],
            action: 'Dispute created',
            note: 'Initial dispute created for testing',
          }
        ],
        documents: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      disputes.push(newDispute);
      await AsyncStorage.setItem(TEST_DISPUTES_KEY, JSON.stringify(disputes));
      console.log('[TestingService] Created test dispute:', newDispute.id);
      return newDispute;
    } catch (error) {
      console.error('[TestingService] Error creating test dispute:', error);
      throw error;
    }
  }

  async getTestDisputes(userId?: string): Promise<TestDispute[]> {
    if (!this.isEnabled) return [];

    try {
      const data = await AsyncStorage.getItem(TEST_DISPUTES_KEY);
      const disputes = data ? JSON.parse(data) : [];
      return userId ? disputes.filter((d: TestDispute) => d.userId === userId) : disputes;
    } catch (error) {
      console.error('[TestingService] Error getting test disputes:', error);
      return [];
    }
  }

  async updateTestDispute(disputeId: string, updates: Partial<TestDispute>): Promise<TestDispute | null> {
    if (!this.isEnabled) return null;

    try {
      const disputes = await this.getTestDisputes();
      const index = disputes.findIndex(d => d.id === disputeId);
      
      if (index === -1) {
        throw new Error('Dispute not found');
      }

      const updated = {
        ...disputes[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      disputes[index] = updated;
      await AsyncStorage.setItem(TEST_DISPUTES_KEY, JSON.stringify(disputes));
      console.log('[TestingService] Updated test dispute:', disputeId);
      return updated;
    } catch (error) {
      console.error('[TestingService] Error updating test dispute:', error);
      return null;
    }
  }

  async deleteTestDispute(disputeId: string): Promise<boolean> {
    if (!this.isEnabled) return false;

    try {
      const disputes = await this.getTestDisputes();
      const filtered = disputes.filter(d => d.id !== disputeId);
      
      if (filtered.length === disputes.length) {
        throw new Error('Dispute not found');
      }

      await AsyncStorage.setItem(TEST_DISPUTES_KEY, JSON.stringify(filtered));
      console.log('[TestingService] Deleted test dispute:', disputeId);
      return true;
    } catch (error) {
      console.error('[TestingService] Error deleting test dispute:', error);
      return false;
    }
  }

  // ============================================================
  // Conversation Logging
  // ============================================================

  async logTestConversation(userId: string, agentId: string, message: {
    role: 'user' | 'assistant';
    content: string;
  }): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const conversations = await this.getTestConversations(userId, agentId);
      
      if (conversations.length === 0) {
        const newConv: TestConversation = {
          id: `test_conv_${Date.now()}`,
          userId,
          agentId,
          createdAt: new Date().toISOString(),
          messages: [{
            id: `msg_${Date.now()}`,
            role: message.role,
            content: message.content,
            timestamp: new Date().toISOString(),
          }],
        };
        
        const allConvs = await AsyncStorage.getItem(TEST_CONVERSATIONS_KEY);
        const convs = allConvs ? JSON.parse(allConvs) : [];
        convs.push(newConv);
        await AsyncStorage.setItem(TEST_CONVERSATIONS_KEY, JSON.stringify(convs));
      } else {
        const conv = conversations[0];
        conv.messages.push({
          id: `msg_${Date.now()}`,
          role: message.role,
          content: message.content,
          timestamp: new Date().toISOString(),
        });
        
        const allConvs = await AsyncStorage.getItem(TEST_CONVERSATIONS_KEY);
        const convs = allConvs ? JSON.parse(allConvs) : [];
        const convIndex = convs.findIndex((c: TestConversation) => c.id === conv.id);
        if (convIndex !== -1) {
          convs[convIndex] = conv;
          await AsyncStorage.setItem(TEST_CONVERSATIONS_KEY, JSON.stringify(convs));
        }
      }
    } catch (error) {
      console.error('[TestingService] Error logging conversation:', error);
    }
  }

  async getTestConversations(userId: string, agentId?: string): Promise<TestConversation[]> {
    if (!this.isEnabled) return [];

    try {
      const data = await AsyncStorage.getItem(TEST_CONVERSATIONS_KEY);
      const convs = data ? JSON.parse(data) : [];
      return convs.filter((c: TestConversation) => 
        c.userId === userId && (!agentId || c.agentId === agentId)
      );
    } catch (error) {
      console.error('[TestingService] Error getting test conversations:', error);
      return [];
    }
  }

  // ============================================================
  // Data Export & Import
  // ============================================================

  async exportAllTestData(): Promise<{
    users: TestUser[];
    disputes: TestDispute[];
    conversations: TestConversation[];
    exportedAt: string;
  }> {
    if (!this.isEnabled) {
      throw new Error('Testing mode is not enabled');
    }

    try {
      const [users, disputes, conversations] = await Promise.all([
        this.getTestUsers(),
        this.getTestDisputes(),
        (async () => {
          const data = await AsyncStorage.getItem(TEST_CONVERSATIONS_KEY);
          return data ? JSON.parse(data) : [];
        })(),
      ]);

      return {
        users,
        disputes,
        conversations,
        exportedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[TestingService] Error exporting data:', error);
      throw error;
    }
  }

  async clearAllTestData(): Promise<void> {
    if (!this.isEnabled) return;

    try {
      await Promise.all([
        AsyncStorage.removeItem(TEST_USERS_KEY),
        AsyncStorage.removeItem(TEST_DISPUTES_KEY),
        AsyncStorage.removeItem(TEST_CONVERSATIONS_KEY),
      ]);
      console.log('[TestingService] Cleared all test data');
    } catch (error) {
      console.error('[TestingService] Error clearing test data:', error);
    }
  }

  // ============================================================
  // Analytics & Reporting
  // ============================================================

  async getTestingStats(): Promise<{
    totalUsers: number;
    totalDisputes: number;
    disputesByStatus: Record<string, number>;
    conversationCount: number;
  }> {
    if (!this.isEnabled) {
      return { totalUsers: 0, totalDisputes: 0, disputesByStatus: {}, conversationCount: 0 };
    }

    try {
      const [users, disputes] = await Promise.all([
        this.getTestUsers(),
        this.getTestDisputes(),
      ]);

      const data = await AsyncStorage.getItem(TEST_CONVERSATIONS_KEY);
      const conversations = data ? JSON.parse(data) : [];

      const disputesByStatus: Record<string, number> = {
        sent: 0,
        'in-progress': 0,
        resolved: 0,
        rejected: 0,
      };

      disputes.forEach(d => {
        disputesByStatus[d.status] = (disputesByStatus[d.status] || 0) + 1;
      });

      return {
        totalUsers: users.length,
        totalDisputes: disputes.length,
        disputesByStatus,
        conversationCount: conversations.length,
      };
    } catch (error) {
      console.error('[TestingService] Error getting stats:', error);
      return { totalUsers: 0, totalDisputes: 0, disputesByStatus: {}, conversationCount: 0 };
    }
  }
}

export const testingService = new TestingService();
export default testingService;
