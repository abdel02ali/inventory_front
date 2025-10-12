import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { deleteClient, updateClient } from "../api";

export default function ClientDetailScreen() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const router = useRouter();
  const { id, name, phone, location } = useLocalSearchParams();

  // Helper function to get the actual values from params
  const getIdFromParams = () => {
    const idParam = Array.isArray(id) ? id[0] : id;
    return String(idParam || "");
  };

  const getNameFromParams = () => {
    const nameParam = Array.isArray(name) ? name[0] : name;
    return String(nameParam || "Unknown Client");
  };

  const getPhoneFromParams = () => {
    const phoneParam = Array.isArray(phone) ? phone[0] : phone;
    return String(phoneParam || "");
  };

  const getLocationFromParams = () => {
    const locationParam = Array.isArray(location) ? location[0] : location;
    return String(locationParam || "");
  };

  // State
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(getNameFromParams());
  const [editedPhone, setEditedPhone] = useState(getPhoneFromParams());
  const [editedLocation, setEditedLocation] = useState(getLocationFromParams());
  const [isLoading, setIsLoading] = useState(false);

  // Update client
  const handleUpdate = async () => {
    if (!editedName.trim()) {
      Alert.alert("Error", "Please enter a valid name.");
      return;
    }

    setIsLoading(true);
    try {
      const clientId = getIdFromParams();
      const updateData = {
        name: editedName.trim(),
        phone: editedPhone.trim(),
        location: editedLocation.trim()
      };

      await updateClient(clientId, updateData);
      
      Alert.alert(
        "Success", 
        `Client updated:\nName: ${editedName}\nPhone: ${editedPhone || "-"}\nLocation: ${editedLocation || "-"}`,
        [
          { 
            text: "OK", 
            onPress: () => {
              setIsEditing(false);
              router.back();
            }
          }
        ]
      );
    } catch (error) {
      console.error("Update client error:", error);
      Alert.alert("Error", "Failed to update client. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Delete client
  const handleDelete = () => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this client? This action cannot be undone.",
      [
        { 
          text: "Cancel", 
          style: "cancel" 
        },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: handleConfirmDelete 
        }
      ]
    );
  };

  // Confirm and execute delete
  const handleConfirmDelete = async () => {
    setIsLoading(true);
    try {
      const clientId = getIdFromParams();
      await deleteClient(clientId);
      
      Alert.alert(
        "Success", 
        "Client has been deleted successfully.",
        [
          { 
            text: "OK", 
            onPress: () => {
              router.back();
            }
          }
        ]
      );
    } catch (error) {
      console.error("Delete client error:", error);
      Alert.alert("Error", "Failed to delete client. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditedName(getNameFromParams());
    setEditedPhone(getPhoneFromParams());
    setEditedLocation(getLocationFromParams());
    setIsEditing(false);
  };

  const styles = getStyles(isDarkMode);

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* ✅ Custom header title */}
      <Stack.Screen
        options={{
          title: "Customer Details",
          headerStyle: {
            backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
          },
          headerTintColor: isDarkMode ? "#f1f5f9" : "#1e293b",
          headerTitleStyle: {
            color: isDarkMode ? "#f1f5f9" : "#1e293b",
          }
        }}
      />

      <Text style={styles.title}>
        Customer Details
      </Text>

      <View style={styles.card}>
        {/* ID */}
        <View style={styles.row}>
          <Text style={styles.label}>ID:</Text>
          <Text style={styles.value}>
            {getIdFromParams()}
          </Text>
        </View>

        {/* Name */}
        <View style={styles.row}>
          <Text style={styles.label}>Name:</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={editedName}
              onChangeText={setEditedName}
              placeholder="Enter client name"
              placeholderTextColor={isDarkMode ? "#94a3b8" : "#9ca3af"}
              editable={!isLoading}
            />
          ) : (
            <Text style={styles.value}>
              {editedName}
            </Text>
          )}
        </View>

        {/* Phone */}
        <View style={styles.row}>
          <Text style={styles.label}>Phone:</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={editedPhone}
              onChangeText={setEditedPhone}
              placeholder="Enter phone number"
              placeholderTextColor={isDarkMode ? "#94a3b8" : "#9ca3af"}
              keyboardType="phone-pad"
              editable={!isLoading}
            />
          ) : (
            <Text style={styles.value}>
              {editedPhone || "-"}
            </Text>
          )}
        </View>

        {/* Location */}
        <View style={styles.row}>
          <Text style={styles.label}>Location:</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={editedLocation}
              onChangeText={setEditedLocation}
              placeholder="Enter location"
              placeholderTextColor={isDarkMode ? "#94a3b8" : "#9ca3af"}
              editable={!isLoading}
            />
          ) : (
            <Text style={styles.value}>
              {editedLocation || "-"}
            </Text>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          {isEditing ? (
            <>
              <TouchableOpacity
                style={[styles.cancelButton, isLoading && styles.disabledButton]}
                onPress={handleCancelEdit}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, isLoading && styles.disabledButton]}
                onPress={handleUpdate}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>
                  {isLoading ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.updateButton, isLoading && styles.disabledButton]}
                onPress={() => setIsEditing(true)}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteButton, isLoading && styles.disabledButton]}
                onPress={handleDelete}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>
                  {isLoading ? "Deleting..." : "Delete"}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Debug Info - Remove in production */}
     
    </SafeAreaView>
  );
}

