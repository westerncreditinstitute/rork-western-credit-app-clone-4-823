import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Card } from '@/components/ui';
import { Shield, BarChart3, Zap, Target, Award, Users } from 'lucide-react-native';

interface AIAgentProfileProps {
  agentId?: string;
  onClose?: () => void;
}

export function AIAgentProfile({ onClose }: AIAgentProfileProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero Section with Gradient Background */}
      <View style={[styles.heroSection, { backgroundColor: colors.primary + '15' }]}>
        <View style={styles.heroGradient}>
          {/* Profile Image */}
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
            }}
            style={styles.profileImage}
          />
          
          {/* Status Indicator - AI Badge */}
          <View style={[styles.aiBadge, { backgroundColor: colors.success }]}>
            <Zap size={14} color="white" />
            <Text style={styles.aiBadgeText}>AI</Text>
          </View>
        </View>

        {/* Agent Info */}
        <View style={styles.agentInfo}>
          <Text style={[styles.agentName, { color: colors.text }]}>
            Alexandria Rivers
          </Text>
          <Text style={[styles.agentTitle, { color: colors.primary }]}>
            Credit Repair Specialist
          </Text>
          <Text style={[styles.agentSubtitle, { color: colors.textSecondary }]}>
            AI Credit Repair Agent • 4+ Years Experience
          </Text>
        </View>
      </View>

      {/* Bio Section */}
      <Card variant="default" padding="lg" style={styles.bioCard}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          About Alexandria
        </Text>
        <Text style={[styles.bioText, { color: colors.textSecondary }]}>
          Alexandria is an advanced AI Credit Repair Agent trained on thousands of successful dispute cases. Specializing in FCRA compliance, FDCPA violations, and credit report inaccuracies, she provides data-driven recommendations to help clients rebuild their credit scores.
        </Text>
        <Text style={[styles.bioText, { color: colors.textSecondary, marginTop: 12 }]}>
          With real-time access to credit monitoring tools and dispute tracking, Alexandria guides clients through every step of the credit repair process with precision and expertise.
        </Text>
      </Card>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: colors.success + '15' }]}>
          <View style={[styles.statIcon, { backgroundColor: colors.success + '30' }]}>
            <Target size={24} color={colors.success} />
          </View>
          <Text style={[styles.statValue, { color: colors.success }]}>98.7%</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Success Rate
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.primary + '15' }]}>
          <View style={[styles.statIcon, { backgroundColor: colors.primary + '30' }]}>
            <Award size={24} color={colors.primary} />
          </View>
          <Text style={[styles.statValue, { color: colors.primary }]}>1,247</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Cases Resolved
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.info + '15' }]}>
          <View style={[styles.statIcon, { backgroundColor: colors.info + '30' }]}>
            <BarChart3 size={24} color={colors.info} />
          </View>
          <Text style={[styles.statValue, { color: colors.info }]}>+89 pts</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Avg Score Increase
          </Text>
        </View>
      </View>

      {/* Specializations */}
      <Card variant="default" padding="lg" style={styles.specializationCard}>
        <View style={styles.specHeader}>
          <Shield size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text, marginLeft: 8 }]}>
            Specializations
          </Text>
        </View>
        
        <View style={styles.tagContainer}>
          {[
            'FCRA Compliance',
            'FDCPA Violations',
            'Dispute Letters',
            'Credit Monitoring',
            'Account Validation',
            'Error Correction',
            'Score Recovery',
            'Fraud Detection',
          ].map((tag) => (
            <View
              key={tag}
              style={[styles.tag, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
            >
              <Text style={[styles.tagText, { color: colors.primary }]}>
                {tag}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Capabilities */}
      <Card variant="default" padding="lg" style={styles.capabilitiesCard}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Capabilities
        </Text>
        
        {[
          {
            icon: <Zap size={18} color={colors.success} />,
            title: 'Instant Analysis',
            description: 'Real-time credit report analysis and dispute recommendations',
          },
          {
            icon: <Target size={18} color={colors.primary} />,
            title: 'Automated Letters',
            description: 'Generate legally-compliant dispute letters in seconds',
          },
          {
            icon: <BarChart3 size={18} color={colors.info} />,
            title: 'Progress Tracking',
            description: 'Monitor disputes from filing to resolution',
          },
          {
            icon: <Shield size={18} color={colors.warning} />,
            title: 'Compliance Verification',
            description: 'Ensure all actions comply with FCRA and FDCPA regulations',
          },
        ].map((capability, index) => (
          <View key={index} style={styles.capabilityRow}>
            {capability.icon}
            <View style={styles.capabilityText}>
              <Text style={[styles.capabilityTitle, { color: colors.text }]}>
                {capability.title}
              </Text>
              <Text style={[styles.capabilityDesc, { color: colors.textSecondary }]}>
                {capability.description}
              </Text>
            </View>
          </View>
        ))}
      </Card>

      {/* Response Stats */}
      <Card variant="default" padding="lg" style={styles.responseCard}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Response Quality
        </Text>
        
        <View style={styles.responseMetric}>
          <View style={styles.metricLabel}>
            <Text style={[styles.metricTitle, { color: colors.text }]}>
              Average Response Time
            </Text>
            <Text style={[styles.metricValue, { color: colors.primary }]}>
              2.3 seconds
            </Text>
          </View>
        </View>

        <View style={styles.responseMetric}>
          <View style={styles.metricLabel}>
            <Text style={[styles.metricTitle, { color: colors.text }]}>
              Accuracy Rating
            </Text>
            <Text style={[styles.metricValue, { color: colors.success }]}>
              99.2%
            </Text>
          </View>
        </View>

        <View style={styles.responseMetric}>
          <View style={styles.metricLabel}>
            <Text style={[styles.metricTitle, { color: colors.text }]}>
              Client Satisfaction
            </Text>
            <Text style={[styles.metricValue, { color: colors.success }]}>
              4.9/5.0 ⭐
            </Text>
          </View>
        </View>
      </Card>

      {/* CTA Button */}
      <TouchableOpacity
        style={[styles.ctaButton, { backgroundColor: colors.primary }]}
        onPress={onClose}
      >
        <Text style={styles.ctaButtonText}>Start Consultation</Text>
      </TouchableOpacity>

      {/* Disclaimer */}
      <View style={[styles.disclaimer, { backgroundColor: colors.surface }]}>
        <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
          Alexandria is an AI assistant designed to provide credit repair guidance and support. While she leverages advanced machine learning and legal knowledge, all recommendations should be reviewed for your specific situation. Not licensed as a lawyer or credit counselor.
        </Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    heroSection: {
      alignItems: 'center',
      paddingVertical: 24,
      paddingHorizontal: 16,
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: 20,
    },
    heroGradient: {
      position: 'relative',
      alignItems: 'center',
      marginBottom: 16,
    },
    profileImage: {
      width: 120,
      height: 120,
      borderRadius: 60,
      borderWidth: 3,
      borderColor: colors.primary,
      marginBottom: 12,
    },
    aiBadge: {
      position: 'absolute',
      bottom: 8,
      right: -8,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 20,
      gap: 4,
    },
    aiBadgeText: {
      color: 'white',
      fontSize: 12,
      fontWeight: '600',
    },
    agentInfo: {
      alignItems: 'center',
    },
    agentName: {
      fontSize: 24,
      fontWeight: '700',
      marginBottom: 4,
    },
    agentTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
    },
    agentSubtitle: {
      fontSize: 13,
      fontWeight: '500',
    },
    bioCard: {
      marginHorizontal: 16,
      marginVertical: 16,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 12,
    },
    bioText: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '500',
    },
    statsGrid: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      gap: 12,
      marginBottom: 16,
    },
    statCard: {
      flex: 1,
      borderRadius: 16,
      padding: 12,
      alignItems: 'center',
    },
    statIcon: {
      width: 40,
      height: 40,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    statValue: {
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 11,
      fontWeight: '600',
      textAlign: 'center',
    },
    specializationCard: {
      marginHorizontal: 16,
      marginBottom: 16,
    },
    specHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    tagContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    tag: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
    },
    tagText: {
      fontSize: 12,
      fontWeight: '600',
    },
    capabilitiesCard: {
      marginHorizontal: 16,
      marginBottom: 16,
    },
    capabilityRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 16,
      gap: 12,
    },
    capabilityText: {
      flex: 1,
    },
    capabilityTitle: {
      fontSize: 14,
      fontWeight: '700',
      marginBottom: 2,
    },
    capabilityDesc: {
      fontSize: 12,
      lineHeight: 16,
    },
    responseCard: {
      marginHorizontal: 16,
      marginBottom: 16,
    },
    responseMetric: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    metricLabel: {
      flex: 1,
    },
    metricTitle: {
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 4,
    },
    metricValue: {
      fontSize: 16,
      fontWeight: '700',
    },
    ctaButton: {
      marginHorizontal: 16,
      marginBottom: 24,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
    },
    ctaButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '700',
    },
    disclaimer: {
      marginHorizontal: 16,
      marginBottom: 16,
      padding: 12,
      borderRadius: 12,
      borderLeftWidth: 3,
      borderLeftColor: colors.warning,
    },
    disclaimerText: {
      fontSize: 11,
      lineHeight: 16,
      fontWeight: '500',
    },
  });
