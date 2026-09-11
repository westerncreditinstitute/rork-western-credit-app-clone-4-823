import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { trpcClient } from '@/lib/trpc';
import { useUser } from '@/contexts/UserContext';

// ============================================================
// usePushNotifications
// ============================================================
// Handles the device side of real push notifications:
//   1. Configures how notifications behave while the app is foregrounded.
//   2. Exposes the current OS permission status.
//   3. On request (or automatically once granted), registers this
//      device's Expo push token with the backend via pushTokens.register
//      so server-side code (e.g. the overdue-dispute check) can reach
//      this device even when the app isn't open.
//
// IMPORTANT LIMITATION: obtaining a *remote* Expo push token requires an
// EAS project id (Notifications.getExpoPushTokenAsync({ projectId })).
// This app's app.json currently has no `extra.eas.projectId` configured
// and no eas.json file exists, so on a real device build without that
// id configured, remote token registration will fail gracefully (the
// error is caught and logged, permission state still reflects reality,
// and in-app/local notifications continue to work regardless). Once a
// project id is added (via `eas init`), this hook will start
// registering real tokens with no other code changes required.

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export type PushPermissionStatus = 'undetermined' | 'granted' | 'denied' | 'unsupported';

export function usePushNotifications() {
  const { user } = useUser();
  const [permissionStatus, setPermissionStatus] = useState<PushPermissionStatus>('undetermined');
  const [isRegistering, setIsRegistering] = useState(false);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const registeredForUserRef = useRef<string | null>(null);

  const refreshPermissionStatus = useCallback(async () => {
    if (Platform.OS === 'web') {
      setPermissionStatus('unsupported');
      return 'unsupported' as PushPermissionStatus;
    }
    try {
      const { status } = await Notifications.getPermissionsAsync();
      const mapped: PushPermissionStatus = status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
      setPermissionStatus(mapped);
      return mapped;
    } catch (error) {
      console.error('[usePushNotifications] getPermissionsAsync failed:', error);
      return 'undetermined' as PushPermissionStatus;
    }
  }, []);

  const registerToken = useCallback(async (userId: string) => {
    if (Platform.OS === 'web') return;
    if (!Device.isDevice) {
      // Simulators/emulators can't receive real push tokens.
      console.log('[usePushNotifications] Not a physical device, skipping token registration');
      return;
    }
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId
        ?? (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId;

      if (!projectId) {
        console.warn(
          '[usePushNotifications] No EAS projectId configured (app.json extra.eas.projectId). ' +
          'Skipping remote push token registration — in-app and local notifications are unaffected.'
        );
        return;
      }

      const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
      const token = tokenResponse.data;
      setExpoPushToken(token);

      await trpcClient.pushTokens.register.mutate({
        userId,
        expoPushToken: token,
        platform: Platform.OS,
        deviceName: Device.deviceName || undefined,
      });
      console.log('[usePushNotifications] Push token registered for user:', userId);
    } catch (error) {
      // Best-effort: a failed registration (e.g. missing projectId,
      // offline device, Expo API hiccup) must never break the app or
      // the settings screen that triggered it.
      console.error('[usePushNotifications] Failed to register push token:', error);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (Platform.OS === 'web') {
      setPermissionStatus('unsupported');
      return 'unsupported' as PushPermissionStatus;
    }
    setIsRegistering(true);
    try {
      const existing = await Notifications.getPermissionsAsync();
      let finalStatus = existing.status;
      if (existing.status !== 'granted') {
        const requested = await Notifications.requestPermissionsAsync();
        finalStatus = requested.status;
      }

      const mapped: PushPermissionStatus = finalStatus === 'granted' ? 'granted' : 'denied';
      setPermissionStatus(mapped);

      if (mapped === 'granted' && user?.id) {
        await registerToken(user.id);
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('dispute-alerts', {
          name: 'Dispute Alerts',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
        });
      }

      return mapped;
    } catch (error) {
      console.error('[usePushNotifications] requestPermission failed:', error);
      return 'denied' as PushPermissionStatus;
    } finally {
      setIsRegistering(false);
    }
  }, [registerToken, user?.id]);

  // Once permission is already granted (from a previous session), make
  // sure the current device's token stays registered for this user
  // without requiring them to toggle anything again.
  useEffect(() => {
    if (!user?.id || Platform.OS === 'web') return;
    if (registeredForUserRef.current === user.id) return;

    (async () => {
      const status = await refreshPermissionStatus();
      if (status === 'granted') {
        registeredForUserRef.current = user.id;
        await registerToken(user.id);
      }
    })();
  }, [user?.id, refreshPermissionStatus, registerToken]);

  return {
    permissionStatus,
    isRegistering,
    expoPushToken,
    requestPermission,
    refreshPermissionStatus,
  };
}
