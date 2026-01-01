import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View
} from "react-native";

import { createProduct, getCategories } from "../api";
import { useAppContext } from "../context/appContext";

export default function AddProductScreen() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const { refreshProducts } = useAppContext();
  const router = useRouter();

  // Common unit options
  const unitOptions = ['kg', 'g', 'L', 'mL', 'box', 'piece', 'pack', 'bottle', 'can', 'bag'];

  // Default categories as fallback
  const defaultCategories = [
    'Vegetables', 'Fruits', 'Meat', 'Seafood', 'Dairy', 'Herbs & Spices',
    'Grains & Pasta', 'Oils & Vinegars', 'Canned Goods', 'Bakery', 'Beverages',
    'Cleaning Supplies', 'Paper Goods', 'Utensils', 'Equipment', 'Frozen Foods',
    'Condiments', 'Spices', 'Baking Supplies', 'Fresh Herbs'
  ];

  // Load categories from backend
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await getCategories();
      
      console.log('📂 Categories API response:', response);
      
      // Handle different response structures
      let categoriesData = [];
      
      if (Array.isArray(response)) {
        // If response is directly an array
        categoriesData = response;
      } else if (response && Array.isArray(response.data)) {
        // If response has data property that's an array
        categoriesData = response.data;
      } else {
        console.warn('Unexpected categories response format:', response);
        categoriesData = [];
      }
      
      // Extract category names from the categories data
      const categoryNames = categoriesData.map((category: any) => category.name);
      console.log('📂 Extracted category names:', categoryNames);
      
      setCategories(categoryNames);
      
    } catch (error) {
      console.error('Error loading categories:', error);
      // Fallback to default categories if API fails
      console.log('🔄 Using default categories as fallback');
      setCategories(defaultCategories);
    } finally {
      setCategoriesLoading(false);
    }
  };

  // Toggle category selection
  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(category)) {
        return prev.filter(cat => cat !== category);
      } else {
        return [...prev, category];
      }
    });
  };

  // ✅ Improved: Add custom category with better validation
  const addCustomCategory = () => {
    const trimmedCategory = customCategory.trim();
    
    if (!trimmedCategory) {
      Alert.alert("Error", "Please enter a category name");
      return;
    }
    
    if (trimmedCategory.length < 2) {
      Alert.alert("Error", "Category name must be at least 2 characters long");
      return;
    }
    
    if (selectedCategories.includes(trimmedCategory)) {
      Alert.alert("Duplicate", "This category is already selected");
      return;
    }

    // Check if it exists in backend categories
    if (categories.includes(trimmedCategory)) {
      Alert.alert(
        "Category Exists", 
        `"${trimmedCategory}" is already in the category list. Please select it from the list above.`,
        [{ text: "OK" }]
      );
      return;
    }

    // Add the custom category to selection (but not to backend categories list)
    setSelectedCategories(prev => [...prev, trimmedCategory]);
    setCustomCategory("");
  };

  // Remove category
  const removeCategory = (categoryToRemove: string) => {
    setSelectedCategories(prev => prev.filter(cat => cat !== categoryToRemove));
  };

  // Clear all categories
  const clearAllCategories = () => {
    setSelectedCategories([]);
  };

  // Select single category (exclusive selection)
  const selectSingleCategory = (category: string) => {
    setSelectedCategories([category]);
  };

  // Handle Enter key press in custom category input
  const handleCustomCategorySubmit = () => {
    addCustomCategory();
  };

  // ✅ Add product to backend
  const handleAdd = async () => {
    if (!name.trim() || !quantity || !unit.trim() || selectedCategories.length === 0) {
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
        categories: selectedCategories, // Array of categories
        primaryCategory: selectedCategories[0], // First selected as primary
        description: description.trim() || "",
      };

      console.log('🔄 Adding product:', productData);
      const response = await createProduct(productData);
      
      Alert.alert("✅ Success", "Product added successfully!", [
        { 
          text: "OK", 

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
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Product</Text>
        <Text style={styles.headerSubtitle}>
          Fill in the product details below
        </Text>
      </View>
      <ScrollView>

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
          Categories <Text style={styles.required}>*</Text>
        </Text>
        <Text style={styles.helperText}>
          Select all relevant categories for this product
        </Text>
        
        {/* Loading State */}
        {categoriesLoading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading categories...</Text>
          </View>
        )}
        
        {/* Selection Controls */}
        <View style={styles.selectionControls}>
          <Text style={styles.selectionLabel}>
            {selectedCategories.length} category{selectedCategories.length !== 1 ? 'ies' : ''} selected
          </Text>
          {selectedCategories.length > 0 && (
            <TouchableOpacity onPress={clearAllCategories}>
              <Text style={styles.clearAllText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Category Grid */}
        {!categoriesLoading && categories.length > 0 && (
          <View style={styles.categoriesGrid}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryChip,
                  selectedCategories.includes(category) && styles.categoryChipSelected
                ]}
                onPress={() => toggleCategory(category)}
                onLongPress={() => selectSingleCategory(category)}
                delayLongPress={500}
              >
                <Text style={[
                  styles.categoryChipText,
                  selectedCategories.includes(category) && styles.categoryChipTextSelected
                ]}>
                  {category}
                </Text>
                {selectedCategories.includes(category) && (
                  <Text style={styles.categoryCheckmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* No Categories Message */}
        {!categoriesLoading && categories.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No categories available</Text>
            <Text style={styles.emptySubtext}>
              Create some categories first or use custom categories below
            </Text>
          </View>
        )}

        {/* ✅ IMPROVED: Custom Category Input */}
        <View style={styles.customCategoryContainer}>
          <Text style={styles.label}>Add Custom Category</Text>
          <Text style={styles.helperText}>
            Create a new category for this product (will be saved only for this product)
          </Text>
          <View style={styles.customCategoryRow}>
            <TextInput
              style={[styles.input, styles.customCategoryInput]}
              placeholder="Enter custom category name"
              placeholderTextColor={isDarkMode ? "#94a3b8" : "#64748b"}
              value={customCategory}
              onChangeText={setCustomCategory}
              onSubmitEditing={handleCustomCategorySubmit}
              returnKeyType="done"
            />
            <TouchableOpacity 
              style={[
                styles.addCustomButton,
                (!customCategory.trim() || selectedCategories.includes(customCategory.trim()) || categories.includes(customCategory.trim())) && 
                styles.addCustomButtonDisabled
              ]}
              onPress={addCustomCategory}
              disabled={!customCategory.trim() || selectedCategories.includes(customCategory.trim()) || categories.includes(customCategory.trim())}
            >
              <Text style={styles.addCustomButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
          {customCategory.trim() && categories.includes(customCategory.trim()) && (
            <Text style={styles.warningText}>
              ⚠️ This category already exists in the list above
            </Text>
          )}
        </View>

        {/* Selected Categories Display */}
        {selectedCategories.length > 0 && (
          <View style={styles.selectedCategoriesContainer}>
            <Text style={styles.selectedCategoriesTitle}>Selected Categories:</Text>
            <View style={styles.selectedCategoriesList}>
              {selectedCategories.map((category, index) => (
                <View key={category} style={styles.selectedCategoryTag}>
                  <Text style={styles.selectedCategoryText}>
                    {index === 0 && "🏠 "}{category}
                    {!categories.includes(category) && " (custom)"}
                  </Text>
                  <TouchableOpacity 
                    style={styles.removeCategoryButton}
                    onPress={() => removeCategory(category)}
                  >
                    <Text style={styles.removeCategoryText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            <Text style={styles.primaryCategoryNote}>
              🏠 First category is primary • Custom categories are marked
            </Text>
          </View>
        )}

        {/* Interaction Help */}
        <View style={styles.helpTip}>
          <Text style={styles.helpTipText}>
            💡 <Text style={styles.helpBold}>Tap</Text> to select/deselect •{" "}
            <Text style={styles.helpBold}>Long press</Text> to select only this category
          </Text>
        </View>
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
          style={[styles.saveBtn, (loading || selectedCategories.length === 0) && styles.saveBtnDisabled]} 
          onPress={handleAdd}
          disabled={loading || selectedCategories.length === 0}
        >
          <Text style={styles.saveBtnText}>
            {loading ? "Adding..." : "Add Product"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Help Text */}
      <View style={styles.helpContainer}>
        <Text style={styles.helpText}>
          💡 <Text style={styles.helpBold}>Using Categories:</Text> 
          {"\n"}• Products will be organized by categories
          {"\n"}• Easy filtering and searching by category
          {"\n"}• Consistent classification across all products
          {"\n"}• Custom categories are saved only for this product
        </Text>
      </View>
      </ScrollView>
    </View>
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
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
  },
  loadingText: {
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontSize: 14,
    fontStyle: 'italic',
  },
  selectionControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  selectionLabel: {
    fontSize: 14,
    color: isDarkMode ? "#cbd5e1" : "#475569",
    fontWeight: '500',
  },
  clearAllText: {
    fontSize: 14,
    color: isDarkMode ? "#ef4444" : "#dc2626",
    fontWeight: '500',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: isDarkMode ? "#334155" : "#f1f5f9",
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#e2e8f0",
    minWidth: 100,
  },
  categoryChipSelected: {
    backgroundColor: isDarkMode ? "#2E8B57" : "#2E8B57",
    borderColor: isDarkMode ? "#2E8B57" : "#2E8B57",
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? "#94a3b8" : "#64748b",
    marginRight: 4,
  },
  categoryChipTextSelected: {
    color: '#ffffff',
  },
  categoryCheckmark: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  customCategoryContainer: {
    marginBottom: 16,
  },
  customCategoryRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  customCategoryInput: {
    flex: 1,
  },
  addCustomButton: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: isDarkMode ? "#2563eb" : "#2563eb",
    borderRadius: 12,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCustomButtonDisabled: {
    backgroundColor: isDarkMode ? "#374151" : "#9ca3af",
    opacity: 0.6,
  },
  addCustomButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  selectedCategoriesContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: isDarkMode ? "#1e293b" : "#f0f9ff",
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: isDarkMode ? "#2E8B57" : "#2E8B57",
  },
  selectedCategoriesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? "#cbd5e1" : "#1e40af",
    marginBottom: 8,
  },
  selectedCategoriesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  selectedCategoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? "#2E8B57" : "#2E8B57",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  selectedCategoryText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  removeCategoryButton: {
    padding: 2,
  },
  removeCategoryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  primaryCategoryNote: {
    fontSize: 11,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontStyle: 'italic',
  },
  warningText: {
    fontSize: 12,
    color: isDarkMode ? "#fca5a5" : "#dc2626",
    marginTop: 4,
    fontStyle: 'italic',
  },
   emptyState: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: isDarkMode ? "#1e293b" : "#f8fafc",
    borderRadius: 12,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? "#cbd5e1" : "#475569",
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    textAlign: 'center',
  },
  helpTip: {
    marginTop: 8,
    padding: 8,
    backgroundColor: isDarkMode ? "#1e293b" : "#fffbeb",
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: isDarkMode ? "#f59e0b" : "#f59e0b",
  },
  helpTipText: {
    fontSize: 12,
    color: isDarkMode ? "#cbd5e1" : "#92400e",
    lineHeight: 16,
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
    backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 1,
  },
});