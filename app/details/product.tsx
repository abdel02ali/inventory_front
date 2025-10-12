import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { deleteProductImage, getProductImage } from "../../utils/productImageStorage";
import { deleteProduct, updateProduct } from "../api";

export default function ProductDetailScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { id, name, quantity: q, unitPrice, price } = useLocalSearchParams();

  // Helper function to get the actual quantity from params
  const getQuantityFromParams = () => {
    const quantityParam = Array.isArray(q) ? q[0] : q;
    return Number(quantityParam) || 0;
  };

  // Helper function to get the actual price from params
  const getPriceFromParams = () => {
    const priceParam = Array.isArray(price) ? price[0] : price;
    const unitPriceParam = Array.isArray(unitPrice) ? unitPrice[0] : unitPrice;
    return Number(priceParam || unitPriceParam) || 0;
  };

  // Helper function to get the actual name from params
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

  // Load product image on component mount
  useEffect(() => {
    loadProductImage();
  }, [id]);

  const loadProductImage = async () => {
    try {
      setImageLoading(true);
      const productId = Array.isArray(id) ? id[0] : id;
      const imageUri = await getProductImage(productId);
      console.log('🖼️ Loaded product image:', imageUri ? 'Yes' : 'No');
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
        `Product updated:\nName: ${editedName}\nPrice: ${Number(editedPrice).toFixed(2)}MAD`,
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
      "🗑️ Confirm Delete",
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

  // Confirm and execute delete
  const handleConfirmDelete = async () => {
    setIsLoading(true);
    try {
      const productId = Array.isArray(id) ? id[0] : id;
      
      // Delete product from database
      await deleteProduct(productId);
      
      // Delete local image if exists
      await deleteProductImage(productId);
      
      Alert.alert(
        "✅ Success", 
        "Product has been deleted successfully.",
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
      console.error("❌ Delete product error:", error);
      Alert.alert("❌ Error", "Failed to delete product. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditedName(getNameFromParams());
    setEditedPrice(String(getPriceFromParams()));
    setIsEditing(false);
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <SafeAreaView
          style={[styles.container, colorScheme === "dark" && styles.containerDark]}
          edges={["top", "left", "right"]}
        >
          <Stack.Screen
            options={{
              title: "Product Details",
            }}
          />

          <View style={[styles.card, colorScheme === "dark" && styles.cardDark]}>
            
            {/* Product Image Section */}
            <View style={styles.imageSection}>
              <Text style={[styles.imageLabel, colorScheme === "dark" && styles.textDark]}>
                Product Image :
              </Text>
              {imageLoading ? (
                <View style={styles.placeholderImageLarge}>
                  <Text style={styles.placeholderTextLarge}>🔄 Loading...</Text>
                </View>
              ) : productImage ? (
                <Image 
                  source={{ uri: productImage }} 
                  style={styles.productImageLarge}
                  resizeMode="cover"
                  onError={() => {
                    console.log('❌ Image failed to load');
                    setProductImage(null);
                  }}
                />
              ) : (
                <View style={styles.placeholderImageLarge}>
                  <Text style={styles.placeholderTextLarge}>📷 No Image</Text>
                  <Text style={styles.placeholderSubtext}>
                    Add image when creating product
                  </Text>
                </View>
              )}
            </View>

            {/* ID */}
            <View style={styles.row}>
              <Text style={[styles.label, colorScheme === "dark" && styles.textDark]}>ID:</Text>
              <Text style={[styles.value, colorScheme === "dark" && styles.textDark]}>
                {Array.isArray(id) ? id[0] : id}
              </Text>
            </View>

            {/* Name */}
            <View style={styles.row}>
              <Text style={[styles.label, colorScheme === "dark" && styles.textDark]}>Name:</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.input, colorScheme === "dark" && styles.inputDark]}
                  value={editedName}
                  onChangeText={setEditedName}
                  placeholder="Product name"
                  placeholderTextColor={colorScheme === "dark" ? "#888" : "#aaa"}
                  editable={!isLoading}
                  returnKeyType="next"
                />
              ) : (
                <Text style={[styles.value, colorScheme === "dark" && styles.textDark]}>{editedName}</Text>
              )}
            </View>

            {/* Quantity */}
            <View style={styles.row}>
              <Text style={[styles.label, colorScheme === "dark" && styles.textDark]}>Quantity:</Text>
              <Text style={[styles.value, colorScheme === "dark" && styles.textDark]}>{quantity}</Text>
            </View>

            {/* Price */}
            <View style={styles.row}>
              <Text style={[styles.label, colorScheme === "dark" && styles.textDark]}>Price:</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.input, colorScheme === "dark" && styles.inputDark]}
                  value={editedPrice}
                  onChangeText={setEditedPrice}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor={colorScheme === "dark" ? "#888" : "#aaa"}
                  editable={!isLoading}
                  returnKeyType="done"
                />
              ) : (
                <Text style={[styles.value, colorScheme === "dark" && styles.textDark]}>
                  {Number(getPriceFromParams()).toFixed(2)} MAD
                </Text>
              )}
            </View>

            {/* Add to Stock */}
            {!isEditing && (
              <View style={[styles.addStockSection, { marginTop: 16 }]}>
                <Text style={[styles.sectionTitle, colorScheme === "dark" && styles.textDark]}>
                  Add to Stock
                </Text>
                <View style={styles.addStockRow}>
                  <TextInput
                    style={[styles.input, colorScheme === "dark" && styles.inputDark, { flex: 1 }]}
                    placeholder="Amount to add"
                    placeholderTextColor={colorScheme === "dark" ? "#888" : "#aaa"}
                    keyboardType="numeric"
                    value={addAmount}
                    onChangeText={setAddAmount}
                    editable={!isLoading}
                    returnKeyType="done"
                  />
                  <TouchableOpacity
                    style={[
                      styles.addButton, 
                      colorScheme === "dark" && styles.addButtonDark,
                      isLoading && styles.disabledButton
                    ]}
                    onPress={handleAddToStock}
                    disabled={isLoading}
                  >
                    <Text style={styles.buttonText}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.buttonRow}>
              {isEditing ? (
                <>
                  <TouchableOpacity
                    style={[
                      styles.cancelButton, 
                      colorScheme === "dark" && styles.cancelButtonDark,
                      isLoading && styles.disabledButton
                    ]}
                    onPress={handleCancelEdit}
                    disabled={isLoading}
                  >
                    <Text style={styles.buttonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.saveButton, 
                      colorScheme === "dark" && styles.saveButtonDark,
                      isLoading && styles.disabledButton
                    ]}
                    onPress={handleUpdate}
                    disabled={isLoading}
                  >
                    <Text style={styles.buttonText}>
                      {isLoading ? "Updating..." : "Save"}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={[
                      styles.updateButton, 
                      colorScheme === "dark" && styles.updateButtonDark,
                      isLoading && styles.disabledButton
                    ]}
                    onPress={() => setIsEditing(true)}
                    disabled={isLoading}
                  >
                    <Text style={styles.buttonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.deleteButton, 
                      colorScheme === "dark" && styles.deleteButtonDark,
                      isLoading && styles.disabledButton
                    ]}
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
        </SafeAreaView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, backgroundColor: "#f5f7fa" },
  containerDark: { backgroundColor: "#121212" },
  title: { fontSize: 26, fontWeight: "bold", marginBottom: 24, textAlign: "center" },
  titleLight: { color: "#1e3a8a" },
  titleDark: { color: "#f0f0f0" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    marginBottom: 16,
  },
  cardDark: { backgroundColor: "#1e1e1e" },

  // Image Section
  imageSection: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 10,
  },
  imageLabel: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#4b5563",
    alignSelf: 'flex-start',
  },
  productImageLarge: {
    width: 350,
    height: 200,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  placeholderImageLarge: {
    width: 150,
    height: 150,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
  },
  placeholderTextLarge: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    fontWeight: '600',
  },
  placeholderSubtext: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 4,
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
    color: "#4b5563" 
  },
  value: { 
    fontSize: 16, 
    flex: 1, 
    color: "#111827",
    textAlign: "right"
  },
  textDark: { color: "#f0f0f0" },

  addStockSection: {
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#4b5563",
  },
  addStockRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#fff",
    color: "#111",
    fontSize: 14,
  },
  inputDark: { 
    backgroundColor: "#1e1e1e", 
    borderColor: "#444", 
    color: "#fff" 
  },

  addButton: {
    backgroundColor: "#2563eb",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    minWidth: 60,
  },
  addButtonDark: { backgroundColor: "#3b82f6" },

  buttonRow: { 
    flexDirection: "row", 
    marginTop: 20, 
    justifyContent: "space-between",
    gap: 12,
  },
  updateButton: {
    flex: 1,
    backgroundColor: "#f59e0b",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  updateButtonDark: { backgroundColor: "#d97706" },
  
  saveButton: {
    flex: 1,
    backgroundColor: "#16a34a",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonDark: { backgroundColor: "#15803d" },
  
  cancelButton: {
    flex: 1,
    backgroundColor: "#6b7280",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonDark: { backgroundColor: "#4b5563" },
  
  deleteButton: {
    flex: 1,
    backgroundColor: "#dc2626",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  deleteButtonDark: { backgroundColor: "#b91c1c" },
  
  buttonText: { 
    color: "#fff", 
    fontWeight: "bold",
    fontSize: 14,
  },

  disabledButton: {
    opacity: 0.6,
  },

  storageInfo: {
    backgroundColor: "#e0f2fe",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  storageText: {
    fontSize: 12,
    color: "#0369a1",
    textAlign: 'center',
    fontStyle: 'italic',
  },
});