import "@/global.css";

import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import { Stack } from "expo-router";
import { HeroUINativeProvider } from "heroui-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";


const RootStack = () => {
  const { isSignedIn, isLoaded } = useAuth();
  console.log(isLoaded);
  return (
    <Stack />
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HeroUINativeProvider>
        <ClerkProvider tokenCache={tokenCache}>
          <RootStack />
        </ClerkProvider>
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  );
}

