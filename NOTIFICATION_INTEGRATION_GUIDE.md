# Complete Push Notification Integration Guide

**A comprehensive guide to integrating push notifications using Expo, Convex, and Firebase**

Based on the implementation in this project, this guide will walk you through setting up a complete push notification system from scratch.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Architecture](#architecture)
4. [Step 1: Firebase Setup](#step-1-firebase-setup)
5. [Step 2: Convex Backend Setup](#step-2-convex-backend-setup)
6. [Step 3: Expo Project Configuration](#step-3-expo-project-configuration)
7. [Step 4: Frontend Implementation](#step-4-frontend-implementation)
8. [Step 5: Testing Notifications](#step-5-testing-notifications)
9. [Step 6: EAS Build & Deployment](#step-6-eas-build--deployment)
10. [Troubleshooting](#troubleshooting)
11. [API Reference](#api-reference)

---

## Overview

This notification system provides:
- **Cross-platform** push notifications (iOS & Android)
- **Real-time** notification delivery and updates
- **Notification history** with read/unread tracking
- **Bulk sending** capabilities (individual, group, broadcast)
- **User authentication** integration via Clerk
- **Firebase FCM** for Android, APNs for iOS (via Expo Push Service)

### Tech Stack
- **Frontend**: React Native with Expo
- **Backend**: Convex (serverless backend)
- **Auth**: Clerk
- **Push Service**: Expo Push Notification Service
- **Android**: Firebase Cloud Messaging (FCM)
- **iOS**: Apple Push Notification Service (APNs)

---

## Prerequisites

Before starting, ensure you have:

1. **Node.js** (v18 or higher)
2. **Expo CLI**: `npm install -g expo-cli`
3. **EAS CLI**: `npm install -g eas-cli`
4. **Accounts**:
   - Expo account (create at https://expo.dev)
   - Firebase account (https://firebase.google.com)
   - Convex account (https://convex.dev)
   - Clerk account (https://clerk.com)
5. **Physical device** for testing (push notifications don't work on iOS simulators)

---

## Architecture

```
┌─────────────────┐
│   User Device   │
│  (iOS/Android)  │
└────────┬────────┘
         │
         ├─ Register Push Token
         │
    ┌────▼────────────────┐
    │   Expo App (React   │
    │      Native)        │
    │  ┌──────────────┐   │
    │  │useNotifications│  │
    │  │    Hook      │   │
    │  └──────┬───────┘   │
    └─────────┼───────────┘
              │
              │ Save Token / Query Notifications
              │
    ┌─────────▼───────────┐
    │   Convex Backend    │
    │  ┌──────────────┐   │
    │  │ notifications│   │
    │  │      .ts     │   │
    │  └──────┬───────┘   │
    │  ┌──────▼───────┐   │
    │  │   schema.ts  │   │
    │  │ ┌──────────┐ │   │
    │  │ │pushTokens│ │   │
    │  │ │ table    │ │   │
    │  │ └──────────┘ │   │
    │  │ ┌──────────┐ │   │
    │  │ │notifica- │ │   │
    │  │ │tions     │ │   │
    │  │ │ table    │ │   │
    │  │ └──────────┘ │   │
    │  └──────────────┘   │
    └─────────┬───────────┘
              │
              │ Send Push via API
              │
    ┌─────────▼───────────┐
    │  Expo Push Service  │
    │  (exp.host/api/v2)  │
    └─────────┬───────────┘
              │
         ┌────┴────┐
         │         │
    ┌────▼───┐ ┌──▼────┐
    │  APNs  │ │  FCM  │
    │  (iOS) │ │(Android)
    └────┬───┘ └──┬────┘
         │        │
         └────┬───┘
              │
      ┌───────▼────────┐
      │  User Devices  │
      │   Receive &    │
      │Display Notif.  │
      └────────────────┘
```

---

## Step 1: Firebase Setup

### 1.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Enter project name (e.g., `test-integration-app`)
4. Disable Google Analytics (optional)
5. Click **"Create project"**

### 1.2 Add Android App

1. In Firebase Console, click **"Add app"** → Select **Android**
2. Enter your Android package name (e.g., `com.yourcompany.yourapp`)
   - Must match the `android.package` in `app.json`
3. Download `google-services.json`
4. Place file in **project root directory**

### 1.3 Verify google-services.json

Your file should look like this:

```json
{
  "project_info": {
    "project_number": "268198892408",
    "project_id": "test-integration-app-5843e",
    "storage_bucket": "test-integration-app-5843e.firebasestorage.app"
  },
  "client": [
    {
      "client_info": {
        "mobilesdk_app_id": "1:268198892408:android:...",
        "android_client_info": {
          "package_name": "com.yourcompany.yourapp"
        }
      },
      "api_key": [
        {
          "current_key": "YOUR_API_KEY_HERE"
        }
      ]
    }
  ]
}
```

### 1.4 Enable Cloud Messaging

1. In Firebase Console → **Project Settings** → **Cloud Messaging**
2. Note your **Server Key** (not needed for Expo, but useful for debugging)

---

## Step 2: Convex Backend Setup

### 2.1 Install Convex

```bash
npm install convex
npx convex dev
```

This will:
- Create a `convex/` directory
- Initialize Convex configuration
- Open dashboard to link your project

### 2.2 Create Database Schema

Create `convex/schema.ts`:

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Store user push tokens
  pushTokens: defineTable({
    userId: v.string(),        // Clerk user ID
    pushToken: v.string(),     // Expo push token
    deviceType: v.string(),    // 'ios' | 'android'
    lastUpdated: v.number(),   // Timestamp
  })
    .index("by_userId", ["userId"])
    .index("by_pushToken", ["pushToken"]),

  // Store notification history
  notifications: defineTable({
    recipientId: v.string(),   // Clerk user ID
    title: v.string(),
    body: v.string(),
    data: v.optional(v.any()), // Custom data payload
    status: v.string(),        // 'sent' | 'failed'
    sentAt: v.number(),        // Timestamp
    readAt: v.optional(v.number()), // Read timestamp
  })
    .index("by_recipient", ["recipientId"]),
});
```

### 2.3 Create Notification Functions

Create `convex/notifications.ts`:

```typescript
import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";

// Mutation: Save or update user's push token
export const savePushToken = mutation({
  args: {
    userId: v.string(),
    pushToken: v.string(),
    deviceType: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, pushToken, deviceType } = args;

    // Check if token already exists
    const existing = await ctx.db
      .query("pushTokens")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      // Update existing token
      await ctx.db.patch(existing._id, {
        pushToken,
        deviceType,
        lastUpdated: Date.now(),
      });
      return existing._id;
    } else {
      // Insert new token
      return await ctx.db.insert("pushTokens", {
        userId,
        pushToken,
        deviceType,
        lastUpdated: Date.now(),
      });
    }
  },
});

// Query: Get current user's notifications
export const getMyNotifications = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, limit = 50 } = args;

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_recipient", (q) => q.eq("recipientId", userId))
      .order("desc")
      .take(limit);

    return notifications;
  },
});

// Mutation: Mark notification as read
export const markAsRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, {
      readAt: Date.now(),
    });
  },
});

// Query: Get unread count
export const getUnreadCount = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_recipient", (q) => q.eq("recipientId", args.userId))
      .collect();

    return notifications.filter((n) => !n.readAt).length;
  },
});

