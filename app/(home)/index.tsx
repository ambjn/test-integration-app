import { api } from "@/convex/_generated/api";
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useQuery } from "convex/react";
import { Button } from 'heroui-native';
import React from "react";
import { ActivityIndicator, Text, View } from "react-native";

export default function Index() {
  const { isSignedIn, signOut } = useAuth();
  const { user } = useUser();
  const tasks = useQuery(api.tasks.get);

  const isLoading = tasks === undefined;

  return (
    <View className="flex-1 justify-center items-center bg-background-tertiary gap-4">
      {isSignedIn && <Text>{user?.emailAddresses[0].emailAddress}</Text>}
      <Button onPress={() => signOut()}>Log Out</Button>

      {isLoading ? <ActivityIndicator /> : tasks?.map(({ _id, text }) => <Text key={_id}>{text}</Text>)}
    </View>
  );
}
