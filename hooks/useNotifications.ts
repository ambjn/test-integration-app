// hooks/useNotifications.ts
import { useMutation, useQuery } from 'convex/react';
import * as Notifications from 'expo-notifications';
import { EventSubscription } from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { api } from '../convex/_generated/api';
import { registerForPushNotificationsAsync } from '../utils/notifications';

export function useNotifications() {
    const [expoPushToken, setExpoPushToken] = useState('');
    const notificationListener = useRef<EventSubscription | undefined>(undefined);
    const responseListener = useRef<EventSubscription | undefined>(undefined);

    const savePushToken = useMutation(api.notifications.savePushToken);
    const myNotifications = useQuery(api.notifications.getMyNotifications);
    const unreadCount = useQuery(api.notifications.getUnreadCount);

    useEffect(() => {
        registerForPushNotificationsAsync().then(async (token) => {
            if (token) {
                setExpoPushToken(token);
                // Save token to Convex
                try {
                    await savePushToken({
                        pushToken: token,
                        deviceType: Platform.OS,
                    });
                    console.log('✅ Push token saved to Convex');
                } catch (error) {
                    console.error('Failed to save push token:', error);
                }
            }
        });

        // Listen for foreground notifications
        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            console.log('📬 Notification received:', notification);
        });

        // Listen for notification taps
        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            console.log('👆 Notification tapped:', response);
            // Handle navigation based on notification data here
        });

        return () => {
            if (notificationListener.current) {
                notificationListener.current.remove();
            }
            if (responseListener.current) {
                responseListener.current.remove();
            }
        };
    }, []);

    return {
        expoPushToken,
        myNotifications,
        unreadCount,
    };
}