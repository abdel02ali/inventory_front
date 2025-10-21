import { Stack, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { createProduct } from "../api";
import { useAppContext } from "../context/appContext";

export default function AddProductScreen() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const { refreshProducts } = useAppContext();
  const router = useRouter();

  // Common unit options
  const unitOptions = ['kg', 'g', 'L', 'mL', 'box', 'piece', 'pack', 'bottle', 'can', 'bag'];

  // Common category options for restaurant inventory
  const categoryOptions = [
    'Vegetables', 'Fruits', 'Meat', 'Seafood', 'Dairy', 'Herbs & Spices',
    'Grains & Pasta', 'Oils & Vinegars', 'Canned Goods', 'Bakery', 'Beverages',
    'Cleaning Supplies', 'Paper Goods', 'Utensils', 'Equipment', 'Other'
  ];

  // ✅ Add product to backend
  const handleAdd = async () => {
    if (!name.trim() || !quantity || !unit.trim() || !category.trim()) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    // Validate numeric fields
    const quantityValue = parseInt(quantity);

    if (isNaN(quantityValue) || quantityValue < 0) {
      Alert.alert("Error", "Please enter a valid quantity (0 or higher)");
      return;
    }

    setLoading(true);
    try {
      const productData = {
        name: name.trim(),
        quantity: quantityValue,
        unit: unit.trim(),
        category: category.trim(),
        description: description.trim() || "",
      };

      console.log('🔄 Adding product:', productData);
      const response = await createProduct(productData);
      
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
      <Stack.Screen options={{ title: "Add New Product" }} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Add New Product</Text>
        <Text style={styles.headerSubtitle}>
          Fill in the product details below
        </Text>
      </View>

      {/* Product Name */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          Product Name <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Enter product name"
          placeholderTextColor={isDarkMode ? "#94a3b8" : "#64748b"}
          value={name}
          onChangeText={setName}
        />
      </View>

      {/* Quantity */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          Initial Quantity <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Enter initial stock quantity"
          placeholderTextColor={isDarkMode ? "#94a3b8" : "#64748b"}
          keyboardType="numeric"
          value={quantity}
          onChangeText={setQuantity}
        />
      </View>

      {/* Unit */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          Unit <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., kg, box, piece, L"
          placeholderTextColor={isDarkMode ? "#94a3b8" : "#64748b"}
          value={unit}
          onChangeText={setUnit}
        />
        <Text style={styles.helperText}>
          Common units: kg, g, L, mL, box, piece, pack, bottle, can, bag
        </Text>
      </View>

      {/* Quick Unit Buttons */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Quick Unit Select</Text>
        <View style={styles.unitButtonsContainer}>
          {unitOptions.map((unitOption) => (
            <TouchableOpacity
              key={unitOption}
              style={[
                styles.unitButton,
                unit === unitOption && styles.unitButtonActive
              ]}
              onPress={() => setUnit(unitOption)}
            >
              <Text style={[
                styles.unitButtonText,
                unit === unitOption && styles.unitButtonTextActive
              ]}>
                {unitOption}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Category Selection */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          Category <Text style={styles.required}>*</Text>
        </Text>
        <Text style={styles.helperText}>
          Select a category to organize your products
        </Text>
        
        {/* Category Input with Suggestions */}
        <TextInput
          style={styles.input}
          placeholder="Type or select a category"
          placeholderTextColor={isDarkMode ? "#94a3b8" : "#64748b"}
          value={category}
          onChangeText={setCategory}
        />

        {/* Quick Category Buttons */}
        <View style={styles.categoryButtonsContainer}>
          {categoryOptions.map((categoryOption) => (
            <TouchableOpacity
              key={categoryOption}
              style={[
                styles.categoryButton,
                category === categoryOption && styles.categoryButtonActive
              ]}
              onPress={() => setCategory(categoryOption)}
            >
              <Text style={[
                styles.categoryButtonText,
                category === categoryOption && styles.categoryButtonTextActive
              ]}>
                {categoryOption}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Selected Category Display */}
        {category && (
          <View style={styles.selectedCategory}>
            <Text style={styles.selectedCategoryText}>
              Selected Category: <Text style={styles.selectedCategoryName}>{category}</Text>
            </Text>
          </View>
        )}
      </View>

      {/* Description */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Add product description (optional)"
          placeholderTextColor={isDarkMode ? "#94a3b8" : "#64748b"}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={[styles.cancelBtn, loading && styles.buttonDisabled]} 
          onPress={() => router.back()}
          disabled={loading}
        >
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.saveBtn, (loading || !category.trim()) && styles.saveBtnDisabled]} 
          onPress={handleAdd}
          disabled={loading || !category.trim()}
        >
          <Text style={styles.saveBtnText}>
            {loading ? "Adding..." : "Add Product"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Help Text */}
      <View style={styles.helpContainer}>
        <Text style={styles.helpText}>
          💡 <Text style={styles.helpBold}>Category Benefits:</Text> 
          {"\n"}• Better organization and filtering
          {"\n"}• Faster product searching
          {"\n"}• Inventory analysis by category
          {"\n"}• Automated reporting and insights
        </Text>
      </View>
    </ScrollView>
  );
}

const getStyles = (isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDarkMode ? "#121212" : "#f8fafc",
  },
  header: {
    backgroundColor: isDarkMode ? "#1e293b" : "#2E8B57",
    padding: 24,
    paddingTop: 40,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
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
  inputGroup: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  label: {
    fontWeight: "600",
    marginBottom: 8,
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    fontSize: 16,
  },
  required: {
    color: "#ef4444",
  },
  helperText: {
    fontSize: 12,
    color: isDarkMode ? "#64748b" : "#94a3b8",
    marginTop: 4,
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#cbd5e1",
    borderRadius: 12,
    padding: 16,
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    color: isDarkMode ? "#f8fafc" : "#1e293b",
    fontSize: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDarkMode ? 0.1 : 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 16,
  },
  unitButtonsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  unitButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: isDarkMode ? "#334155" : "#f1f5f9",
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#e2e8f0",
  },
  unitButtonActive: {
    backgroundColor: '#2E8B57',
    borderColor: '#2E8B57',
  },
  unitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  unitButtonTextActive: {
    color: '#ffffff',
  },
  // Category Styles
  categoryButtonsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: isDarkMode ? "#334155" : "#f1f5f9",
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#e2e8f0",
  },
  categoryButtonActive: {
    backgroundColor: isDarkMode ? "#2E8B57" : "#2E8B57",
    borderColor: isDarkMode ? "#2E8B57" : "#2E8B57",
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  categoryButtonTextActive: {
    color: '#ffffff',
  },
  selectedCategory: {
    marginTop: 12,
    padding: 12,
    backgroundColor: isDarkMode ? "#1e293b" : "#f0f9ff",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: isDarkMode ? "#2E8B57" : "#2E8B57",
  },
  selectedCategoryText: {
    fontSize: 14,
    color: isDarkMode ? "#cbd5e1" : "#1e40af",
    fontWeight: '500',
  },
  selectedCategoryName: {
    fontWeight: 'bold',
    color: isDarkMode ? "#2E8B57" : "#2E8B57",
  },
  actionsContainer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 24,
  },
  cancelBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: isDarkMode ? "#374151" : "#e2e8f0",
    borderWidth: 1,
    borderColor: isDarkMode ? "#4b5563" : "#cbd5e1",
  },
  cancelBtnText: {
    color: isDarkMode ? "#d1d5db" : "#475569",
    fontSize: 16,
    fontWeight: "600",
  },
  saveBtn: {
    flex: 2,
    backgroundColor: isDarkMode ? "#2E8B57" : "#2E8B57",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkMode ? 0.3 : 0.2,
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
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  helpContainer: {
    backgroundColor: isDarkMode ? "#1e293b" : "#e0f2fe",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: isDarkMode ? "#2E8B57" : "#2E8B57",
  },
  helpText: {
    color: isDarkMode ? "#cbd5e1" : "#1e40af",
    fontSize: 14,
    lineHeight: 20,
  },
  helpBold: {
    fontWeight: "600",
  },
});