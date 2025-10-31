import { HapticTab } from "@/components/haptic-tab";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";

type TabBarIconProps = {
  color: string;
  size: number;
  focused: boolean;
};

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: isDark ? '#cbd5e1' : '#475569',
        tabBarStyle: {
          backgroundColor: isDark ? '#334155' : '#e2e8f0',
          borderTopWidth: 0,
          height: 52,
          paddingBottom: 4,
          paddingTop: 4,
          // Segmented control style
          marginHorizontal: 16,
          marginBottom: 16,
          borderRadius: 12,
          // Minimal shadow
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 1,
          },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          elevation: 3,
          paddingHorizontal: 4,
        },
        tabBarBackground: () => null,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
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
        name="History"
        options={{
          title: "History",
          tabBarIcon: ({ color, size, focused }: TabBarIconProps) => (
            <Ionicons 
              name={focused ? "time" : "time-outline"} 
              size={focused ? size + 1 : size} 
              color={color} 
            />
          ),
        }}
      />
    </Tabs>
  );
}