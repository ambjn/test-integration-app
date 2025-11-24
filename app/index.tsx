import { Text, TouchableOpacity, View } from "react-native";
import { Button } from 'heroui-native';

export default function Index() {
  return (
    <View className="flex-1 justify-center items-center bg-background">
      <Button onPress={() => console.log('Pressed!')}>Get Started</Button>
    </View>
  );
}
