import { HapticTab } from "@/components/haptic-tab";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, View } from "react-native";

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
        // Tab bar styling
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        tabBarInactiveTintColor: isDark ? '#64748b' : '#94a3b8',
        tabBarStyle: {
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          borderTopColor: isDark ? '#334155' : '#f1f5f9',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          paddingTop: 10,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: isDark ? 0.3 : 0.1,
          shadowRadius: 12,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
        tabBarItemStyle: {
          borderRadius: 12,
          marginHorizontal: 4,
          marginVertical: 4,
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size, focused }: TabBarIconProps) => (
            <View style={{
              backgroundColor: focused ? (isDark ? '#334155' : '#f1f5f9') : 'transparent',
              padding: 8,
              borderRadius: 12,
            }}>
              <Ionicons 
                name={focused ? "home" : "home-outline"} 
                size={size} 
                color={color} 
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="ProductsScreen"
        options={{
          title: "Products",
          tabBarIcon: ({ color, size, focused }: TabBarIconProps) => (
            <View style={{
              backgroundColor: focused ? (isDark ? '#334155' : '#f1f5f9') : 'transparent',
              padding: 8,
              borderRadius: 12,
            }}>
              <Ionicons 
                name={focused ? "cube" : "cube-outline"} 
                size={size} 
                color={color} 
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="History"
        options={{
          title: "History",
          tabBarIcon: ({ color, size, focused }: TabBarIconProps) => (
            <View style={{
              backgroundColor: focused ? (isDark ? '#334155' : '#f1f5f9') : 'transparent',
              padding: 8,
              borderRadius: 12,
            }}>
              <Ionicons 
                name={focused ? "time" : "time-outline"} 
                size={size} 
                color={color} 
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}