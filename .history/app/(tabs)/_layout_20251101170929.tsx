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
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          borderTopWidth: 1,
          borderTopColor: isDark ? '#334155' : '#e2e8f0',
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 8,
          marginHorizontal: 0,
          marginBottom: 0,
          borderRadius: 0,
          shadowColor: 'transparent',
          shadowOffset: {
            width: 0,
            height: 0,
          },
          shadowOpacity: 0,
          shadowRadius: 0,
          elevation: 0,
          borderWidth: 0,
          position: 'relative',
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