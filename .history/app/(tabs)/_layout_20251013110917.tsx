import { HapticTab } from "@/components/haptic-tab";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";

// Define the type for tabBarIcon props
type TabBarIconProps = {
  color: string;
  size: number;
};

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }: TabBarIconProps) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ProductsScreen"
        options={{
          title: "Products",
          tabBarIcon: ({ color, size }: TabBarIconProps) => (
            <Ionicons name="cube" size={size} color={color} />
          ),
        }}
      />
            <Tabs.Screen
        name="History"
        options={{
          title: "History",
          tabBarIcon: ({ color, size }: TabBarIconProps) => (
            <Ionicons name="cube" size={size} color={color} />
          ),
        }}
      />


    </Tabs>
  );
}