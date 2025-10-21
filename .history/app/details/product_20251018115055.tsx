import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { deleteProduct, updateProduct } from "../api";

export default function ProductDetailScreen() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const router = useRouter();
  const params = useLocalSearchParams();

  // Helper functions to handle both data structures
  const getProductId = () => {
    const idParam = Array.isArray(params.id) ? params.id[0] : params.id;
    return String(idParam || "");
  };

  const getName = () => {
    const nameParam = Array.isArray(params.name) ? params.name[0] : params.name;
    return String(nameParam || "Unknown Product");
  };

  const getQuantity = () => {
    const quantityParam = Array.isArray(params.quantity) ? params.quantity[0] : params.quantity;
    const qParam = Array.isArray(params.q) ? params.q[0] : params.q;
    return Number(quantityParam || qParam || 0);
  };

  const getUnit = () => {
    const unitParam = Array.isArray(params.unit) ? params.unit[0] : params.unit;
    return String(unitParam || "units");
  };

  const getCategories = () => {
    try {
      // Try categories array first
      const categoriesParam = Array.isArray(params.categories) ? params.categories[0] : params.categories;
      if (categoriesParam) {
        const parsed = JSON.parse(categoriesParam);
        return Array.isArray(parsed) ? parsed : [parsed];
      }
    } catch (e) {
      // If categories fails, try single category
      const categoryParam = Array.isArray(params.category) ? params.category[0] : params.category;
      if (categoryParam) {
        return [categoryParam];
      }
    }
    return ["Other"];
  };

  const getPrimaryCategory = () => {
    const primaryParam = Array.isArray(params.primaryCategory) ? params.primaryCategory[0] : params.primaryCategory;
    const categories = getCategories();
    return primaryParam || categories[0] || "Other";
  };

  const getDescription = () => {
    const descriptionParam = Array.isArray(params.description) ? params.description[0] : params.description;
    return String(descriptionParam || "");
  };

  const getLastUsed = () => {
    const lastUsedParam = Array.isArray(params.lastUsed) ? params.lastUsed[0] : params.lastUsed;
    return lastUsedParam || null;
  };

  const getTotalUsed = () => {
    const totalUsedParam = Array.isArray(params.totalUsed) ? params.totalUsed[0] : params.totalUsed;
    return Number(totalUsedParam || 0);
  };

  // State
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(getName());
  const [editedUnit, setEditedUnit] = useState(getUnit());
  const [editedCategories, setEditedCategories] = useState<string[]>(getCategories());
  const [editedDescription, setEditedDescription] = useState(getDescription());
  const [isLoading, setIsLoading] = useState(false);

  const productId = getProductId();
  const quantity = getQuantity();
  const lastUsedDate = getLastUsed();
  const totalUsedAmount = getTotalUsed();
  const primaryCategory = getPrimaryCategory();

  // Update product
  const handleUpdate = async () => {
    if (!editedName.trim() || !editedUnit.trim()) {
      Alert.alert("Error", "Please enter valid values for name and unit.");
      return;
    }

    setIsLoading(true);
    try {
      const updateData: any = {
        name: editedName.trim(),
        unit: editedUnit.trim(),
        description: editedDescription.trim(),
        quantity: quantity
      };

      // Add categories if they exist and are different from default
      if (editedCategories.length > 0 && !(editedCategories.length === 1 && editedCategories[0] === "Other")) {
        updateData.categories = editedCategories;
        updateData.primaryCategory = editedCategories[0];
        // Also set category for backward compatibility
        updateData.category = editedCategories[0];
      }

      await updateProduct(productId, updateData);
      
      Alert.alert("✅ Success", `Product updated successfully!`);
      setIsEditing(false);
    } catch (error) {
      console.error("❌ Update product error:", error);
      Alert.alert("❌ Error", "Failed to update product. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Delete product
  const handleDelete = () => {
    Alert.alert(
      "Delete Product",
      "Are you sure you want to delete this product? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: handleConfirmDelete }
      ]
    );
  };

  const handleConfirmDelete = async () => {
    setIsLoading(true);
    try {
      await deleteProduct(productId);
      Alert.alert("✅ Success", "Product has been deleted.");
      router.back();
    } catch (error) {
      console.error("❌ Delete product error:", error);
      Alert.alert("❌ Error", "Failed to delete product. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedName(getName());
    setEditedUnit(getUnit());
    setEditedCategories(getCategories());
    setEditedDescription(getDescription());
    setIsEditing(false);
  };

  const getStockStatus = () => {
    if (quantity === 0) return { status: 'Out of Stock', color: '#ef4444' };
    if (quantity <= 5) return { status: 'Low Stock', color: '#f59e0b' };
    return { status: 'In Stock', color: '#10b981' };
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never used';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const stockStatus = getStockStatus();
  const styles = getStyles(isDarkMode);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ 
        headerShown: false
      }} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Details</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Product Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Product Information</Text>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => isEditing ? handleCancelEdit() : setIsEditing(true)}
            >
              <Text style={styles.editButtonText}>
                {isEditing ? 'Cancel' : 'Edit'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Product Details */}
          <View style={styles.details}>
            {/* ID */}
            <View style={styles.detailRow}>
              <Text style={styles.label}>Product ID</Text>
              <Text style={styles.value}>{productId}</Text>
            </View>

            {/* Name */}
            <View style={styles.detailRow}>
              <Text style={styles.label}>Product Name</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={editedName}
                  onChangeText={setEditedName}
                  placeholder="Enter product name"
                />
              ) : (
                <Text style={styles.value}>{editedName}</Text>
              )}
            </View>

            {/* Quantity */}
            <View style={styles.detailRow}>
              <Text style={styles.label}>Current Stock</Text>
              <View style={styles.quantityContainer}>
                <Text style={[styles.quantity, { color: stockStatus.color }]}>
                  {quantity}
                </Text>
                <Text style={styles.unit}>{editedUnit}</Text>
                <View style={[styles.statusBadge, { backgroundColor: stockStatus.color }]}>
                  <Text style={styles.statusText}>{stockStatus.status}</Text>
                </View>
              </View>
            </View>

            {/* Unit */}
            <View style={styles.detailRow}>
              <Text style={styles.label}>Unit</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={editedUnit}
                  onChangeText={setEditedUnit}
                  placeholder="e.g., kg, box, piece"
                />
              ) : (
                <Text style={styles.value}>{editedUnit}</Text>
              )}
            </View>

            {/* Categories */}
            <View style={styles.detailRow}>
              <Text style={styles.label}>Categories</Text>
              <View style={styles.categoriesContainer}>
                {editedCategories.map((cat, index) => (
                  <View key={cat} style={[
                    styles.categoryTag,
                    index === 0 && styles.primaryCategoryTag
                  ]}>
                    <Text style={styles.categoryTagText}>
                      {index === 0 && "🏠 "}{cat}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Description */}
            <View style={styles.detailRow}>
              <Text style={styles.label}>Description</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={editedDescription}
                  onChangeText={setEditedDescription}
                  placeholder="Product description"
                  multiline
                  numberOfLines={3}
                />
              ) : (
                <Text style={[styles.value, !editedDescription && styles.placeholder]}>
                  {editedDescription || "No description"}
                </Text>
              )}
            </View>

            {/* Usage Stats - Display Only */}
            {!isEditing && (
              <>
                <View style={styles.detailRow}>
                  <Text style={styles.label}>Last Used</Text>
                  
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.label}>Total Used</Text>
                  <Text style={styles.value}>{totalUsedAmount} {getUnit()}</Text>
                </View>
              </>
            )}
          </View>

          {/* Save Button */}
          {isEditing && (
            <TouchableOpacity
              style={[styles.saveButton, isLoading && styles.buttonDisabled]}
              onPress={handleUpdate}
              disabled={isLoading}
            >
              <Text style={styles.saveButtonText}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {!isEditing && (
            <TouchableOpacity
              style={[styles.editAction, isLoading && styles.buttonDisabled]}
              onPress={() => setIsEditing(true)}
              disabled={isLoading}
            >
              <Text style={styles.editActionText}>Edit Product</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.deleteButton, isLoading && styles.buttonDisabled]}
            onPress={handleDelete}
            disabled={isLoading}
          >
            <Text style={styles.deleteButtonText}>
              {isLoading ? "Deleting..." : "Delete Product"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// ... (keep the same getStyles function from previous code)

const getStyles = (isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDarkMode ? "#0f172a" : "#f8fafc",
  },
  // Header
  header: {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "#334155" : "#e2e8f0",
  },
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    fontSize: 16,
    color: isDarkMode ? "#f1f5f9" : "#3b82f6",
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
  },
  // Content
  content: {
    flex: 1,
    padding: 20,
  },
  // Card
  card: {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: isDarkMode ? "#334155" : "#e2e8f0",
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? "#f1f5f9" : "#475569",
  },
  // Details
  details: {
    gap: 16,
  },
  detailRow: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  value: {
    fontSize: 16,
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    padding: 12,
    backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#e2e8f0",
  },
  placeholder: {
    color: isDarkMode ? "#64748b" : "#94a3b8",
    fontStyle: 'italic',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantity: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  unit: {
    fontSize: 16,
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  // Categories - Fixed styles
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryTag: {
    backgroundColor: isDarkMode ? "#2E8B57" : "#2E8B57",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  primaryCategoryTag: {
    backgroundColor: isDarkMode ? "#1e40af" : "#1e40af",
  },
  categoryTagText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Inputs
  input: {
    backgroundColor: isDarkMode ? "#334155" : "#ffffff",
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#cbd5e1",
    borderRadius: 8,
    padding: 12,
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  // Buttons
  saveButton: {
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  actions: {
    gap: 12,
  },
  editAction: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editActionText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});