// Query: Get push token for a user
export const getPushToken = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pushTokens")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
  },
});

// Query: Get all push tokens (for broadcast)
export const getAllPushTokens = query({
  handler: async (ctx) => {
    return await ctx.db.query("pushTokens").collect();
  },
});

// Mutation: Log notification to database
export const logNotification = mutation({
  args: {
    recipientId: v.string(),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.any()),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notifications", {
      ...args,
      sentAt: Date.now(),
    });
  },
});

// Action: Send push notification to a user
export const sendNotification = action({
  args: {
    userId: v.string(),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { userId, title, body, data } = args;

    // Get user's push token
    const tokenRecord = await ctx.runQuery(api.notifications.getPushToken, {
      userId,
    });

    if (!tokenRecord) {
      throw new Error(`No push token found for user ${userId}`);
    }

    // Prepare notification payload
    const message = {
      to: tokenRecord.pushToken,
      sound: "default",
      title,
      body,
      data: data || {},
    };

    // Send via Expo Push API
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();

    // Log to database
    await ctx.runMutation(api.notifications.logNotification, {
      recipientId: userId,
      title,
      body,
      data,
      status: result.data?.status === "ok" ? "sent" : "failed",
    });

    return result;
  },
});

// Action: Send to multiple users
export const sendBulkNotification = action({
  args: {
    userIds: v.array(v.string()),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { userIds, title, body, data } = args;

    const results = await Promise.all(
      userIds.map((userId) =>
        ctx.runAction(api.notifications.sendNotification, {
          userId,
          title,
          body,
          data,
        })
      )
    );

    return results;
  },
});

