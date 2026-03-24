import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Home,
  Paintbrush,
  Users,
  Plus,
  ChevronRight,
  Sparkles,
} from 'lucide-react-native';
import { useHome } from '@/contexts/HomeContext';

interface HomeNavigationProps {
  currentScreen?: 'browser' | 'editor' | 'creation';
  showCompact?: boolean;
}

export default function HomeNavigation({ currentScreen, showCompact = false }: HomeNavigationProps) {
  const router = useRouter();
  const { hasHome, currentHome, homeStats } = useHome();

  const navItems = [
    {
      id: 'browser',
      label: 'Visit Homes',
      icon: Users,
      route: '/game/home-browser',
      description: 'Explore public homes',
      gradient: ['#3B82F6', '#2563EB'] as const,
      available: true,
    },
    {
      id: 'editor',
      label: 'My Home',
      icon: Paintbrush,
      route: '/game/home-editor',
      description: hasHome ? 'Decorate your home' : 'Create home first',
      gradient: ['#10B981', '#059669'] as const,
      available: hasHome,
    },
    {
      id: 'creation',
      label: hasHome ? 'Upgrade' : 'Create Home',
      icon: hasHome ? Sparkles : Plus,
      route: '/game/home-creation',
      description: hasHome ? 'Upgrade your tier' : 'Start your journey',
      gradient: ['#8B5CF6', '#7C3AED'] as const,
      available: true,
    },
  ];

  const handleNavigate = (route: string, available: boolean) => {
    if (!available) {
      router.push('/game/home-creation' as any);
      return;
    }
    router.push(route as any);
  };

  if (showCompact) {
    return (
      <View style={styles.compactContainer}>
        {navItems.map((item) => {
          const isActive = currentScreen === item.id;
          const Icon = item.icon;

          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.compactButton, isActive && styles.compactButtonActive]}
              onPress={() => handleNavigate(item.route, item.available)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={isActive ? item.gradient : ['#1E293B', '#1E293B']}
                style={styles.compactButtonGradient}
              >
                <Icon size={20} color={isActive ? '#FFFFFF' : '#9CA3AF'} />
              </LinearGradient>
              <Text style={[styles.compactButtonText, isActive && styles.compactButtonTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {hasHome && homeStats && (
        <View style={styles.homeInfoCard}>
          <LinearGradient
            colors={['#1E293B', '#0F172A']}
            style={styles.homeInfoGradient}
          >
            <View style={styles.homeInfoHeader}>
              <View style={styles.homeInfoIcon}>
                <Home size={20} color="#10B981" />
              </View>
              <View style={styles.homeInfoContent}>
                <Text style={styles.homeInfoTitle}>{homeStats.tierName}</Text>
                <Text style={styles.homeInfoSubtitle}>
                  {homeStats.itemCount}/{homeStats.maxItems} items • {homeStats.roomCount} rooms
                </Text>
              </View>
              <View style={[styles.statusBadge, currentHome?.isPublic ? styles.publicBadge : styles.privateBadge]}>
                <Text style={[styles.statusText, currentHome?.isPublic && styles.publicText]}>
                  {currentHome?.isPublic ? 'Public' : 'Private'}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.navScrollContent}
      >
        {navItems.map((item) => {
          const isActive = currentScreen === item.id;
          const Icon = item.icon;

          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.navCard, isActive && styles.navCardActive]}
              onPress={() => handleNavigate(item.route, item.available)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={item.gradient}
                style={styles.navCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.navCardContent}>
                  <View style={styles.navCardIcon}>
                    <Icon size={24} color="#FFFFFF" />
                  </View>
                  <View style={styles.navCardInfo}>
                    <Text style={styles.navCardLabel}>{item.label}</Text>
                    <Text style={styles.navCardDescription}>{item.description}</Text>
                  </View>
                  <ChevronRight size={20} color="rgba(255,255,255,0.6)" />
                </View>
                {!item.available && (
                  <View style={styles.unavailableOverlay}>
                    <Text style={styles.unavailableText}>Create Home First</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  homeInfoCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  homeInfoGradient: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  homeInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  homeInfoIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeInfoContent: {
    flex: 1,
    marginLeft: 12,
  },
  homeInfoTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  homeInfoSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  publicBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  privateBadge: {
    backgroundColor: 'rgba(107, 114, 128, 0.15)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#6B7280',
  },
  publicText: {
    color: '#10B981',
  },
  navScrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  navCard: {
    width: 180,
    borderRadius: 14,
    overflow: 'hidden',
  },
  navCardActive: {
    transform: [{ scale: 1.02 }],
  },
  navCardGradient: {
    padding: 14,
    minHeight: 100,
    position: 'relative',
  },
  navCardContent: {
    flexDirection: 'column',
    gap: 10,
  },
  navCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navCardInfo: {
    flex: 1,
  },
  navCardLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  navCardDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  unavailableOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unavailableText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  compactContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  compactButton: {
    alignItems: 'center',
    gap: 6,
  },
  compactButtonActive: {
    opacity: 1,
  },
  compactButtonGradient: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactButtonText: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#6B7280',
  },
  compactButtonTextActive: {
    color: '#FFFFFF',
  },
});
