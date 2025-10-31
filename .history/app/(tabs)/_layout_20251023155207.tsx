import { HapticTab } from "@/components/haptic-tab";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, Text, View } from "react-native";

type TabBarIconProps = {
  color: string;
  size: number;
  focused: boolean;
};

// Mock data for badges
const tabBadges = {
  ProductsScreen: 3, // Example: 3 low stock items
  History: 0,
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
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          borderTopColor: isDark ? '#334155' : '#f1f5f9',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          paddingTop: 10,
          elevation: 6,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
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
          title: "Dashboard",
          tabBarIcon: ({ color, size, focused }: TabBarIconProps) => (
            <View style={{ position: 'relative' }}>
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
            <View style={{ position: 'relative' }}>
              <Ionicons 
                name={focused ? "cube" : "cube-outline"} 
                size={size} 
                color={color} 
              />
              {tabBadges.ProductsScreen > 0 && (
                <View style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  backgroundColor: '#ef4444',
                  borderRadius: 8,
                  minWidth: 16,
                  height: 16,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 1.5,
                  borderColor: isDark ? '#1e293b' : '#ffffff',
                }}>
                  <Text style={{
                    color: '#ffffff',
                    fontSize: 9,
                    fontWeight: 'bold',
                  }}>
                    {tabBadges.ProductsScreen}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="History"
        options={{
          title: "History",
          tabBarIcon: ({ color, size, focused }: TabBarIconProps) => (
            <View style={{ position: 'relative' }}>
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