// Action: Send to all users (broadcast)
export const sendToAllUsers = action({
  args: {
    title: v.string(),
    body: v.string(),
    data: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { title, body, data } = args;

    // Get all push tokens
    const allTokens = await ctx.runQuery(api.notifications.getAllPushTokens);

    const userIds = allTokens.map((token) => token.userId);

    return await ctx.runAction(api.notifications.sendBulkNotification, {
      userIds,
      title,
      body,
      data,
    });
  },
});
```

### 2.4 Configure Authentication

Create `convex/auth.config.ts`:

```typescript
export default {
  providers: [
    {
      domain: "https://your-clerk-domain.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
};
```

Replace `your-clerk-domain` with your actual Clerk domain from the Clerk dashboard.

---

## Step 3: Expo Project Configuration

### 3.1 Install Dependencies

```bash
npx expo install expo-notifications expo-device expo-constants
npm install convex @clerk/clerk-expo
```

### 3.2 Configure app.json

Update your `app.json`:

```json
{
  "expo": {
    "name": "YourAppName",
    "slug": "your-app-slug",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourcompany.yourapp",
      "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.yourcompany.yourapp",
      "googleServicesFile": "./google-services.json"
    },
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#ffffff"
        }
      ]
    ],
    "extra": {
      "eas": {
        "projectId": "YOUR_EAS_PROJECT_ID"
      }
    }
  }
}
```

### 3.3 Add .easignore (Optional)

Create `.easignore` to exclude files from EAS builds:

```
convex/
node_modules/
.git/
```

### 3.4 Configure EAS

Create `eas.json`:

```json
{
  "cli": {
    "version": ">= 13.7.1"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {}
  },
  "submit": {
    "production": {}
  }
}
```

---

## Step 4: Frontend Implementation

### 4.1 Create Notification Utility

Create `utils/notifications.ts`:

```typescript
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Constants from "expo-constants";

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowInForeground: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

  // Only works on physical devices
  if (!Device.isDevice) {
    alert("Must use physical device for Push Notifications");
    return;
  }

  // Request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    alert("Failed to get push token for push notification!");
    return;
  }

  // Get Expo push token
  token = (
    await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    })
  ).data;

  // Android-specific channel setup
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  return token;
}
```

### 4.2 Create useNotifications Hook

Create `hooks/useNotifications.ts`:

```typescript
import { useEffect, useRef, useState } from "react";
import * as Notifications from "expo-notifications";
import { registerForPushNotificationsAsync } from "@/utils/notifications";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@clerk/clerk-expo";
import { Platform } from "react-native";

