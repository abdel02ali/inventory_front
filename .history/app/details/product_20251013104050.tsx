import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { deleteProductImage, getProductImage } from "../../utils/productImageStorage";
import { deleteProduct, updateProduct } from "../api";

export default function ProductDetailScreen() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const router = useRouter();
  const { id, name, quantity: q, unitPrice, price } = useLocalSearchParams();

  // Helper functions
  const getQuantityFromParams = () => {
    const quantityParam = Array.isArray(q) ? q[0] : q;
    return Number(quantityParam) || 0;
  };

  const getPriceFromParams = () => {
    const priceParam = Array.isArray(price) ? price[0] : price;
    const unitPriceParam = Array.isArray(unitPrice) ? unitPrice[0] : unitPrice;
    return Number(priceParam || unitPriceParam) || 0;
  };

  const getNameFromParams = () => {
    const nameParam = Array.isArray(name) ? name[0] : name;
    return String(nameParam || "Unknown Product");
  };

  // State
  const [quantity, setQuantity] = useState(getQuantityFromParams());
  const [addAmount, setAddAmount] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(getNameFromParams());
  const [editedPrice, setEditedPrice] = useState(String(getPriceFromParams()));
  const [isLoading, setIsLoading] = useState(false);
  const [productImage, setProductImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);

  // Load product image
  useEffect(() => {
    loadProductImage();
  }, [id]);

  const loadProductImage = async () => {
    try {
      setImageLoading(true);
      const productId = Array.isArray(id) ? id[0] : id;
      const imageUri = await getProductImage(productId);
      setProductImage(imageUri);
    } catch (error) {
      console.error('❌ Error loading product image:', error);
      setProductImage(null);
    } finally {
      setImageLoading(false);
    }
  };

  // Add stock
  const handleAddToStock = () => {
    const amount = parseInt(addAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Invalid Input", "Please enter a positive number.");
      return;
    }
    setQuantity(prev => prev + amount);
    setAddAmount("");
    Alert.alert("Success", `${amount} items added to stock!`);
  };

  // Update product
  const handleUpdate = async () => {
    if (!editedName.trim() || isNaN(Number(editedPrice)) || Number(editedPrice) < 0) {
      Alert.alert("Error", "Please enter valid values for name and price.");
      return;
    }

    setIsLoading(true);
    try {
      const productId = Array.isArray(id) ? id[0] : id;
      const updateData = {
        name: editedName.trim(),
        price: Number(editedPrice),
        quantity: quantity
      };

      await updateProduct(productId, updateData);
      
      Alert.alert(
        "✅ Success", 
        `Product updated successfully!`,
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
      console.error("❌ Update product error:", error);
      Alert.alert("❌ Error", "Failed to update product. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Delete product
  const handleDelete = () => {
    Alert.alert(
      "🗑️ Delete Product",
      "Are you sure you want to delete this product? This action cannot be undone.",
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

  const handleConfirmDelete = async () => {
    setIsLoading(true);
    try {
      const productId = Array.isArray(id) ? id[0] : id;
      await deleteProduct(productId);
      await deleteProductImage(productId);
      
      Alert.alert(
        "✅ Success", 
        "Product has been deleted.",
        [
          { 
            text: "OK", 
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      console.error("❌ Delete product error:", error);
      Alert.alert("❌ Error", "Failed to delete product. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedName(getNameFromParams());
    setEditedPrice(String(getPriceFromParams()));
    setIsEditing(false);
  };

  const styles = getStyles(isDarkMode);

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView 
        style={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <SafeAreaView edges={["top"]}>
          <Stack.Screen options={{ title: "Product Details" }} />

          {/* Header Section */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Product Details</Text>
            <Text style={styles.headerSubtitle}>Manage your product information</Text>
          </View>

          {/* Main Card */}
          <View style={styles.mainCard}>
            
            {/* Product Info Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Product Information</Text>
              
              {/* ID Field */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Product ID</Text>
                <View style={styles.fieldValue}>
                  <Text style={styles.fieldText}>{Array.isArray(id) ? id[0] : id}</Text>
                </View>
              </View>

              {/* Name Field */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Product Name</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.textInput}
                    value={editedName}
                    onChangeText={setEditedName}
                    placeholder="Enter product name"
                    placeholderTextColor={isDarkMode ? "#94a3b8" : "#9ca3af"}
                  />
                ) : (
                  <View style={styles.fieldValue}>
                    <Text style={styles.fieldText}>{editedName}</Text>
                  </View>
                )}
              </View>

              {/* Quantity Field */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Current Stock</Text>
                <View style={[styles.fieldValue, styles.quantityContainer]}>
                  <Text style={[styles.fieldText, styles.quantityText]}>{quantity}</Text>
                  <View style={[
                    styles.stockIndicator,
                    quantity === 0 ? styles.stockOut : 
                    quantity <= 10 ? styles.stockLow : styles.stockGood
                  ]}>
                    <Text style={styles.stockIndicatorText}>
                      {quantity === 0 ? 'Out of Stock' : 
                       quantity <= 10 ? 'Low Stock' : 'In Stock'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Price Field */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Unit Price</Text>
                {isEditing ? (
                  <View style={styles.priceInputContainer}>
                    <TextInput
                      style={[styles.textInput, styles.priceInput]}
                      value={editedPrice}
                      onChangeText={setEditedPrice}
                      keyboardType="numeric"
                      placeholder="0.00"
                      placeholderTextColor={isDarkMode ? "#94a3b8" : "#9ca3af"}
                    />
                    <Text style={styles.currency}>MAD</Text>
                  </View>
                ) : (
                  <View style={styles.fieldValue}>
                    <Text style={[styles.fieldText, styles.priceText]}>
                      {Number(getPriceFromParams()).toFixed(2)} MAD
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Stock Management Section */}
            {!isEditing && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Stock Management</Text>
                <View style={styles.stockActionCard}>
                  <Text style={styles.stockActionTitle}>Add to Stock</Text>
                  <Text style={styles.stockActionSubtitle}>Enter quantity to add to current stock</Text>
                  
                  <View style={styles.addStockRow}>
                    <TextInput
                      style={styles.stockInput}
                      placeholder="Enter amount"
                      placeholderTextColor={isDarkMode ? "#94a3b8" : "#9ca3af"}
                      keyboardType="numeric"
                      value={addAmount}
                      onChangeText={setAddAmount}
                    />
                    <TouchableOpacity
                      style={[
                        styles.addStockButton,
                        (!addAmount || parseInt(addAmount) <= 0) && styles.addStockButtonDisabled
                      ]}
                      onPress={handleAddToStock}
                      disabled={!addAmount || parseInt(addAmount) <= 0}
                    >
                      <Text style={styles.addStockButtonText}>Add Stock</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionSection}>
              {isEditing ? (
                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.cancelAction]}
                    onPress={handleCancelEdit}
                    disabled={isLoading}
                  >
                    <Text style={styles.cancelActionText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.saveAction]}
                    onPress={handleUpdate}
                    disabled={isLoading}
                  >
                    <Text style={styles.saveActionText}>
                      {isLoading ? "Saving..." : "Save Changes"}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.viewActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.editAction]}
                    onPress={() => setIsEditing(true)}
                    disabled={isLoading}
                  >
                    <Text style={styles.editActionText}>✏️ Edit Product</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteAction]}
                    onPress={handleDelete}
                    disabled={isLoading}
                  >
                    <Text style={styles.deleteActionText}>
                      {isLoading ? "Deleting..." : "🗑️ Delete Product"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </SafeAreaView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDarkMode ? "#0f172a" : "#f8fafc",
  },
  header: {
    backgroundColor: isDarkMode ? "#1e293b" : "#2E8B57",
    padding: 24,
    paddingTop: 60,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 8,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
  },
  mainCard: {
    margin: 16,
    marginTop: 24,
  },
  section: {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDarkMode ? 0.1 : 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "#334155" : "#e2e8f0",
  },
  field: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: isDarkMode ? "#94a3b8" : "#64748b",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  fieldValue: {
    backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#e2e8f0",
  },
  fieldText: {
    fontSize: 16,
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    fontWeight: "500",
  },
  quantityContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quantityText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  stockIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  stockGood: {
    backgroundColor: "#dcfce7",
  },
  stockLow: {
    backgroundColor: "#fef3c7",
  },
  stockOut: {
    backgroundColor: "#fee2e2",
  },
  stockIndicatorText: {
    fontSize: 12,
    fontWeight: "600",
    color: isDarkMode ? "#1e293b" : "#1e293b",
  },
  priceInputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  priceInput: {
    flex: 1,
    marginRight: 8,
  },
  priceText: {
    fontSize: 18,
    fontWeight: "bold",
    color: isDarkMode ? "#2E8B57" : "#2E8B57",
  },
  currency: {
    fontSize: 16,
    fontWeight: "600",
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  textInput: {
    backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#cbd5e1",
    borderRadius: 12,
    padding: 16,
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    fontSize: 16,
  },
  stockActionCard: {
    backgroundColor: isDarkMode ? "#334155" : "#f0fdf4",
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#bbf7d0",
  },
  stockActionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: isDarkMode ? "#f1f5f9" : "#065f46",
    marginBottom: 4,
  },
  stockActionSubtitle: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#047857",
    marginBottom: 16,
  },
  addStockRow: {
    flexDirection: "row",
    gap: 12,
  },
  stockInput: {
    flex: 1,
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#cbd5e1",
    borderRadius: 12,
    padding: 16,
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    fontSize: 16,
  },
  addStockButton: {
    backgroundColor: "#2E8B57",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  addStockButtonDisabled: {
    backgroundColor: isDarkMode ? "#374151" : "#9ca3af",
    opacity: 0.6,
  },
  addStockButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  actionSection: {
    marginTop: 8,
  },
  editActions: {
    flexDirection: "row",
    gap: 12,
  },
  viewActions: {
    gap: 12,
  },
  actionButton: {
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  editAction: {
    backgroundColor: isDarkMode ? "#f59e0b" : "#f59e0b",
  },
  editActionText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  deleteAction: {
    backgroundColor: isDarkMode ? "#dc2626" : "#dc2626",
  },
  deleteActionText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelAction: {
    flex: 1,
    backgroundColor: isDarkMode ? "#374151" : "#6b7280",
  },
  cancelActionText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  saveAction: {
    flex: 2,
    backgroundColor: isDarkMode ? "#2E8B57" : "#2E8B57",
  },
  saveActionText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});