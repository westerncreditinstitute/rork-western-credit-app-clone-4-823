import { useCallback, useEffect, useRef } from 'react';
import { Alert, BackHandler } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useAuth } from '@/contexts/AuthContext';
import { useHome } from '@/contexts/HomeContext';
import { useCommunityHomes } from '@/contexts/CommunityHomesContext';

export interface HomeNavigationGuardResult {
  canAccess: boolean;
  reason?: string;
  redirectTo?: string;
}

export interface NavigateToHomeOptions {
  homeId: string;
  mode?: 'view' | 'visit' | 'edit';
  roomId?: string;
  multiplayer?: boolean;
}

export function useHomeNavigationGuard() {
  const auth = useAuth();
  const { hasHome, canAccessHomeEditor, currentHome } = useHome();
  const { getHomeById } = useCommunityHomes();

  const isAuthenticated = auth?.isAuthenticated ?? false;

  const checkHomeDetailAccess = useCallback((homeId: string): HomeNavigationGuardResult => {
    if (!isAuthenticated) {
      return {
        canAccess: false,
        reason: 'Please log in to view home details',
        redirectTo: '/register',
      };
    }

    const home = getHomeById(homeId);
    if (!home) {
      return {
        canAccess: false,
        reason: 'Home not found',
        redirectTo: '/home-browser',
      };
    }

    return { canAccess: true };
  }, [isAuthenticated, getHomeById]);

  const checkHomeEditorAccess = useCallback((): HomeNavigationGuardResult => {
    if (!isAuthenticated) {
      return {
        canAccess: false,
        reason: 'Please log in to edit your home',
        redirectTo: '/register',
      };
    }

    if (!hasHome) {
      return {
        canAccess: false,
        reason: 'You need to create a home first',
        redirectTo: '/home-creation',
      };
    }

    if (!canAccessHomeEditor) {
      return {
        canAccess: false,
        reason: 'Home editor access is restricted',
        redirectTo: '/home-browser',
      };
    }

    return { canAccess: true };
  }, [isAuthenticated, hasHome, canAccessHomeEditor]);

  const checkHomeVisitAccess = useCallback((homeId: string): HomeNavigationGuardResult => {
    if (!isAuthenticated) {
      return {
        canAccess: false,
        reason: 'Please log in to visit homes',
        redirectTo: '/register',
      };
    }

    const home = getHomeById(homeId);
    if (!home) {
      return {
        canAccess: false,
        reason: 'Home not found',
        redirectTo: '/home-browser',
      };
    }

    const maxVisitors = home.virtualTour?.maxVisitors || 20;
    const currentVisitors = home.virtualTour?.currentVisitors || 0;

    if (currentVisitors >= maxVisitors) {
      return {
        canAccess: false,
        reason: `This home is at full capacity (${currentVisitors}/${maxVisitors} visitors)`,
      };
    }

    if (!home.settings?.virtualTourAvailable) {
      return {
        canAccess: false,
        reason: 'Virtual tours are not available for this home',
      };
    }

    return { canAccess: true };
  }, [isAuthenticated, getHomeById]);

  const checkHomeCreationAccess = useCallback((): HomeNavigationGuardResult => {
    if (!isAuthenticated) {
      return {
        canAccess: false,
        reason: 'Please log in to create a home',
        redirectTo: '/register',
      };
    }

    return { canAccess: true };
  }, [isAuthenticated]);

  const guardNavigation = useCallback((
    route: 'home-detail' | 'home-editor' | 'home-visit' | 'home-creation' | 'home-browser',
    homeId?: string
  ): HomeNavigationGuardResult => {
    switch (route) {
      case 'home-detail':
        return homeId ? checkHomeDetailAccess(homeId) : { canAccess: false, reason: 'Home ID required' };
      case 'home-editor':
        return checkHomeEditorAccess();
      case 'home-visit':
        return homeId ? checkHomeVisitAccess(homeId) : { canAccess: false, reason: 'Home ID required' };
      case 'home-creation':
        return checkHomeCreationAccess();
      case 'home-browser':
        return isAuthenticated ? { canAccess: true } : { canAccess: false, reason: 'Please log in', redirectTo: '/register' };
      default:
        return { canAccess: true };
    }
  }, [checkHomeDetailAccess, checkHomeEditorAccess, checkHomeVisitAccess, checkHomeCreationAccess, isAuthenticated]);

  return {
    checkHomeDetailAccess,
    checkHomeEditorAccess,
    checkHomeVisitAccess,
    checkHomeCreationAccess,
    guardNavigation,
    isAuthenticated,
    hasHome,
    currentHome,
  };
}

