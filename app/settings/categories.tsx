import { Stack } from "expo-router";

import { SettingsScreenContent } from "../(tabs)/explore";

export default function CategoriesSettingsScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          animation: "slide_from_right",
          gestureEnabled: true,
          headerShown: false,
        }}
      />
      <SettingsScreenContent mode="categories" />
    </>
  );
}
