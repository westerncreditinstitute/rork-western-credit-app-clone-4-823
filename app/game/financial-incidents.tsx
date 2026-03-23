/**
 * Financial Incidents Screen
 * Main screen for viewing and managing financial incidents
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  DollarSign,
  AlertTriangle,
  Shield,
  TrendingUp,
  TrendingDown,
  Calendar,
  Filter,
  Settings,
  RefreshCw,
} from 'lucide-react-native';

import {
  useFinancialIncidents,
  useIncidentStats,
  useRecentIncidents,
} from '@/contexts/FinancialIncidentsContext';
import {
  IncidentSeverity,
  IncidentCategory,
} from '@/types/financial-incidents';

interface FinancialIncidentsScreenProps {
  navigation?: any;
}

const FinancialIncidentsScreen: React.FC<FinancialIncidentsScreenProps> = ({
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const {
    incidents,
    currentMonth,
    statistics,
    isLoading,
    error,
    generateIncidentsForMonth,
    clearHistory,
    mitigationProfile,
    getIncidentHistory,
  } = useFinancialIncidents();

  const stats = useIncidentStats();
  const recentIncidents = useRecentIncidents(5);

  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'minor' | 'moderate' | 'major'>('all');

  useEffect(() => {
    navigation?.setOptions({
      headerRight: () => (
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation?.navigate('FinancialIncidentsSettings')}
        >
          <Settings size={24} color="#6366f1" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const handleGenerateIncidents = async () => {
    Alert.alert(
      'Generate Incidents',
      'This will simulate potential financial incidents for the current month. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: async () => {
            await generateIncidentsForMonth(mitigationProfile);
          },
        },
      ]
    );
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // In a real app, this would refresh from a backend
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to clear all incident history? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearHistory();
            Alert.alert('Success', 'Incident history cleared');
          },
        },
      ]
    );
  };

  const getSeverityColor = (severity: IncidentSeverity) => {
    switch (severity) {
      case IncidentSeverity.MINOR:
        return '#22c55e'; // green
      case IncidentSeverity.MODERATE:
        return '#f59e0b'; // yellow
      case IncidentSeverity.MAJOR:
        return '#ef4444'; // red
      default:
        return '#6b7280';
    }
  };

  const getSeverityLabel = (severity: IncidentSeverity) => {
    switch (severity) {
      case IncidentSeverity.MINOR:
        return 'Minor';
      case IncidentSeverity.MODERATE:
        return 'Moderate';
      case IncidentSeverity.MAJOR:
        return 'Major';
      default:
        return 'Unknown';
    }
  };

  const filteredIncidents = incidents.filter(incident => {
    if (selectedFilter === 'all') return true;
    return incident.severity === selectedFilter;
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Financial Incidents</Text>
          <Text style={styles.headerSubtitle}>
            Month {currentMonth} • {incidents.length} incidents total
          </Text>
        </View>
        <TouchableOpacity
          style={styles.generateButton}
          onPress={handleGenerateIncidents}
          disabled={isLoading}
        >
          <RefreshCw
            size={20}
            color="#ffffff"
            style={isLoading ? styles.rotating : {}}
          />
          <Text style={styles.generateButtonText}>Generate</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Error State */}
        {error && (
          <View style={styles.errorContainer}>
            <AlertTriangle size={20} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Statistics Cards */}
        {stats && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <DollarSign size={24} color="#ef4444" />
                <Text style={styles.statLabel}>Total Cost</Text>
              </View>
              <Text style={styles.statValue}>
                ${stats.totalCostIncurred.toLocaleString()}
              </Text>
              <Text style={styles.statSublabel}>
                ${stats.totalSavingsFromMitigation.toLocaleString()} saved
              </Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <Shield size={24} color="#22c55e" />
                <Text style={styles.statLabel}>Total Incidents</Text>
              </View>
              <Text style={styles.statValue}>{stats.totalIncidents}</Text>
              <Text style={styles.statSublabel}>All categories</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <TrendingUp size={24} color="#6366f1" />
                <Text style={styles.statLabel}>ROI</Text>
              </View>
              <Text style={styles.statValue}>
                {stats.mitigationEffectiveness.roi.toFixed(1)}%
              </Text>
              <Text style={styles.statSublabel}>Mitigation effectiveness</Text>
            </View>
          </View>
        )}

        {/* Filters */}
        <View style={styles.filtersContainer}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedFilter === 'all' && styles.filterChipActive,
            ]}
            onPress={() => setSelectedFilter('all')}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === 'all' && styles.filterChipTextActive,
              ]}
            >
              All ({incidents.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedFilter === 'minor' && styles.filterChipActive,
            ]}
            onPress={() => setSelectedFilter('minor')}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === 'minor' && styles.filterChipTextActive,
              ]}
            >
              Minor (
              {incidents.filter(i => i.severity === IncidentSeverity.MINOR).length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedFilter === 'moderate' && styles.filterChipActive,
            ]}
            onPress={() => setSelectedFilter('moderate')}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === 'moderate' && styles.filterChipTextActive,
              ]}
            >
              Moderate (
              {incidents.filter(i => i.severity === IncidentSeverity.MODERATE).length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedFilter === 'major' && styles.filterChipActive,
            ]}
            onPress={() => setSelectedFilter('major')}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === 'major' && styles.filterChipTextActive,
              ]}
            >
              Major (
              {incidents.filter(i => i.severity === IncidentSeverity.MAJOR).length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Recent Incidents */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Incidents</Text>
            {incidents.length > 0 && (
              <TouchableOpacity onPress={handleClearHistory}>
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>

          {filteredIncidents.length === 0 ? (
            <View style={styles.emptyState}>
              <Shield size={48} color="#6b7280" />
              <Text style={styles.emptyStateText}>
                No incidents recorded yet
              </Text>
              <Text style={styles.emptyStateSubtext}>
                Generate incidents to see potential financial events
              </Text>
            </View>
          ) : (
            filteredIncidents.slice().reverse().map((incident) => (
              <TouchableOpacity
                key={incident.id}
                style={styles.incidentCard}
                onPress={() => navigation?.navigate('IncidentDetail', { incident })}
              >
                <View style={styles.incidentHeader}>
                  <View style={styles.incidentTitleContainer}>
                    <AlertTriangle
                      size={20}
                      color={getSeverityColor(incident.severity)}
                    />
                    <Text style={styles.incidentTitle}>{incident.incidentName}</Text>
                  </View>
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
                </View>

                <Text style={styles.incidentDescription}>
                  {incident.description}
                </Text>

                <View style={styles.incidentDetails}>
                  <View style={styles.incidentDetail}>
                    <Calendar size={16} color="#6b7280" />
                    <Text style={styles.incidentDetailText}>
                      Month {incident.monthNumber}
                    </Text>
                  </View>

                  <View style={styles.incidentDetail}>
                    <DollarSign size={16} color="#6b7280" />
                    <Text style={styles.incidentDetailText}>
                      Base: ${incident.baseCost.toLocaleString()}
                    </Text>
                  </View>

                  {incident.savingsFromMitigation > 0 && (
                    <View style={styles.incidentDetail}>
                      <TrendingDown size={16} color="#22c55e" />
                      <Text style={[styles.incidentDetailText, styles.savingsText]}>
                        Saved: ${incident.savingsFromMitigation.toLocaleString()}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.incidentFooter}>
                  <View
                    style={[
                      styles.costBadge,
                      incident.actualCost === 0 && styles.costBadgeZero,
                    ]}
                  >
                    <Text
                      style={[
                        styles.costBadgeText,
                        incident.actualCost === 0 && styles.costBadgeTextZero,
                      ]}
                    >
                      ${incident.actualCost.toLocaleString()}
                    </Text>
                  </View>

                  {incident.mitigationApplied && (
                    <View style={styles.mitigationBadge}>
                      <Shield size={14} color="#6366f1" />
                      <Text style={styles.mitigationBadgeText}>
                        {incident.mitigationApplied.name}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Educational Tips */}
        {stats && stats.totalIncidents > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Financial Tips</Text>
            
            {recentIncidents.slice(0, 3).map((incident, index) => (
              <View key={index} style={styles.tipCard}>
                <TrendingUp size={20} color="#6366f1" />
                <View style={styles.tipContent}>
                  <Text style={styles.tipTitle}>Lesson Learned</Text>
                  <Text style={styles.tipText}>{incident.educationalMessage}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  headerButton: {
    padding: 8,
  },
  generateButton: {
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  generateButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  rotating: {
    transform: [{ rotate: '180deg' }],
  },
  content: {
    flex: 1,
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
  },
  errorText: {
    color: '#991b1b',
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    marginLeft: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  statSublabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 8,
  },
  filterChip: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterChipActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  filterChipText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  clearButtonText: {
    fontSize: 13,
    color: '#ef4444',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
  },
  incidentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  incidentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  incidentTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  incidentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  incidentDescription: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 12,
    lineHeight: 20,
  },
  incidentDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 12,
  },
  incidentDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  incidentDetailText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  savingsText: {
    color: '#22c55e',
    fontWeight: '500',
  },
  incidentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  costBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  costBadgeZero: {
    backgroundColor: '#d1fae5',
  },
  costBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#92400e',
  },
  costBadgeTextZero: {
    color: '#065f46',
  },
  mitigationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  mitigationBadgeText: {
    fontSize: 11,
    color: '#4338ca',
    fontWeight: '500',
    marginLeft: 4,
  },
  tipCard: {
    backgroundColor: '#f0fdf4',
    borderLeftWidth: 4,
    borderLeftColor: '#22c55e',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    marginBottom: 8,
  },
  tipContent: {
    flex: 1,
    marginLeft: 12,
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 12,
    color: '#15803d',
    lineHeight: 16,
  },
});

export default FinancialIncidentsScreen;