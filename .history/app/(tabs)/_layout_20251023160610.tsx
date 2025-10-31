import { HapticTab } from "@/components/haptic-tab";
import { Colors } from "@/constants/theme";
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
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        tabBarInactiveTintColor: isDark ? '#64748b' : '#94a3b8',
        tabBarStyle: {
          backgroundColor: isDark ? '#1e293b' : '#f8fafc',
          borderTopColor: isDark ? '#334155' : '#cbd5e1',
          borderTopWidth: 1,
          height: 58,
          paddingBottom: 4,
          paddingTop: 6,
          elevation: 2,
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
              size={focused ? size + 3 : size + 1} 
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
              size={focused ? size + 3 : size + 1} 
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
              size={focused ? size + 3 : size + 1} 
              color={color} 
            />
          ),
        }}
      />
    </Tabs>
  );
}