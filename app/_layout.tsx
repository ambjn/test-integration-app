import "@/global.css";

import { ClerkLoaded, ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { Stack } from "expo-router";
import { HeroUINativeProvider } from "heroui-native";
import { ActivityIndicator } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false,
});

const RootStack = () => {
  const { isSignedIn, isLoaded } = useAuth();


  if (!isLoaded) return <ActivityIndicator />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!isSignedIn}>
        <Stack.Screen name="(home)" />
      </Stack.Protected>
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="(auth)/sign-in" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HeroUINativeProvider>
        <ClerkProvider tokenCache={tokenCache}>
          <ClerkLoaded>
            <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
              <RootStack />
            </ConvexProviderWithClerk>
          </ClerkLoaded>
        </ClerkProvider>
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  );
}

