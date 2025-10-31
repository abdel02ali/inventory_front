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
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          height: 58,
          paddingBottom: 6,
          paddingTop: 6,
          // Pill shape
          marginHorizontal: 20,
          marginBottom: 20,
          borderRadius: 30,
          // Gradient background (you'll need to use a gradient component)
          background: isDark 
            ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
            : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
          // Shadow
          shadowColor: '#3b82f6',
          shadowOffset: {
            width: 0,
            height: 4,
          },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 8,
          borderWidth: 1,
          borderColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(59, 130, 246, 0.3)',
        },
        tabBarBackground: () => null,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
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
              size={focused ? size + 2 : size} 
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
              size={focused ? size + 2 : size} 
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
              size={focused ? size + 2 : size} 
              color={color} 
            />
          ),
        }}
      />
    </Tabs>
  );
}