export function useNotifications() {
  const { userId } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>();

  // Convex mutations and queries
  const savePushToken = useMutation(api.notifications.savePushToken);
  const myNotifications = useQuery(
    api.notifications.getMyNotifications,
    userId ? { userId, limit: 50 } : "skip"
  );
  const unreadCount = useQuery(
    api.notifications.getUnreadCount,
    userId ? { userId } : "skip"
  );

  // Refs for notification listeners
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    if (!userId) return;

    // Register for push notifications
    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        setExpoPushToken(token);

        // Save to Convex
        savePushToken({
          userId,
          pushToken: token,
          deviceType: Platform.OS,
        });
      }
    });

    // Listener for notifications received while app is in foreground
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("Notification received:", notification);
      });

    // Listener for when user taps on a notification
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("Notification tapped:", response);
      });

    // Cleanup listeners on unmount
    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(
          notificationListener.current
        );
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [userId]);

  return {
    expoPushToken,
    myNotifications,
    unreadCount,
  };
}
```

### 4.3 Setup Root Layout with Auth

Update `app/_layout.tsx`:

```typescript
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import * as SecureStore from "expo-secure-store";

// Initialize Convex client
const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false,
});

// Token cache for Clerk
const tokenCache = {
  async getToken(key: string) {
    try {
      return SecureStore.getItemAsync(key);
    } catch (err) {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};

// Protected route logic
function RootStack() {
  const { isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuthGroup = segments[0] === "(auth)";

    if (!isSignedIn && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
    } else if (isSignedIn && inAuthGroup) {
      router.replace("/(home)");
    }
  }, [isSignedIn, segments]);

  return (
    <Stack>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(home)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ClerkProvider
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      tokenCache={tokenCache}
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <RootStack />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
```

### 4.4 Create Home Screen with Notifications

Create `app/(home)/index.tsx`:

```typescript
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useNotifications } from "@/hooks/useNotifications";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function HomeScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const { expoPushToken, myNotifications, unreadCount } = useNotifications();
  const markAsRead = useMutation(api.notifications.markAsRead);

  const handleNotificationPress = (notificationId: any) => {
    markAsRead({ notificationId });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Push Notifications</Text>
        <TouchableOpacity onPress={() => signOut()}>
          <Text style={styles.signOutButton}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* User Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Information</Text>
        <Text>Email: {user?.primaryEmailAddress?.emailAddress}</Text>
        <Text>ID: {user?.id}</Text>
      </View>

      {/* Push Token */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Push Token</Text>
        <Text style={styles.tokenText}>
          {expoPushToken || "Loading..."}
        </Text>
      </View>

      {/* Unread Count */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Unread Notifications: {unreadCount || 0}
        </Text>
      </View>

      {/* Notification List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Notifications</Text>
        {myNotifications?.map((notification) => (
          <TouchableOpacity
            key={notification._id}
            style={[
              styles.notificationItem,
              !notification.readAt && styles.unreadNotification,
            ]}
            onPress={() => handleNotificationPress(notification._id)}
          >
            <View style={styles.notificationHeader}>
              <Text style={styles.notificationTitle}>
                {notification.title}
              </Text>
              {!notification.readAt && (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>NEW</Text>
                </View>
              )}
            </View>
            <Text style={styles.notificationBody}>{notification.body}</Text>
            <Text style={styles.notificationTime}>
              {new Date(notification.sentAt).toLocaleString()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  signOutButton: {
    color: "#007AFF",
    fontSize: 16,
  },
  section: {
    backgroundColor: "#fff",
    padding: 16,
    marginTop: 12,
    marginHorizontal: 12,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  tokenText: {
    fontSize: 12,
    color: "#666",
  },
  notificationItem: {
    padding: 12,
    marginTop: 8,
    backgroundColor: "#f9f9f9",
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: "transparent",
  },
  unreadNotification: {
    backgroundColor: "#e3f2fd",
    borderLeftColor: "#2196F3",
  },
  notificationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  notificationBody: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  newBadge: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
});
```

### 4.5 Environment Variables

Create `.env` or `.env.local`:

```bash
EXPO_PUBLIC_CONVEX_URL=https://your-convex-deployment.convex.cloud
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
```

---

## Step 5: Testing Notifications

### 5.1 Run Development Build

```bash
# Start Convex backend
npx convex dev

# Start Expo development server
npx expo start
```

### 5.2 Test on Physical Device

1. Scan QR code with Expo Go app (or build development client)
2. Grant notification permissions when prompted
3. Verify push token appears in the UI
4. Check Convex dashboard to confirm token is saved

### 5.3 Send Test Notification

Open Convex dashboard and run this in the Functions panel:

```javascript
// Send to a specific user
await ctx.runAction("notifications:sendNotification", {
  userId: "user_xxxxx", // Replace with actual Clerk user ID
  title: "Test Notification",
  body: "This is a test push notification!",
  data: { type: "test" }
});
```

Or test with the Expo Push Notification Tool:
- Go to https://expo.dev/notifications
- Paste your Expo push token
- Enter title and message
- Click "Send a Notification"

### 5.4 Test Notification Interactions

1. **Foreground**: Send notification while app is open → should display alert
2. **Background**: Minimize app → send notification → should appear in notification tray
3. **Tap**: Tap notification → app should open and trigger response listener
4. **Mark as Read**: Tap notification in app → should update read status

---

## Step 6: EAS Build & Deployment

### 6.1 Configure EAS Project

```bash
# Login to EAS
eas login

# Initialize EAS project
eas build:configure
```

This creates/updates `eas.json` and links your Expo account.

### 6.2 Build for Android

```bash
# Development build (for testing)
eas build --platform android --profile development

# Production build (for app stores)
eas build --platform android --profile production
```

The build will:
- Use `google-services.json` for FCM setup
- Configure notification channels
- Generate APK or AAB file

### 6.3 Build for iOS

**Requirements**:
- Apple Developer account ($99/year)
- Push notification capability enabled
- APNs certificate/key configured

```bash
# Register device for development
eas device:create

# Build for iOS
eas build --platform ios --profile development
```

For production iOS:
1. Generate push notification certificate in Apple Developer Portal
2. Upload to Expo: `eas credentials`
3. Build: `eas build --platform ios --profile production`

### 6.4 Submit to App Stores

```bash
# Submit to Google Play
eas submit --platform android

# Submit to App Store
eas submit --platform ios
```

---

## Troubleshooting

### Issue: "Must use physical device" error

**Solution**: Push notifications don't work on iOS simulators. Use a physical device.

---

### Issue: Token not being saved to Convex

**Checklist**:
- Verify user is authenticated (check `userId` in hook)
- Check Convex deployment URL in `.env`
- Verify `savePushToken` mutation has no errors
- Check network tab for failed requests

---

### Issue: Notifications not received

**Android**:
- Verify `google-services.json` is in project root
- Check package name matches in `app.json` and Firebase
- Ensure FCM is enabled in Firebase Console
- Check notification channel is created (Android 8+)

**iOS**:
- Verify push notification capability is enabled
- Check APNs certificate is valid
- Ensure device is registered for notifications
- Test with physical device (not simulator)

---

### Issue: "Expo push token" vs "Device push token"

Expo uses its own push service that routes to APNs/FCM. You should use **Expo push tokens** (format: `ExponentPushToken[xxxxx]`), not native device tokens.

---

### Issue: Notifications received but not displayed

Check `setNotificationHandler` configuration:
```typescript
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,      // ← Must be true
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});
```

---

### Issue: Can't send notifications from Convex

**Common causes**:
- Push token not in correct format
- Expo Push API returned error (check `result.data.status`)
- Network/CORS issues (unlikely with Convex actions)

**Debug**:
```typescript
console.log("Token:", tokenRecord.pushToken);
console.log("API Response:", result);
```

---

## API Reference

### Convex Functions

#### `savePushToken`
```typescript
useMutation(api.notifications.savePushToken)({
  userId: string,
  pushToken: string,
  deviceType: 'ios' | 'android'
})
```
Saves or updates a user's push notification token.

---

#### `getMyNotifications`
```typescript
useQuery(api.notifications.getMyNotifications, {
  userId: string,
  limit?: number // default: 50
})
```
Returns array of notifications for the current user.

---

#### `markAsRead`
```typescript
useMutation(api.notifications.markAsRead)({
  notificationId: Id<"notifications">
})
```
Marks a notification as read by setting `readAt` timestamp.

---

#### `getUnreadCount`
```typescript
useQuery(api.notifications.getUnreadCount, {
  userId: string
})
```
Returns count of unread notifications for user.

---

#### `sendNotification`
```typescript
useAction(api.notifications.sendNotification)({
  userId: string,
  title: string,
  body: string,
  data?: any
})
```
Sends push notification to a single user.

---

#### `sendBulkNotification`
```typescript
useAction(api.notifications.sendBulkNotification)({
  userIds: string[],
  title: string,
  body: string,
  data?: any
})
```
Sends notification to multiple users.

---

#### `sendToAllUsers`
```typescript
useAction(api.notifications.sendToAllUsers)({
  title: string,
  body: string,
  data?: any
})
```
Broadcasts notification to all registered users.

---

### React Hooks

#### `useNotifications()`
```typescript
const {
  expoPushToken: string | undefined,
  myNotifications: Notification[] | undefined,
  unreadCount: number | undefined
} = useNotifications();
```
Main hook that registers device, saves token, and provides notification data.

---

### Utility Functions

#### `registerForPushNotificationsAsync()`
```typescript
const token = await registerForPushNotificationsAsync();
// Returns: "ExponentPushToken[xxxxx]" or undefined
```
Requests permissions and retrieves Expo push token.

---

## Advanced Features

### Custom Notification Sounds

1. Add sound file to `assets/sounds/notification.wav`
2. Update notification payload:
```typescript
{
  to: token,
  sound: "notification.wav", // Custom sound
  title: "...",
  body: "..."
}
```

### Rich Notifications (iOS)

1. Enable notification service extension in EAS build
2. Add image/video to notification:
```typescript
{
  to: token,
  title: "...",
  body: "...",
  data: {
    image: "https://example.com/image.jpg"
  }
}
```

### Scheduled Notifications

```typescript
import * as Notifications from "expo-notifications";

await Notifications.scheduleNotificationAsync({
  content: {
    title: "Reminder",
    body: "Don't forget to check the app!",
  },
  trigger: {
    seconds: 60, // 1 minute from now
  },
});
```

### Badge Count Management

```typescript
// Set badge number
await Notifications.setBadgeCountAsync(5);

// Clear badge
await Notifications.setBadgeCountAsync(0);
```

---

## Best Practices

1. **Always request permissions gracefully**: Explain why you need notifications before requesting
2. **Handle token refresh**: Expo tokens can change; re-save on app updates
3. **Respect user preferences**: Allow users to opt-out in settings
4. **Don't spam**: Limit notification frequency
5. **Test on physical devices**: Simulators don't support push notifications
6. **Monitor delivery**: Log notification status in Convex for debugging
7. **Handle errors**: Gracefully handle permission denials and token failures
8. **Secure your tokens**: Never expose push tokens in client-side code beyond sending to your backend

---

## Resources

- [Expo Notifications Docs](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Convex Docs](https://docs.convex.dev/)
- [Clerk Docs](https://clerk.com/docs)
- [Firebase Console](https://console.firebase.google.com/)
- [EAS Build Docs](https://docs.expo.dev/build/introduction/)
- [Expo Push Notification Tool](https://expo.dev/notifications)

---

## Support

If you encounter issues:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review Convex logs in the dashboard
3. Check Expo build logs: `eas build:list`
4. Test with Expo Push Notification Tool first
5. Verify permissions are granted on device

---

**Last Updated**: January 2026

This guide is based on the implementation in `test-integration-app` with Expo SDK 52, Convex v1.29+, and Clerk v2.19+.
