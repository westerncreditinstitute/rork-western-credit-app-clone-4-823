/**
 * Incident Detail Screen
 * Detailed view of a single financial incident occurrence
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  DollarSign,
  Shield,
  Calendar,
  AlertTriangle,
  TrendingDown,
  Info,
  X,
} from 'lucide-react-native';
import { useLocalSearchParams } from 'expo-router';

import { IncidentOccurrence } from '@/types/financial-incidents';

interface IncidentDetailScreenProps {
  route?: {
    params: {
      incident: IncidentOccurrence;
    };
  };
  navigation?: any;
}

const IncidentDetailScreen: React.FC<IncidentDetailScreenProps> = ({
  route,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  // Get incident from route params or props
  const incidentParam = params.incident as string | undefined;
  const incident = route?.params?.incident || (incidentParam ? JSON.parse(incidentParam) : null);

  if (!incident) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.errorContainer}>
          <X size={48} color="#ef4444" />
          <Text style={styles.errorText}>Incident not found</Text>
        </View>
      </View>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'minor':
        return '#22c55e';
      case 'moderate':
        return '#f59e0b';
      case 'major':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'minor':
        return 'Minor';
      case 'moderate':
        return 'Moderate';
      case 'major':
        return 'Major';
      default:
        return 'Unknown';
    }
  };

  const handleShareIncident = () => {
    Alert.alert(
      'Share Incident',
      'This would open a share dialog to share the incident details',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIconContainer}>
            <AlertTriangle
              size={48}
              color={getSeverityColor(incident.severity)}
            />
          </View>
          <Text style={styles.headerTitle}>{incident.incidentName}</Text>
          <Text style={styles.headerDescription}>{incident.description}</Text>

          <View style={styles.headerBadges}>
            <View
              style={[
                styles.severityBadge,
                { backgroundColor: getSeverityColor(incident.severity) + '20' },
              ]}
            >
              <Text
                style={[
                  styles.severityBadgeText,
                  { color: getSeverityColor(incident.severity) },
                ]}
              >
                {getSeverityLabel(incident.severity)}
              </Text>
            </View>

            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>
                {incident.category.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Cost Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cost Breakdown</Text>

          <View style={styles.costCard}>
            <View style={styles.costRow}>
              <View style={styles.costRowLeft}>
                <DollarSign size={20} color="#6b7280" />
                <Text style={styles.costRowLabel}>Base Cost</Text>
              </View>
              <Text style={styles.costRowValue}>
                ${incident.baseCost.toLocaleString()}
              </Text>
            </View>

            {incident.mitigationApplied && (
              <View style={styles.costRow}>
                <View style={styles.costRowLeft}>
                  <Shield size={20} color="#22c55e" />
                  <Text style={styles.costRowLabel}>
                    {incident.mitigationApplied.name}
                  </Text>
                </View>
                <View style={styles.costRowRight}>
                  {incident.mitigationApplied.monthlyCost && (
                    <Text style={styles.costRowSubValue}>
                      (${incident.mitigationApplied.monthlyCost}/mo)
                    </Text>
                  )}
                  {incident.mitigationApplied.fixedCost && (
                    <Text style={styles.costRowSubValue}>
                      (${incident.mitigationApplied.fixedCost} deductible)
                    </Text>
                  )}
                </View>
              </View>
            )}

            {incident.savingsFromMitigation > 0 && (
              <View style={[styles.costRow, styles.savingsRow]}>
                <View style={styles.costRowLeft}>
                  <TrendingDown size={20} color="#22c55e" />
                  <Text style={styles.costRowLabel}>Savings</Text>
                </View>
                <Text style={[styles.costRowValue, styles.savingsValue]}>
                  -${incident.savingsFromMitigation.toLocaleString()}
                </Text>
              </View>
            )}

            <View style={[styles.costRow, styles.totalRow]}>
              <View style={styles.costRowLeft}>
                <DollarSign size={20} color="#6366f1" />
                <Text style={styles.costRowLabel}>Total Cost</Text>
              </View>
              <Text style={[styles.costRowValue, styles.totalValue]}>
                ${incident.actualCost.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Incident Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Incident Details</Text>

          <View style={styles.detailRow}>
            <Calendar size={20} color="#6b7280" />
            <Text style={styles.detailLabel}>Occurred</Text>
            <Text style={styles.detailValue}>
              Month {incident.monthNumber}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <AlertTriangle size={20} color="#6b7280" />
            <Text style={styles.detailLabel}>Category</Text>
            <Text style={styles.detailValue}>
              {incident.category.replace('_', ' ').toUpperCase()}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Info size={20} color="#6b7280" />
            <Text style={styles.detailLabel}>ID</Text>
            <Text style={styles.detailValue}>
              {incident.id}
            </Text>
          </View>
        </View>

        {/* Mitigation Applied */}
        {incident.mitigationApplied && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mitigation Applied</Text>

            <View style={styles.mitigationCard}>
              <View style={styles.mitigationHeader}>
                <Shield size={24} color="#6366f1" />
                <Text style={styles.mitigationTitle}>
                  {incident.mitigationApplied.name}
                </Text>
              </View>

              <Text style={styles.mitigationDescription}>
                {incident.mitigationApplied.description}
              </Text>

              <View style={styles.mitigationDetails}>
                <View style={styles.mitigationDetail}>
                  <Text style={styles.mitigationDetailLabel}>Type</Text>
                  <Text style={styles.mitigationDetailValue}>
                    {incident.mitigationApplied.type.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>

                {incident.mitigationApplied.coveragePercentage !== undefined && (
                  <View style={styles.mitigationDetail}>
                    <Text style={styles.mitigationDetailLabel}>Coverage</Text>
                    <Text style={styles.mitigationDetailValue}>
                      {incident.mitigationApplied.coveragePercentage}%
                    </Text>
                  </View>
                )}

                {incident.mitigationApplied.monthlyCost && (
                  <View style={styles.mitigationDetail}>
                    <Text style={styles.mitigationDetailLabel}>Monthly Cost</Text>
                    <Text style={styles.mitigationDetailValue}>
                      ${incident.mitigationApplied.monthlyCost}
                    </Text>
                  </View>
                )}

                {incident.mitigationApplied.upfrontCost && (
                  <View style={styles.mitigationDetail}>
                    <Text style={styles.mitigationDetailLabel}>Upfront Cost</Text>
                    <Text style={styles.mitigationDetailValue}>
                      ${incident.mitigationApplied.upfrontCost}
                    </Text>
                  </View>
                )}

                {incident.mitigationApplied.fixedCost && (
                  <View style={styles.mitigationDetail}>
                    <Text style={styles.mitigationDetailLabel}>Deductible</Text>
                    <Text style={styles.mitigationDetailValue}>
                      ${incident.mitigationApplied.fixedCost}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Educational Message */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lesson Learned</Text>

          <View style={styles.educationalCard}>
            <Info size={24} color="#6366f1" />
            <View style={styles.educationalContent}>
              <Text style={styles.educationalTitle}>Financial Insight</Text>
              <Text style={styles.educationalText}>
                {incident.educationalMessage}
              </Text>
            </View>
          </View>
        </View>

        {/* Impact on Game State */}
        {(incident.creditScoreImpact || incident.healthImpact) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Impact</Text>

            {incident.creditScoreImpact !== undefined && (
              <View style={styles.impactRow}>
                <Text style={styles.impactLabel}>Credit Score</Text>
                <Text
                  style={[
                    styles.impactValue,
                    incident.creditScoreImpact < 0 && styles.impactValueNegative,
                    incident.creditScoreImpact > 0 && styles.impactValuePositive,
                  ]}
                >
                  {incident.creditScoreImpact > 0 ? '+' : ''}
                  {incident.creditScoreImpact}
                </Text>
              </View>
            )}

            {incident.healthImpact !== undefined && (
              <View style={styles.impactRow}>
                <Text style={styles.impactLabel}>Health</Text>
                <Text
                  style={[
                    styles.impactValue,
                    incident.healthImpact < 0 && styles.impactValueNegative,
                    incident.healthImpact > 0 && styles.impactValuePositive,
                  ]}
                >
                  {incident.healthImpact > 0 ? '+' : ''}
                  {incident.healthImpact}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleShareIncident}
          >
            <Text style={styles.actionButtonText}>Share Incident</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryActionButton]}
            onPress={() => {
              Alert.alert(
                'Report Issue',
                'This would allow you to report an issue with this incident',
                [{ text: 'OK' }]
              );
            }}
          >
            <Text style={[styles.actionButtonText, styles.secondaryActionButtonText]}>
              Report Issue
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    flex: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    alignItems: 'center',
  },
  headerIconContainer: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  headerDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  headerBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  severityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  severityBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoryBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  costCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  costRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  costRowLabel: {
    fontSize: 14,
    color: '#4b5563',
    marginLeft: 8,
  },
  costRowRight: {
    alignItems: 'flex-end',
  },
  costRowSubValue: {
    fontSize: 11,
    color: '#9ca3af',
  },
  costRowValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  savingsRow: {
    backgroundColor: '#f0fdf4',
  },
  savingsValue: {
    color: '#22c55e',
  },
  totalRow: {
    borderBottomWidth: 0,
    paddingTop: 16,
    marginTop: 4,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 12,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  mitigationCard: {
    backgroundColor: '#e0e7ff',
    borderRadius: 12,
    padding: 16,
  },
  mitigationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  mitigationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4338ca',
    marginLeft: 12,
  },
  mitigationDescription: {
    fontSize: 14,
    color: '#4338ca',
    marginBottom: 12,
    lineHeight: 20,
  },
  mitigationDetails: {
    gap: 8,
  },
  mitigationDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mitigationDetailLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  mitigationDetailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4338ca',
  },
  educationalCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    borderLeftWidth: 4,
    borderLeftColor: '#22c55e',
  },
  educationalContent: {
    flex: 1,
    marginLeft: 12,
  },
  educationalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 4,
  },
  educationalText: {
    fontSize: 13,
    color: '#15803d',
    lineHeight: 18,
  },
  impactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  impactLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  impactValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  impactValueNegative: {
    color: '#ef4444',
  },
  impactValuePositive: {
    color: '#22c55e',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 32,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#6366f1',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryActionButton: {
    backgroundColor: '#f3f4f6',
  },
  secondaryActionButtonText: {
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
  },
});

export default IncidentDetailScreen;