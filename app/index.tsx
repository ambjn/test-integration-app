import { Text, TouchableOpacity, View } from "react-native";

export default function Index() {
  return (
    <View className="flex-1 justify-center items-center">

      <TouchableOpacity>
        <Text
          className="text-7xl font-bold text-gray-900 dark:text-white"
          selectionColorClassName="accent-blue-500"
        >
          {`Hello World`}
        </Text></TouchableOpacity>
    </View>
  );
}
