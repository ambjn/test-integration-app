import { api } from "@/convex/_generated/api";
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useMutation, useQuery } from "convex/react";
import { Button } from 'heroui-native';
import React from "react";
import { ActivityIndicator, Text, View } from "react-native";

export default function Index() {
  const { isSignedIn, signOut } = useAuth();
  const { user } = useUser();
  const getTodos = useQuery(api.todos.getTodos);
  const addTodo = useMutation(api.todos.addTodo);

  const isLoading = getTodos === undefined;

  return (
    <View className="flex-1 justify-center items-center bg-background-tertiary gap-4">
      {isSignedIn && <Text>{user?.emailAddresses[0].emailAddress}</Text>}
      <Button onPress={() => signOut()}>Log Out</Button>

      {isLoading ? <ActivityIndicator /> : getTodos?.map(({ _id, text }) => <Text key={_id}>{text}</Text>)}
      <Button onPress={() => addTodo({ text: "New Todo 1" })}>Add Todo</Button>
    </View>
  );
}
