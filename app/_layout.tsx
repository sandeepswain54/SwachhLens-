import 'react-native-url-polyfill/auto';

import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router/react-navigation";
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { ReportFlowProvider } from '@/contexts/report-flow-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: 'welcome',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <ReportFlowProvider>
        <Stack>
          <Stack.Screen name="welcome" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="signup" options={{ headerShown: false }} />
          <Stack.Screen name="check-email" options={{ headerShown: false }} />
          <Stack.Screen name="verify-email" options={{ headerShown: false }} />
          <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
          <Stack.Screen name="reset-password" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(field)" options={{ headerShown: false }} />
          <Stack.Screen name="field-task-detail" options={{ headerShown: false }} />
          <Stack.Screen name="field-task-on-the-way" options={{ headerShown: false }} />
          <Stack.Screen name="field-task-progress" options={{ headerShown: false }} />
          <Stack.Screen name="field-task-submitted" options={{ headerShown: false }} />
          <Stack.Screen name="report-scan" options={{ headerShown: false }} />
          <Stack.Screen name="report-result" options={{ headerShown: false }} />
          <Stack.Screen name="report-confirm" options={{ headerShown: false }} />
          <Stack.Screen name="report-location-picker" options={{ headerShown: false }} />
          <Stack.Screen name="profile-location-picker" options={{ headerShown: false }} />
          <Stack.Screen name="report-submitted" options={{ headerShown: false }} />
          <Stack.Screen name="report-status" options={{ headerShown: false }} />
          <Stack.Screen name="report-feedback" options={{ headerShown: false }} />
          <Stack.Screen name="waste-hotspots" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
      </ReportFlowProvider>
      <StatusBar hidden />
    </ThemeProvider>
  );
}
