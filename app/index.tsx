import { Button } from 'heroui-native';
import { View } from "react-native";

export default function Index() {
  return (
    <View className="flex-1 justify-center items-center ">
      <Button onPress={() => console.log('Pressed!')}>Get Started</Button>
    </View>
  );
}
