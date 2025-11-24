import { useAuth, useUser } from '@clerk/clerk-expo';
import { Button } from 'heroui-native';
import { Text, View } from "react-native";

export default function Index() {
  const { isSignedIn, signOut } = useAuth();
  const { user } = useUser();
  console.log(user);
  return (
    <View className="flex-1 justify-center items-center ">
      {isSignedIn && <Text>{user?.emailAddresses[0].emailAddress}</Text>}
      <Button onPress={() => signOut()}>Log Out</Button>
    </View>
  );
}
