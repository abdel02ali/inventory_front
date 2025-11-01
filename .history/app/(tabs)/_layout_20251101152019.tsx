import { HapticTab } from "@/components/haptic-tab";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TabBarIconProps = {
  color: string;
  size: number;
  focused: boolean;
};

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        tabBarActiveTintColor: isDark ? '#f97316' : '#f97316',
        tabBarInactiveTintColor: isDark ? '#64748b' : '#94a3b8',
        tabBarStyle: {
          backgroundColor: isDark ? '#1e1e1e' : '#f8fafc',
          borderTopWidth: 0,
          height: 56 + Math.max(insets.bottom, 8), // Ensure minimum height
          paddingBottom: 6 + Math.max(insets.bottom, 8), // Dynamic padding
          paddingTop: 8,
          marginHorizontal: 16,
          marginBottom: 0,
          borderRadius: 16,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4,
          borderWidth: 1,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
          position: 'absolute',
          bottom: Math.max(insets.bottom, 8), // Always above system UI
          left: 16,
          right: 16,
        },
        tabBarBackground: () => null,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          marginTop: 1,
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size, focused }: TabBarIconProps) => (
            <Ionicons 
              name={focused ? "home" : "home-outline"} 
              size={focused ? size + 1 : size} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="ProductsScreen"
        options={{
          title: "Products",
          tabBarIcon: ({ color, size, focused }: TabBarIconProps) => (
            <Ionicons 
              name={focused ? "cube" : "cube-outline"} 
              size={focused ? size + 1 : size} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color, size, focused }: TabBarIconProps) => (
            <Ionicons 
              name={focused ? "list" : "list-outline"}
              size={focused ? size + 1 : size} 
              color={color} 
            />
          ),
        }}
      />
    </Tabs>
  );
}