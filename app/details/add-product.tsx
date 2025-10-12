import * as ImagePicker from "expo-image-picker";
import { Stack, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
} from "react-native";
import { saveProductImage } from "../../utils/productImageStorage";
import { createProduct } from "../api";
import { useAppContext } from "../context/appContext";

export default function AddProductScreen() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { refreshProducts } = useAppContext();
  const router = useRouter();

  // ✅ Pick image
  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  // ✅ Add product to backend
  const handleAdd = async () => {
    if (!name.trim() || !unitPrice || !quantity) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    // Validate numeric fields
    const priceValue = parseFloat(unitPrice);
    const quantityValue = parseInt(quantity);

    if (isNaN(priceValue) || priceValue <= 0) {
      Alert.alert("Error", "Please enter a valid unit price greater than 0");
      return;
    }

    if (isNaN(quantityValue) || quantityValue < 0) {
      Alert.alert("Error", "Please enter a valid quantity (0 or higher)");
      return;
    }

    setLoading(true);
    try {
      const productData = {
        name: name.trim(),
        price: priceValue,
        quantity: quantityValue,
      };

      console.log('🔄 Adding product:', productData);
      const response = await createProduct(productData);
      const newProductId = response.data.id;
      
      // Save image locally if it exists
      if (imageUri) {
        await saveProductImage(newProductId, imageUri);
      }
      
      Alert.alert("✅ Success", "Product added successfully!", [
        { 
          text: "OK", 
          onPress: () => {
            refreshProducts();
            router.back();
          }
        }
      ]);
      
    } catch (error: any) {
      console.error('❌ Error adding product:', error);
      
      switch (error.message) {
        case 'DUPLICATE_PRODUCT':
          Alert.alert(
            "⚠️ Product Exists", 
            `The product name "${name}" is already in use. Please choose a different name.`,
            [{ text: "OK" }]
          );
          break;
          
        case 'VALIDATION_ERROR':
          Alert.alert(
            "📝 Invalid Data", 
            "Please check that all fields are filled correctly.",
            [{ text: "OK" }]
          );
          break;
          
        case 'NETWORK_ERROR':
        case 'Request timeout':
          Alert.alert(
            "🌐 Connection Issue", 
            "Unable to connect to server. Please check your internet connection.",
            [{ text: "OK" }]
          );
          break;
          
        default:
          Alert.alert(
            "❌ Error", 
            "Unable to add product. Please try again later.",
            [{ text: "OK" }]
          );
      }
    } finally {
      setLoading(false);
    }
  };

  const styles = getStyles(isDarkMode);

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: "Add Product" }} />

      {/* Image Upload */}
      <Text style={styles.label}>Product Image</Text>
      <TouchableOpacity style={styles.imageBox} onPress={handlePickImage}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.imagePreview} />
        ) : (
          <Text style={styles.imagePlaceholder}>📷 Tap to add image</Text>
        )}
      </TouchableOpacity>

      {/* Product Name */}
      <Text style={styles.label}>Product Name</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter product name"
        placeholderTextColor={isDarkMode ? "#9ca3af" : "#6b7280"}
        value={name}
        onChangeText={setName}
      />

      {/* Quantity */}
      <Text style={styles.label}>Quantity in Stock</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter quantity"
        placeholderTextColor={isDarkMode ? "#9ca3af" : "#6b7280"}
        keyboardType="numeric"
        value={quantity}
        onChangeText={setQuantity}
      />

      {/* Unit Price */}
      <Text style={styles.label}>Unit Price</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter unit price"
        placeholderTextColor={isDarkMode ? "#9ca3af" : "#6b7280"}
        keyboardType="numeric"
        value={unitPrice}
        onChangeText={setUnitPrice}
      />

      {/* Save Button */}
      <TouchableOpacity 
        style={[styles.saveBtn, loading && styles.saveBtnDisabled]} 
        onPress={handleAdd}
        disabled={loading}
      >
        <Text style={styles.saveBtnText}>
          {loading ? "Adding Product..." : "Save Product"}
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
  label: {
    fontWeight: "bold",
    marginTop: 12,
    marginBottom: 4,
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: isDarkMode ? "#334155" : "#cbd5e1",
    borderRadius: 10,
    padding: 12,
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    color: isDarkMode ? "#f8fafc" : "#1e293b",
    marginBottom: 8,
    fontSize: 16,
  },
  imageBox: {
    height: 150,
    borderWidth: 1,
    borderColor: isDarkMode ? "#334155" : "#cbd5e1",
    borderRadius: 12,
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    marginBottom: 12,
    justifyContent: "center",
    alignItems: "center",
    borderStyle: 'dashed',
  },
  imagePlaceholder: {
    color: isDarkMode ? "#9ca3af" : "#6b7280",
    fontSize: 14,
  },
  imagePreview: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  saveBtn: {
    backgroundColor: isDarkMode ? "#2ab723ff" : "#16a34a",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkMode ? 0.3 : 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveBtnText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  saveBtnDisabled: {
    backgroundColor: isDarkMode ? "#374151" : "#9ca3af",
    opacity: 0.6,
  }
});