import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { testingService } from '@/services/TestingService';
import { useDisputes } from '@/contexts/DisputesContext';
import { useUser } from '@/contexts/UserContext';

interface TestingStats {
  totalUsers: number;
  totalDisputes: number;
  disputesByStatus: Record<string, number>;
  conversationCount: number;
}

export const TestingDashboard = ({ onClose }: { onClose?: () => void }) => {
  const { colors } = useTheme();
  const { user } = useUser();
  const { disputes, createDispute } = useDisputes();
  
  const [stats, setStats] = useState<TestingStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  
  // User creation form state
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  
  // Dispute creation form state
  const [creditor, setCreditor] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [disputeType, setDisputeType] = useState('late_payment');

  useEffect(() => {
    loadStats();
  }, [disputes]);

  const loadStats = async () => {
    try {
      const testStats = await testingService.getTestingStats();
      setStats(testStats);
    } catch (error) {
      console.error('Error loading testing stats:', error);
    }
  };

  const handleCreateTestUser = async () => {
    if (!userName || !userEmail) {
      Alert.alert('Missing Information', 'Please enter at least name and email');
      return;
    }

    setIsLoading(true);
    try {
      const newUser = await testingService.createTestUser({
        name: userName,
        email: userEmail,
        phone: userPhone,
      });

      Alert.alert('Success', `Test user created: ${newUser.name}\nID: ${newUser.id}`);
      
      setUserName('');
      setUserEmail('');
      setUserPhone('');
      setShowUserModal(false);
      
      await loadStats();
    } catch (error) {
      Alert.alert('Error', `Failed to create test user: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTestDispute = async () => {
    if (!creditor || !accountNumber) {
      Alert.alert('Missing Information', 'Please enter creditor and account number');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'No user ID found. Please create a test user first.');
      return;
    }

    setIsLoading(true);
    try {
      const newDispute = await testingService.createTestDispute(user.id, {
        creditor,
        accountNumber,
        disputeType,
      });

      Alert.alert(
        'Success',
        `Test dispute created!\n\nCreditor: ${newDispute.creditor}\nAccount: ${newDispute.accountNumber}\nStatus: ${newDispute.status}\nResponse By: ${newDispute.responseBy}`
      );

      setCreditor('');
      setAccountNumber('');
      setDisputeType('late_payment');
      setShowDisputeModal(false);

      await loadStats();
    } catch (error) {
      Alert.alert('Error', `Failed to create test dispute: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      const exportedData = await testingService.exportAllTestData();
      
      const dataString = JSON.stringify(exportedData, null, 2);
      const summary = `
TESTING DATA EXPORT
===================
Exported: ${exportedData.exportedAt}

SUMMARY:
- Total Users: ${exportedData.users.length}
- Total Disputes: ${exportedData.disputes.length}
- Total Conversations: ${exportedData.conversations.length}

Users:
${exportedData.users.map((u: any) => `  - ${u.name} (${u.email})`).join('\n')}

Disputes:
${exportedData.disputes.map((d: any) => `  - ${d.creditor} (${d.accountNumber}) - Status: ${d.status}`).join('\n')}

[Full JSON data below]
${dataString}
      `;

      Alert.alert(
        'Data Exported',
        `${exportedData.users.length} users, ${exportedData.disputes.length} disputes exported.\n\nCheck console for full JSON data.`
      );

      // Log to console for developer access
      console.log('[TESTING DATA EXPORT]', exportedData);
    } catch (error) {
      Alert.alert('Error', `Failed to export data: ${error}`);
    }
  };

  const handleClearAllData = () => {
    Alert.alert(
      'Clear All Testing Data?',
      'This will delete all test users, disputes, and conversations. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await testingService.clearAllTestData();
              Alert.alert('Success', 'All testing data cleared');
              await loadStats();
            } catch (error) {
              Alert.alert('Error', `Failed to clear data: ${error}`);
            }
          },
        },
      ]
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: 16,
    },
    header: {
      marginBottom: 24,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      color: colors.text + '99',
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 24,
    },
    statCard: {
      flex: 1,
      minWidth: '45%',
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      borderLeftWidth: 4,
      borderLeftColor: '#10b981',
    },
    statLabel: {
      fontSize: 12,
      color: colors.text + '99',
      marginBottom: 8,
      fontWeight: '500',
    },
    statValue: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
    },
    buttonGroup: {
      gap: 12,
      marginBottom: 24,
    },
    button: {
      backgroundColor: '#3b82f6',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: 'center',
    },
    buttonDanger: {
      backgroundColor: '#ef4444',
    },
    buttonSecondary: {
      backgroundColor: '#8b5cf6',
    },
    buttonText: {
      color: '#ffffff',
      fontWeight: '600',
      fontSize: 16,
    },
    modal: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      padding: 20,
      maxHeight: '80%',
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 16,
    },
    input: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 12,
      color: colors.text,
      fontSize: 14,
    },
    formButton: {
      backgroundColor: '#3b82f6',
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 12,
    },
    formButtonText: {
      color: '#ffffff',
      fontWeight: '600',
      fontSize: 16,
    },
    disputeStatusBadge: {
      display: 'flex',
      marginTop: 12,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 6,
      backgroundColor: '#f3f4f6',
    },
    disputeStatusText: {
      fontSize: 12,
      color: colors.text,
    },
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🧪 Testing Dashboard</Text>
          <Text style={styles.subtitle}>
            {testingService.isTestingModeEnabled()
              ? 'Testing mode ENABLED - Data saved locally'
              : 'Testing mode DISABLED - Using production'}
          </Text>
        </View>

        {/* Stats Grid */}
        {stats && (
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Test Users</Text>
              <Text style={styles.statValue}>{stats.totalUsers}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Disputes</Text>
              <Text style={styles.statValue}>{stats.totalDisputes}</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: '#f59e0b' }]}>
              <Text style={styles.statLabel}>Sent</Text>
              <Text style={styles.statValue}>{stats.disputesByStatus.sent || 0}</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: '#3b82f6' }]}>
              <Text style={styles.statLabel}>In Progress</Text>
              <Text style={styles.statValue}>{stats.disputesByStatus['in-progress'] || 0}</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: '#10b981' }]}>
              <Text style={styles.statLabel}>Resolved</Text>
              <Text style={styles.statValue}>{stats.disputesByStatus.resolved || 0}</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: '#ef4444' }]}>
              <Text style={styles.statLabel}>Rejected</Text>
              <Text style={styles.statValue}>{stats.disputesByStatus.rejected || 0}</Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => setShowUserModal(true)}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Creating...' : '➕ Create Test User'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={() => setShowDisputeModal(true)}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Creating...' : '📋 Create Test Dispute'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={handleExportData}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>📤 Export All Data</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonDanger]}
            onPress={handleClearAllData}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>🗑️ Clear All Data</Text>
          </TouchableOpacity>

          {onClose && (
            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#6b7280' }]}
              onPress={onClose}
            >
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Current Disputes List */}
        {disputes.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: colors.text,
                marginBottom: 12,
              }}
            >
              📊 Current Disputes ({disputes.length})
            </Text>
            {disputes.map((dispute: any) => (
              <View
                key={dispute.id}
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 8,
                  borderLeftWidth: 3,
                  borderLeftColor: '#3b82f6',
                }}
              >
                <Text style={{ color: colors.text, fontWeight: '600' }}>
                  {dispute.creditor}
                </Text>
                <Text style={{ color: colors.text + '99', fontSize: 12 }}>
                  Account: {dispute.accountNumber}
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginTop: 8,
                  }}
                >
                  <Text style={{ color: colors.text + '99', fontSize: 12 }}>
                    Type: {dispute.disputeType}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '500',
                      backgroundColor:
                        dispute.status === 'resolved'
                          ? '#d1fae5'
                          : dispute.status === 'rejected'
                          ? '#fee2e2'
                          : dispute.status === 'in-progress'
                          ? '#dbeafe'
                          : '#fef3c7',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 4,
                      color:
                        dispute.status === 'resolved'
                          ? '#047857'
                          : dispute.status === 'rejected'
                          ? '#dc2626'
                          : dispute.status === 'in-progress'
                          ? '#1e40af'
                          : '#92400e',
                    }}
                  >
                    {dispute.status}
                  </Text>
                </View>
                <Text style={{ color: colors.text + '99', fontSize: 11, marginTop: 8 }}>
                  Response by: {dispute.responseBy}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Create User Modal */}
      <Modal
        visible={showUserModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowUserModal(false)}
      >
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Test User</Text>

            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor={colors.text + '66'}
              value={userName}
              onChangeText={setUserName}
              editable={!isLoading}
            />

            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor={colors.text + '66'}
              value={userEmail}
              onChangeText={setUserEmail}
              keyboardType="email-address"
              editable={!isLoading}
            />

            <TextInput
              style={styles.input}
              placeholder="Phone (optional)"
              placeholderTextColor={colors.text + '66'}
              value={userPhone}
              onChangeText={setUserPhone}
              keyboardType="phone-pad"
              editable={!isLoading}
            />

            <TouchableOpacity
              style={styles.formButton}
              onPress={handleCreateTestUser}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.formButtonText}>Create User</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.formButton, { backgroundColor: '#6b7280', marginTop: 8 }]}
              onPress={() => setShowUserModal(false)}
              disabled={isLoading}
            >
              <Text style={styles.formButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Create Dispute Modal */}
      <Modal
        visible={showDisputeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDisputeModal(false)}
      >
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Test Dispute</Text>

            <TextInput
              style={styles.input}
              placeholder="Creditor Name"
              placeholderTextColor={colors.text + '66'}
              value={creditor}
              onChangeText={setCreditor}
              editable={!isLoading}
            />

            <TextInput
              style={styles.input}
              placeholder="Account Number"
              placeholderTextColor={colors.text + '66'}
              value={accountNumber}
              onChangeText={setAccountNumber}
              editable={!isLoading}
            />

            <View
              style={{
                marginBottom: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colors.border,
                overflow: 'hidden',
              }}
            >
              <TouchableOpacity
                style={{
                  backgroundColor: colors.background,
                  padding: 12,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: colors.text, fontSize: 14 }}>
                  Dispute Type: {disputeType}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.formButton}
              onPress={handleCreateTestDispute}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.formButtonText}>Create Dispute</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.formButton, { backgroundColor: '#6b7280', marginTop: 8 }]}
              onPress={() => setShowDisputeModal(false)}
              disabled={isLoading}
            >
              <Text style={styles.formButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default TestingDashboard;
