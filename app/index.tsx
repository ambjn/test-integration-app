import { Button, Text, View } from "react-native";

export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>Test Integration App</Text>
      <Button title="Test Integration App" onPress={() => console.log("Test Integration App")} />
    </View>
  );
}