const getStyles = (isDarkMode: boolean) => StyleSheet.create({
  container: { 
    flex: 1, 
    paddingHorizontal: 16, 
    backgroundColor: isDarkMode ? "#121212" : "#f8fafc" 
  },
  title: { 
    fontSize: 26, 
    fontWeight: "bold", 
    marginBottom: 24, 
    textAlign: "center",
    color: isDarkMode ? "#f1f5f9" : "#1e293b"
  },
  card: {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: isDarkMode ? 0.3 : 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: isDarkMode ? "#334155" : "#e2e8f0",
  },
  row: { 
    flexDirection: "row", 
    marginBottom: 16, 
    alignItems: "center",
    justifyContent: "space-between" 
  },
  label: { 
    fontSize: 16, 
    fontWeight: "bold", 
    width: 80, 
    color: isDarkMode ? "#cbd5e1" : "#4b5563" 
  },
  value: { 
    fontSize: 16, 
    flex: 1, 
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    textAlign: "right"
  },
  input: {
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#cbd5e1",
    borderRadius: 8,
    padding: 12,
    backgroundColor: isDarkMode ? "#0f172a" : "#f8fafc",
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    fontSize: 14,
    flex: 1,
  },
  buttonRow: { 
    flexDirection: "row", 
    marginTop: 20, 
    justifyContent: "space-between",
    gap: 12,
  },
  updateButton: {
    flex: 1,
    backgroundColor: isDarkMode ? "#d97706" : "#f59e0b",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkMode ? 0.3 : 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButton: {
    flex: 1,
    backgroundColor: isDarkMode ? "#15803d" : "#16a34a",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkMode ? 0.3 : 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: isDarkMode ? "#4b5563" : "#6b7280",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkMode ? 0.3 : 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: isDarkMode ? "#b91c1c" : "#dc2626",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkMode ? 0.3 : 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: { 
    color: "#ffffff", 
    fontWeight: "bold",
    fontSize: 14,
  },
  disabledButton: {
    opacity: 0.6,
  },
  debugInfo: {
    backgroundColor: isDarkMode ? "#334155" : "#e2e8f0",
    padding: 8,
    borderRadius: 8,
    marginTop: 16,
  },
  debugText: {
    color: isDarkMode ? "#60a5fa" : "#3b82f6",
    fontSize: 10,
    textAlign: "center",
  },
});