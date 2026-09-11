import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';

// ============================================================
// useNotificationResponseRouter
// ============================================================
// Listens for the user tapping a push/local notification (whether the
// app was foregrounded, backgrounded, or launched fresh from the tap)
// and routes to the same `actionUrl` convention already used by the
// in-app Notification Center (app/game/notification-center.tsx) and by
// NotificationService's dispute notification payloads — so a dispute
// push notification and its in-app equivalent land the user in the
// same place (the Dispute Tracker) either way.
export function useNotificationResponseRouter() {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      try {
        const data = response.notification.request.content.data as
          | { actionUrl?: string }
          | undefined;
        if (data?.actionUrl) {
          router.push(data.actionUrl as any);
        }
      } catch (error) {
        console.error('[useNotificationResponseRouter] Failed to handle notification tap:', error);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [router]);
}
