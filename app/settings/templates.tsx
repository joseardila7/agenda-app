import { Stack } from "expo-router";

import { SettingsScreenContent } from "../(tabs)/explore";

export default function TemplatesSettingsScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          animation: "slide_from_right",
          gestureEnabled: true,
          headerShown: false,
        }}
      />
      <SettingsScreenContent mode="templates" />
    </>
  );
}