export function useHomeNavigation() {
  const router = useRouter();
  const { guardNavigation } = useHomeNavigationGuard();

  const navigateToHome = useCallback((options: NavigateToHomeOptions) => {
    const { homeId, mode = 'view', roomId, multiplayer } = options;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    let route: 'home-detail' | 'home-visit' | 'home-editor' = 'home-detail';
    if (mode === 'visit') route = 'home-visit';
    else if (mode === 'edit') route = 'home-editor';

    const guardResult = guardNavigation(route, homeId);

    if (!guardResult.canAccess) {
      if (guardResult.reason) {
        Alert.alert('Access Denied', guardResult.reason);
      }
      if (guardResult.redirectTo) {
        router.push(guardResult.redirectTo as any);
      }
      return false;
    }

    const params: Record<string, string> = { id: homeId };
    if (roomId) params.roomId = roomId;
    if (multiplayer) params.multiplayer = 'true';

    switch (mode) {
      case 'visit':
        router.push({ pathname: '/home-visit' as any, params });
        break;
      case 'edit':
        router.push('/home-editor' as any);
        break;
      default:
        router.push({ pathname: '/home-detail' as any, params });
    }

    return true;
  }, [router, guardNavigation]);

  const navigateToHomeBrowser = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const guardResult = guardNavigation('home-browser');
    if (!guardResult.canAccess) {
      if (guardResult.reason) {
        Alert.alert('Access Denied', guardResult.reason);
      }
      if (guardResult.redirectTo) {
        router.push(guardResult.redirectTo as any);
      }
      return false;
    }

    router.push('/home-browser' as any);
    return true;
  }, [router, guardNavigation]);

  const navigateToHomeCreation = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const guardResult = guardNavigation('home-creation');
    if (!guardResult.canAccess) {
      if (guardResult.reason) {
        Alert.alert('Access Denied', guardResult.reason);
      }
      if (guardResult.redirectTo) {
        router.push(guardResult.redirectTo as any);
      }
      return false;
    }

    router.push('/home-creation' as any);
    return true;
  }, [router, guardNavigation]);

  const navigateToHomeEditor = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const guardResult = guardNavigation('home-editor');
    if (!guardResult.canAccess) {
      if (guardResult.reason) {
        Alert.alert('Access Denied', guardResult.reason);
      }
      if (guardResult.redirectTo) {
        router.push(guardResult.redirectTo as any);
      }
      return false;
    }

    router.push('/home-editor' as any);
    return true;
  }, [router, guardNavigation]);

  return {
    navigateToHome,
    navigateToHomeBrowser,
    navigateToHomeCreation,
    navigateToHomeEditor,
  };
}

export function useUnsavedChangesGuard(
  hasUnsavedChanges: boolean,
  onSave?: () => Promise<void> | void,
  onDiscard?: () => void
) {
  const router = useRouter();
  const hasChangesRef = useRef(hasUnsavedChanges);

  useEffect(() => {
    hasChangesRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  const showUnsavedChangesAlert = useCallback((): Promise<'save' | 'discard' | 'cancel'> => {
    return new Promise((resolve) => {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Would you like to save them before leaving?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve('cancel'),
          },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => resolve('discard'),
          },
          {
            text: 'Save',
            onPress: () => resolve('save'),
          },
        ]
      );
    });
  }, []);

  const handleBackNavigation = useCallback(async (): Promise<boolean> => {
    if (!hasChangesRef.current) {
      return true;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    const action = await showUnsavedChangesAlert();

    switch (action) {
      case 'save':
        if (onSave) {
          await onSave();
        }
        return true;
      case 'discard':
        if (onDiscard) {
          onDiscard();
        }
        return true;
      case 'cancel':
      default:
        return false;
    }
  }, [showUnsavedChangesAlert, onSave, onDiscard]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!hasChangesRef.current) {
        return false;
      }

      handleBackNavigation().then((shouldNavigate) => {
        if (shouldNavigate) {
          router.back();
        }
      });

      return true;
    });

    return () => backHandler.remove();
  }, [handleBackNavigation, router]);

  const safeGoBack = useCallback(async () => {
    const shouldNavigate = await handleBackNavigation();
    if (shouldNavigate) {
      router.back();
    }
  }, [handleBackNavigation, router]);

  return {
    showUnsavedChangesAlert,
    handleBackNavigation,
    safeGoBack,
  };
}

export function useDeepLinkHandler() {
  const router = useRouter();
  const { guardNavigation } = useHomeNavigationGuard();

  const handleDeepLink = useCallback((url: string): boolean => {
    console.log('[DeepLink] Handling URL:', url);

    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);

      if (pathParts[0] === 'home') {
        const homeId = pathParts[1];
        const action = pathParts[2];

        if (!homeId) {
          router.push('/home-browser' as any);
          return true;
        }

        switch (action) {
          case 'visit':
            const visitGuard = guardNavigation('home-visit', homeId);
            if (visitGuard.canAccess) {
              router.push({ pathname: '/home-visit' as any, params: { id: homeId } });
            } else {
              Alert.alert('Cannot Visit', visitGuard.reason || 'Unable to visit this home');
              router.push({ pathname: '/home-detail' as any, params: { id: homeId } });
            }
            return true;

          case 'room':
            const roomId = pathParts[3];
            router.push({ pathname: '/home-detail' as any, params: { id: homeId, roomId } });
            return true;

          default:
            router.push({ pathname: '/home-detail' as any, params: { id: homeId } });
            return true;
        }
      }

      return false;
    } catch (error) {
      console.error('[DeepLink] Error parsing URL:', error);
      return false;
    }
  }, [router, guardNavigation]);

  const generateShareLink = useCallback((homeId: string, roomId?: string): string => {
    const baseUrl = 'https://app.example.com';
    let path = `/home/${homeId}`;
    if (roomId) {
      path += `/room/${roomId}`;
    }
    return `${baseUrl}${path}`;
  }, []);

  const generateVisitLink = useCallback((homeId: string): string => {
    return `https://app.example.com/home/${homeId}/visit`;
  }, []);

  return {
    handleDeepLink,
    generateShareLink,
    generateVisitLink,
  };
}
