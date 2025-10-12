import { Stack, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme
} from "react-native";
import { createClient } from "../api";

export default function AddClientScreen() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  const handleSave = async () => {
    if (!name || !phone) {
      return Alert.alert("Error", "Please fill all fields");
    }

    try {
      setLoading(true);
      const res = await createClient({
        name,
        phone,
        location  
      });
      Alert.alert("Success", `Client created with ID: ${res.data.id}`);
      // Reset form
      setName("");
      setPhone("");
      setLocation("");
      router.back(); // Navigate back to previous screen  
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to create client");
    } finally {
      setLoading(false);
    }
  };

  const styles = getStyles(isDarkMode);

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: "Add Customer",
          headerStyle: {
            backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
          },
          headerTintColor: isDarkMode ? "#f1f5f9" : "#1e293b",
          headerTitleStyle: {
            color: isDarkMode ? "#f1f5f9" : "#1e293b",
          }
        }} 
      />
      

      {/* Client Name */}
      <Text style={styles.label}>Customer Name</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter client name"
        placeholderTextColor={isDarkMode ? "#9ca3af" : "#6b7280"}
        value={name}
        onChangeText={setName}
      />

      {/* Phone Number */}
      <Text style={styles.label}>Phone Number</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter phone number"
        placeholderTextColor={isDarkMode ? "#9ca3af" : "#6b7280"}
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />

      {/* Location */}
      <Text style={styles.label}>Location</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter location"
        placeholderTextColor={isDarkMode ? "#9ca3af" : "#6b7280"}
        value={location}
        onChangeText={setLocation}
      />

      {/* Save Button */}
      <TouchableOpacity 
        style={[styles.saveBtn, loading && styles.saveBtnDisabled]} 
        onPress={handleSave}
        disabled={loading}
      >
        <Text style={styles.saveBtnText}>
          {loading ? "Saving..." : "Save Client"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const getStyles = (isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: isDarkMode ? "#121212" : "#f8fafc",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
    color: isDarkMode ? "#60a5fa" : "#3b82f6",
  },
  label: {
    fontWeight: "bold",
    marginTop: 12,
    marginBottom: 4,
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
  },
  input: {
    borderWidth: 1,
    borderColor: isDarkMode ? "#334155" : "#d1d5db",
    borderRadius: 10,
    padding: 12,
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    color: isDarkMode ? "#f8fafc" : "#1e293b",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkMode ? 0.3 : 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveBtn: {
    backgroundColor: isDarkMode ? "#3b82f6" : "#2563eb",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDarkMode ? 0.4 : 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  saveBtnDisabled: {
    backgroundColor: isDarkMode ? "#4b5563" : "#9ca3af",
  },
  saveBtnText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
});