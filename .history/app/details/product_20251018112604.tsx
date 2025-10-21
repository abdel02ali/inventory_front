import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { deleteProduct } from "../api";

export default function ProductDetailScreen() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const router = useRouter();
  const { id, name, quantity: q, unit, category, description } = useLocalSearchParams();

  // Helper functions
  const getQuantityFromParams = () => {
    const quantityParam = Array.isArray(q) ? q[0] : q;
    return Number(quantityParam) || 0;
  };

  const getUnitFromParams = () => {
    const unitParam = Array.isArray(unit) ? unit[0] : unit;
    return String(unitParam || "units");
  };

  const getCategoryFromParams = () => {
    const categoryParam = Array.isArray(category) ? category[0] : category;
    return String(categoryParam || "Other");
  };

  const getDescriptionFromParams = () => {
    const descriptionParam = Array.isArray(description) ? description[0] : description;
    return String(descriptionParam || "");
  };

  const getNameFromParams = () => {
    const nameParam = Array.isArray(name) ? name[0] : name;
    return String(nameParam || "Unknown Product");
  };

  // State
  const [isLoading, setIsLoading] = useState(false);

  const quantity = getQuantityFromParams();
  const productName = getNameFromParams();
  const productUnit = getUnitFromParams();
  const productCategory = getCategoryFromParams();
  const productDescription = getDescriptionFromParams();

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
      const productId = Array.isArray(id) ? id[0] : id;
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

  const getStockStatus = () => {
    if (quantity === 0) return { status: 'Out of Stock', color: '#ef4444' };
    if (quantity <= 5) return { status: 'Low Stock', color: '#f59e0b' };
    return { status: 'In Stock', color: '#10b981' };
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
          <Text style={styles.cardTitle}>Product Information</Text>

          {/* Product Details */}
          <View style={styles.details}>
            {/* ID */}
            <View style={styles.detailRow}>
              <Text style={styles.label}>Product ID</Text>
              <Text style={styles.value}>{Array.isArray(id) ? id[0] : id}</Text>
            </View>

            {/* Name */}
            <View style={styles.detailRow}>
              <Text style={styles.label}>Product Name</Text>
              <Text style={styles.value}>{productName}</Text>
            </View>

            {/* Quantity */}
            <View style={styles.detailRow}>
              <Text style={styles.label}>Current Stock</Text>
              <View style={styles.quantityContainer}>
                <Text style={[styles.quantity, { color: stockStatus.color }]}>
                  {quantity}
                </Text>
                <Text style={styles.unit}>{productUnit}</Text>
                <View style={[styles.statusBadge, { backgroundColor: stockStatus.color }]}>
                  <Text style={styles.statusText}>{stockStatus.status}</Text>
                </View>
              </View>
            </View>

            {/* Unit */}
            <View style={styles.detailRow}>
              <Text style={styles.label}>Unit</Text>
              <Text style={styles.value}>{productUnit}</Text>
            </View>

            {/* Category */}
            <View style={styles.detailRow}>
              <Text style={styles.label}>Category</Text>
              <View style={styles.categoryContainer}>
                <Text style={styles.categoryText}>{productCategory}</Text>
              </View>
            </View>

            {/* Description */}
            <View style={styles.detailRow}>
              <Text style={styles.label}>Description</Text>
              <Text style={[styles.value, !productDescription && styles.placeholder]}>
                {productDescription || "No description"}
              </Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.editAction, isLoading && styles.buttonDisabled]}
            onPress={() => router.push({
              pathname: "/details/edit-product",
              params: { 
                id, 
                name: productName, 
                quantity: quantity.toString(),
                unit: productUnit,
                category: productCategory,
                description: productDescription
              }
            })}
            disabled={isLoading}
          >
            <Text style={styles.editActionText}>Edit Product</Text>
          </TouchableOpacity>
          
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
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 20,
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
  // Category
  categoryContainer: {
    padding: 12,
    backgroundColor: isDarkMode ? "#2E8B57" : "#2E8B57",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: isDarkMode ? "#2E8B57" : "#2E8B57",
  },
  categoryText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
    textAlign: 'center',
  },
  // Buttons
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