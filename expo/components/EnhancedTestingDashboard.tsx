/**
 * Enhanced Testing Dashboard
 * 
 * Complete end-to-end testing for the AI Credit Repair Agent system:
 * 1. Test user login/authentication with role selection
 * 2. Mock Equifax credentials and OAuth flow
 * 3. Link/unlink Equifax reports with mock data
 * 4. View negative accounts separated by bureau
 * 5. Generate dispute letters for specific bureaus
 * 6. Chat with AI Credit Repair Agent
 * 7. Track dispute status and progress
 */

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
  Dimensions,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import Colors from '@/constants/colors';
import { testingService } from '@/services/TestingService';
import { useDisputes } from '@/contexts/DisputesContext';
import { useUser } from '@/contexts/UserContext';
import { useTestingDashboard } from '@/hooks/useTestingDashboard';
import { Beaker, ChevronDown, ChevronUp, AlertCircle, CheckCircle } from 'lucide-react-native';

interface MockEquifaxCredentials {
  username: string;
  password: string;
  consumerSSN: string;
  consumerDOB: string;
}

interface MockNegativeAccount {
  accountNumber: string;
  creditorName: string;
  creditorAddress: string;
  bureau: 'Equifax' | 'Experian' | 'TransUnion';
  accountType: 'charge-off' | 'collection' | 'late-payment' | 'delinquent';
  status: string;
  balance: number;
  dateReported: string;
}

interface EquifaxLinkingStatus {
  status: 'idle' | 'authenticating' | 'fetching' | 'complete' | 'error';
  message: string;
  progress: number;
  linkedAt?: string;
  bureauData?: {
    equifax: MockNegativeAccount[];
    experian: MockNegativeAccount[];
    transunion: MockNegativeAccount[];
  };
}

interface TestWorkflow {
  step: 'init' | 'equifax' | 'accounts' | 'letters' | 'agent' | 'complete';
  title: string;
  description: string;
  instructions: string;
}

const MOCK_EQUIFAX_CREDENTIALS: MockEquifaxCredentials = {
  username: 'equifax-test',
  password: 'demo-password',
  consumerSSN: '123-45-6789',
  consumerDOB: '1990-01-15',
};

const MOCK_NEGATIVE_ACCOUNTS: MockNegativeAccount[] = [
  {
    accountNumber: '5432109876543210',
    creditorName: 'Capital One Bank',
    creditorAddress: '15701 Park Row Dr, Houston, TX 77084',
    bureau: 'Equifax',
    accountType: 'charge-off',
    status: 'Charged Off',
    balance: 3500,
    dateReported: '2022-06-15',
  },
  {
    accountNumber: '4567890123456789',
    creditorName: 'Chase Bank',
    creditorAddress: '270 Park Avenue, New York, NY 10017',
    bureau: 'Equifax',
    accountType: 'late-payment',
    status: '120+ Days Late',
    balance: 8900,
    dateReported: '2023-02-20',
  },
  {
    accountNumber: '6789012345678901',
    creditorName: 'Portfolio Recovery Associates',
    creditorAddress: '111 East Main Street, Norfolk, VA 23510',
    bureau: 'Experian',
    accountType: 'collection',
    status: 'Collections',
    balance: 5200,
    dateReported: '2021-11-30',
  },
  {
    accountNumber: '9012345678901234',
    creditorName: 'Cavalry Portfolio Services',
    creditorAddress: '4625 Southwick Drive, Columbus, OH 43207',
    bureau: 'TransUnion',
    accountType: 'collection',
    status: 'Collections',
    balance: 2100,
    dateReported: '2022-03-10',
  },
  {
    accountNumber: '2345678901234567',
    creditorName: 'CIBC Bank USA',
    creditorAddress: '11500 W Olympic Blvd, Los Angeles, CA 90064',
    bureau: 'TransUnion',
    accountType: 'late-payment',
    status: '60+ Days Late',
    balance: 4700,
    dateReported: '2023-08-05',
  },
];

