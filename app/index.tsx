import { Button, Text, View } from "react-native";

export default function Index() {
  return (
    <View className="flex-1 justify-center items-center">
      <Text>Test Integration App</Text>
      <Button title="Test Integration App" onPress={() => console.log("Test Integration App")} />
    </View>
  );
}
