import { useColorScheme } from '@/hooks/use-color-scheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import "../app/config/firebase";
import { AppProvider } from "./context/appContext";
import { NotificationProvider } from "./context/NotificationContext"; // Add this import
import AnimatedSplash from "./details/splashScreen";

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [appIsReady, setAppIsReady] = useState(false);
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    async function prepare() {
      try {
        // You can add notification initialization here if needed
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
        await SplashScreen.hideAsync();
      }
    }
    prepare();
  }, []);

  if (!appIsReady) {
    return <AnimatedSplash />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AppProvider>
        <NotificationProvider> {/* Wrap with NotificationProvider */}
          <Stack
            screenOptions={{
              contentStyle: {
                backgroundColor: isDark ? '#121212' : '#f8fafc',
              },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            {/* Add notification test screen */}
            <Stack.Screen 
              name="notification-test" 
              options={{ 
                title: 'Notification Test',
                presentation: 'modal'
              }} 
            />
            {/* Add notification settings screen */}
            <Stack.Screen 
              name="notification-settings" 
              options={{ 
                title: 'Notification Settings',
                presentation: 'modal'
              }} 
            />
          </Stack>
        </NotificationProvider>
      </AppProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}