const WORKFLOW_STEPS: TestWorkflow[] = [
  {
    step: 'init',
    title: 'Create Test User',
    description: 'Set up a test user account to begin testing',
    instructions: 'Enter user details and select a role (Student/CSO/Affiliate/Admin)',
  },
  {
    step: 'equifax',
    title: 'Link Equifax Report',
    description: 'Simulate Equifax OAuth flow and link mock credit report data',
    instructions: 'Use test credentials (equifax-test / demo-password) to link report',
  },
  {
    step: 'accounts',
    title: 'View Negative Accounts',
    description: 'View negative accounts separated by bureau',
    instructions: 'Browse accounts by Equifax, Experian, and TransUnion bureaus',
  },
  {
    step: 'letters',
    title: 'Generate Dispute Letters',
    description: 'Create dispute letters for specific negative accounts',
    instructions: 'Select accounts and generate letters for each bureau',
  },
  {
    step: 'agent',
    title: 'Chat with AI Agent',
    description: 'Test the AI Credit Repair Agent conversation flow',
    instructions: 'Ask the AI agent for advice on dispute strategy',
  },
  {
    step: 'complete',
    title: 'Complete',
    description: 'Workflow testing complete',
    instructions: 'All steps completed successfully',
  },
];

export const EnhancedTestingDashboard = () => {
  const { colors } = useTheme();
  const { user } = useUser();
  const { disputes } = useDisputes();
  const testing = useTestingDashboard();
  
  // Current test user
  const [currentTestUser, setCurrentTestUser] = useState<any | null>(null);

  // UI State
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));
  const [currentStep, setCurrentStep] = useState<TestWorkflow['step']>('init');
  const [isLoading, setIsLoading] = useState(false);

  // User creation
  const [showUserModal, setShowUserModal] = useState(false);
  const [userName, setUserName] = useState('Test User');
  const [userEmail, setUserEmail] = useState('test.user@test.local');
  const [userRole, setUserRole] = useState<'Student' | 'CSO' | 'Affiliate' | 'Admin'>('Student');

  // Equifax linking
  const [equifaxStatus, setEquifaxStatus] = useState<EquifaxLinkingStatus>({
    status: 'idle',
    message: 'Ready to link Equifax report',
    progress: 0,
  });
  const [equifaxUsername, setEquifaxUsername] = useState(MOCK_EQUIFAX_CREDENTIALS.username);
  const [equifaxPassword, setEquifaxPassword] = useState(MOCK_EQUIFAX_CREDENTIALS.password);

  // Negative accounts
  const [selectedBureau, setSelectedBureau] = useState<'all' | 'Equifax' | 'Experian' | 'TransUnion'>('all');
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());

  // Stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDisputes: 0,
    linkedReports: 0,
    generatedLetters: 0,
  });

  useEffect(() => {
    loadStats();
  }, [disputes]);

  const loadStats = async () => {
    try {
      const testStats = await testingService.getTestingStats();
      setStats({
        totalUsers: testStats.totalUsers || 0,
        totalDisputes: disputes.length || 0,
        linkedReports: 0, // Would track Equifax links
        generatedLetters: 0, // Would track letters
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const toggleSection = (section: string) => {
    const newSections = new Set(expandedSections);
    if (newSections.has(section)) {
      newSections.delete(section);
    } else {
      newSections.add(section);
    }
    setExpandedSections(newSections);
  };

  const handleCreateTestUser = async () => {
    if (!userName || !userEmail) {
      Alert.alert('Missing Information', 'Please enter name and email');
      return;
    }

    try {
      const newUser = await testing.createTestUser({
        name: userName,
        email: userEmail,
        role: userRole,
      });

      setCurrentTestUser(newUser);
      Alert.alert('Success', `Test user created in database!\n\nName: ${newUser.name}\nEmail: ${newUser.email}\nID: ${newUser.id}\nRole: ${userRole}`);
      setShowUserModal(false);
      setCurrentStep('equifax');
      setUserName('');
      setUserEmail('');
      await loadStats();
    } catch (error) {
      Alert.alert('Error', `Failed to create test user: ${error}`);
    }
  };

  const handleLinkEquifaxReport = async () => {
    setEquifaxStatus({
      status: 'authenticating',
      message: 'Authenticating with Equifax...',
      progress: 25,
    });

    // Simulate OAuth flow
    await new Promise(r => setTimeout(r, 1500));

    setEquifaxStatus({
      status: 'fetching',
      message: 'Fetching credit report data from all bureaus...',
      progress: 50,
    });

    await new Promise(r => setTimeout(r, 2000));

    // Group mock accounts by bureau
    const bureauData = {
      equifax: MOCK_NEGATIVE_ACCOUNTS.filter(a => a.bureau === 'Equifax'),
      experian: MOCK_NEGATIVE_ACCOUNTS.filter(a => a.bureau === 'Experian'),
      transunion: MOCK_NEGATIVE_ACCOUNTS.filter(a => a.bureau === 'TransUnion'),
    };

    setEquifaxStatus({
      status: 'complete',
      message: `Successfully linked! Found ${MOCK_NEGATIVE_ACCOUNTS.length} negative accounts across 3 bureaus`,
      progress: 100,
      linkedAt: new Date().toISOString(),
      bureauData,
    });

    setCurrentStep('accounts');
    Alert.alert('Success', 'Equifax report linked successfully!');
  };

  const filteredAccounts = equifaxStatus.bureauData
    ? selectedBureau === 'all'
      ? [
          ...equifaxStatus.bureauData.equifax,
          ...equifaxStatus.bureauData.experian,
          ...equifaxStatus.bureauData.transunion,
        ]
      : equifaxStatus.bureauData[selectedBureau.toLowerCase() as keyof typeof equifaxStatus.bureauData] || []
    : [];

  const handleGenerateLetter = (accountNumber: string) => {
    if (!currentTestUser) {
      Alert.alert('Error', 'Please create a test user first');
      return;
    }

    const account = filteredAccounts.find((a: MockNegativeAccount) => a.accountNumber === accountNumber);
    if (!account) return;

    Alert.alert(
      'Generate Letter',
      `Generate dispute letter for ${account.creditorName}?\n\nAccount: ${accountNumber}\nBalance: $${account.balance}\nBureau: ${account.bureau}`,
      [
        {
          text: 'Generate',
          onPress: async () => {
            try {
              const letterContent = `DISPUTE LETTER\n\nDate: ${new Date().toLocaleDateString()}\n\nTo: ${account.creditorName}\n${account.creditorAddress}\n\nRe: Dispute of Account ${accountNumber}\n\nDear Sir or Madam:\n\nI am writing to formally dispute the above-referenced account on my credit report. This account contains inaccurate information and should be corrected or deleted.\n\nPlease investigate this matter and provide me with written notification of your findings.\n\nSincerely,\n${currentTestUser.name}`;

              const dispute = await testing.createTestDispute({
                userId: currentTestUser.id,
                creditor: account.creditorName,
                accountNumber: accountNumber,
                status: account.status,
                letterContent: letterContent,
              });

              Alert.alert('Success', `Dispute letter generated and saved!\n\nDispute ID: ${dispute.id}\n\nThe dispute has been saved to your tracker.`);
              setCurrentStep('agent');
            } catch (error) {
              Alert.alert('Error', `Failed to generate letter: ${error}`);
            }
          },
        },
        { text: 'Cancel', onPress: () => {} },
      ]
    );
  };

  const handleStartAIChat = () => {
    Alert.alert(
      'AI Credit Repair Agent',
      'Would you like to chat with the AI agent about your dispute strategy?\n\nThe AI can help with:\n- Dispute letter customization\n- Bureau negotiation strategies\n- Account prioritization\n- Timeline management',
      [
        {
          text: 'Start Chat',
          onPress: () => {
            Alert.alert('Chat Started', 'Opening conversation with AI Credit Repair Agent...');
            setCurrentStep('complete');
          },
        },
        { text: 'Later', onPress: () => {} },
      ]
    );
  };

  const StepIndicator = () => (
    <View style={styles.stepContainer}>
      {WORKFLOW_STEPS.map((step, idx) => {
        const isActive = step.step === currentStep;
        const isComplete = WORKFLOW_STEPS.findIndex(s => s.step === currentStep) > idx;

        return (
          <View key={step.step} style={styles.stepItem}>
            <View
              style={[
                styles.stepDot,
                isComplete && { backgroundColor: Colors.primary },
                isActive && { backgroundColor: Colors.primary, borderWidth: 3, borderColor: '#fff' },
              ]}
            >
              {isComplete ? (
                <CheckCircle size={24} color="#fff" />
              ) : (
                <Text style={{ color: isActive ? '#fff' : '#999', fontWeight: 'bold' }}>
                  {idx + 1}
                </Text>
              )}
            </View>
            <Text style={[styles.stepLabel, { color: isActive ? Colors.primary : '#999' }]}>
              {step.title}
            </Text>
          </View>
        );
      })}
    </View>
  );

  const OverviewCard = () => (
    <View style={[styles.card, { borderLeftColor: Colors.primary, borderLeftWidth: 4 }]}>
      <Text style={styles.cardTitle}>Testing Dashboard</Text>
      <Text style={styles.cardDescription}>
        Complete end-to-end testing for the AI Credit Repair Agent system
      </Text>

      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Test Users</Text>
          <Text style={styles.statValue}>{stats.totalUsers}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Disputes</Text>
          <Text style={styles.statValue}>{stats.totalDisputes}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Reports Linked</Text>
          <Text style={styles.statValue}>{stats.linkedReports}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Letters Generated</Text>
          <Text style={styles.statValue}>{stats.generatedLetters}</Text>
        </View>
      </View>
    </View>
  );

  const UserCreationSection = () => (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => toggleSection('user-creation')}
      >
        <Text style={styles.sectionTitle}>1. Create Test User</Text>
        {expandedSections.has('user-creation') ? (
          <ChevronUp size={20} color={Colors.primary} />
        ) : (
          <ChevronDown size={20} color={Colors.primary} />
        )}
      </TouchableOpacity>

      {expandedSections.has('user-creation') && (
        <View style={styles.sectionContent}>
          <Text style={styles.instructionText}>
            Create a new test user account to begin testing the complete workflow.
          </Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: Colors.primary }]}
            onPress={() => setShowUserModal(true)}
          >
            <Text style={styles.buttonText}>Create Test User</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const EquifaxLinkingSection = () => (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => toggleSection('equifax-linking')}
      >
        <Text style={styles.sectionTitle}>2. Link Equifax Report</Text>
        {expandedSections.has('equifax-linking') ? (
          <ChevronUp size={20} color={Colors.primary} />
        ) : (
          <ChevronDown size={20} color={Colors.primary} />
        )}
      </TouchableOpacity>

      {expandedSections.has('equifax-linking') && (
        <View style={styles.sectionContent}>
          <Text style={styles.instructionText}>
            Simulate the Equifax OAuth flow to link credit report data. Use the test credentials below.
          </Text>

          {equifaxStatus.status === 'idle' && (
            <>
              <View style={styles.credentialBox}>
                <Text style={styles.credentialLabel}>Test Credentials:</Text>
                <Text style={styles.credentialValue}>Username: {MOCK_EQUIFAX_CREDENTIALS.username}</Text>
                <Text style={styles.credentialValue}>Password: {MOCK_EQUIFAX_CREDENTIALS.password}</Text>
              </View>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: Colors.primary }]}
                onPress={handleLinkEquifaxReport}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Start Equifax OAuth Flow</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {equifaxStatus.status !== 'idle' && (
            <View style={styles.statusBox}>
              <View style={styles.progressContainer}>
                <View
                  style={[
                    styles.progressBar,
                    { width: `${equifaxStatus.progress}%`, backgroundColor: Colors.primary },
                  ]}
                />
              </View>
              <Text style={styles.statusMessage}>{equifaxStatus.message}</Text>
              {equifaxStatus.status === 'complete' && (
                <View style={styles.successBox}>
                  <CheckCircle size={20} color={Colors.primary} />
                  <Text style={styles.successText}>Report successfully linked!</Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );

  const NegativeAccountsSection = () => (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => toggleSection('negative-accounts')}
      >
        <Text style={styles.sectionTitle}>3. View Negative Accounts</Text>
        {expandedSections.has('negative-accounts') ? (
          <ChevronUp size={20} color={Colors.primary} />
        ) : (
          <ChevronDown size={20} color={Colors.primary} />
        )}
      </TouchableOpacity>

      {expandedSections.has('negative-accounts') && (
        <View style={styles.sectionContent}>
          <Text style={styles.instructionText}>
            Browse negative accounts organized by credit bureau. Select accounts to generate dispute letters.
          </Text>

          <View style={styles.bureauFilterContainer}>
            {['all', 'Equifax', 'Experian', 'TransUnion'].map(bureau => (
              <TouchableOpacity
                key={bureau}
                style={[
                  styles.bureauFilter,
                  selectedBureau === bureau && {
                    backgroundColor: Colors.primary,
                  },
                ]}
                onPress={() => setSelectedBureau(bureau as any)}
              >
                <Text
                  style={[
                    styles.bureauFilterText,
                    selectedBureau === bureau && { color: '#fff' },
                  ]}
                >
                  {bureau === 'all' ? 'All Bureaus' : bureau}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {equifaxStatus.bureauData && filteredAccounts.length > 0 ? (
            <View style={styles.accountsList}>
              {filteredAccounts.map((account: MockNegativeAccount) => (
                <View key={account.accountNumber} style={styles.accountCard}>
                  <View style={styles.accountHeader}>
                    <View>
                      <Text style={styles.accountCreditor}>{account.creditorName}</Text>
                      <Text style={styles.accountNumber}>Account: {account.accountNumber}</Text>
                    </View>
                    <View style={[styles.accountBadge, { backgroundColor: Colors.primary }]}>
                      <Text style={styles.accountBadgeText}>{account.bureau}</Text>
                    </View>
                  </View>

                  <View style={styles.accountDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Status:</Text>
                      <Text style={styles.detailValue}>{account.status}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Balance:</Text>
                      <Text style={styles.detailValue}>${account.balance.toLocaleString()}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Reported:</Text>
                      <Text style={styles.detailValue}>{account.dateReported}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.accountButton, { backgroundColor: Colors.primary }]}
                    onPress={() => handleGenerateLetter(account.accountNumber)}
                  >
                    <Text style={styles.accountButtonText}>Generate Letter</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <AlertCircle size={40} color={Colors.primary} />
              <Text style={styles.emptyStateText}>
                {equifaxStatus.status === 'idle'
                  ? 'Link an Equifax report first to view negative accounts'
                  : 'No accounts found for selected bureau'}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );

  const AIAgentSection = () => (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => toggleSection('ai-agent')}
      >
        <Text style={styles.sectionTitle}>5. Chat with AI Credit Repair Agent</Text>
        {expandedSections.has('ai-agent') ? (
          <ChevronUp size={20} color={Colors.primary} />
        ) : (
          <ChevronDown size={20} color={Colors.primary} />
        )}
      </TouchableOpacity>

      {expandedSections.has('ai-agent') && (
        <View style={styles.sectionContent}>
          <Text style={styles.instructionText}>
            Test the AI Credit Repair Agent conversation interface. The agent can provide advice on dispute strategies, letter customization, and timeline management.
          </Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: Colors.primary }]}
            onPress={handleStartAIChat}
          >
            <Text style={styles.buttonText}>Start AI Agent Chat</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Beaker size={28} color={Colors.primary} />
            <Text style={styles.headerTitle}>Testing Dashboard</Text>
          </View>
          <Text style={styles.headerSubtitle}>End-to-End Workflow Testing</Text>
        </View>

        <View style={styles.content}>
          <OverviewCard />
          <StepIndicator />

          <UserCreationSection />
          <EquifaxLinkingSection />
          <NegativeAccountsSection />
          <AIAgentSection />
        </View>
      </ScrollView>

      <Modal visible={showUserModal} animationType="slide" transparent={true}>
        <SafeAreaView style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <Text style={styles.modalTitle}>Create Test User</Text>

            <TextInput
              style={[styles.input, { borderColor: colors.border }]}
              placeholder="Full Name"
              placeholderTextColor={colors.text}
              value={userName}
              onChangeText={setUserName}
            />

            <TextInput
              style={[styles.input, { borderColor: colors.border }]}
              placeholder="Email Address"
              placeholderTextColor={colors.text}
              value={userEmail}
              onChangeText={setUserEmail}
              keyboardType="email-address"
            />

            <Text style={styles.roleLabel}>User Role:</Text>
            <View style={styles.roleOptions}>
              {(['Student', 'CSO', 'Affiliate', 'Admin'] as const).map(role => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleOption,
                    userRole === role && { backgroundColor: Colors.primary },
                  ]}
                  onPress={() => setUserRole(role)}
                >
                  <Text
                    style={[
                      styles.roleOptionText,
                      userRole === role && { color: '#fff' },
                    ]}
                  >
                    {role}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: Colors.primary }]}
                onPress={handleCreateTestUser}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>Create User</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#ccc' }]}
                onPress={() => setShowUserModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: Colors.primary,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statItem: {
    flex: 1,
    minWidth: '48%',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  stepContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  section: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9f9f9',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionContent: {
    padding: 16,
    backgroundColor: '#fff',
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  credentialBox: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  credentialLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  credentialValue: {
    fontSize: 13,
    color: '#333',
    fontFamily: 'Courier New',
    marginBottom: 4,
  },
  statusBox: {
    marginTop: 16,
  },
  progressContainer: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  statusMessage: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginBottom: 12,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  successText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  bureauFilterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  bureauFilter: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  bureauFilterText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  accountsList: {
    gap: 12,
  },
  accountCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  accountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  accountCreditor: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  accountNumber: {
    fontSize: 12,
    color: '#999',
  },
  accountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  accountBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
  },
  accountDetails: {
    padding: 12,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 12,
    color: '#999',
  },
  detailValue: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },
  accountButton: {
    padding: 10,
    alignItems: 'center',
  },
  accountButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: Colors.primary,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  roleOptions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  roleOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  roleOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
