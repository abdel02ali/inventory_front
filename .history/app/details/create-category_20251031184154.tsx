import { Stack, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { createCategory, deleteCategory, getCategories } from "../api";
import { useAppContext } from "../context/appContext";

interface Category {
  id: string;
  name: string;
  type: 'predefined' | 'custom';
  createdAt?: string;
  productCount?: number;
}

export default function CreateCategoryScreen() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  
  const [categoryName, setCategoryName] = useState("");
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customCategories, setCustomCategories] = useState<Category[]>([]);
  const [predefinedCategories, setPredefinedCategories] = useState<Category[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  
  const { refreshProducts } = useAppContext();
  const router = useRouter();

  // Color palette for all categories
  const categoryColors = [
    '#22c55e', '#f59e0b', '#dc2626', '#0ea5e9', '#fbbf24',
    '#10b981', '#d97706', '#f97316', '#6b7280', '#d4a574',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899',
    '#06b6d4', '#ef4444', '#f43f5e', '#f472b6', '#84cc16',
    '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#10b981'
  ];

  // Get color for a category
  const getCategoryColor = (categoryName: string) => {
    // Generate consistent color based on category name
    const index = categoryName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return categoryColors[index % categoryColors.length];
  };

  // Get category icon
  const getCategoryIcon = (categoryName: string) => {
    const iconMap: {[key: string]: string} = {
      'Vegetables': '🥦',
      'Fruits': '🍎',
      'Meat': '🥩',
      'Seafood': '🐟',
      'Dairy': '🥛',
      'Herbs & Spices': '🌿',
      'Grains & Pasta': '🍚',
      'Oils & Vinegars': '🫒',
      'Canned Goods': '🥫',
      'Bakery': '🍞',
      'Beverages': '🥤',
      'Cleaning Supplies': '🧽',
      'Paper Goods': '🧻',
      'Utensils': '🍴',
      'Equipment': '🔪',
      'Frozen Foods': '🧊',
      'Condiments': '🧂',
      'Spices': '🌶️',
      'Baking Supplies': '🧁',
      'Fresh Herbs': '🌱',
      'Other': '📦',
    };
    
    return iconMap[categoryName] || '📦';
  };

  // Load categories from backend
  const loadCategories = async () => {
    try {
      setRefreshing(true);
      const categoriesData: Category[] = await getCategories();
      
      // Separate predefined and custom categories
      const predefined = categoriesData.filter(cat => cat.type === 'predefined');
      const custom = categoriesData.filter(cat => cat.type === 'custom');
      
      setPredefinedCategories(predefined);
      setCustomCategories(custom);
      setCategories(categoriesData);
      
    } catch (error) {
      console.error('Error loading categories:', error);
      Alert.alert("Error", "Failed to load categories");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  // Create new category
  const handleCreateCategory = async () => {
    const trimmedName = categoryName.trim();
    
    if (!trimmedName) {
      Alert.alert("Error", "Please enter a category name");
      return;
    }
    
    if (trimmedName.length < 2) {
      Alert.alert("Error", "Category name must be at least 2 characters long");
      return;
    }

    // Check if category already exists (case insensitive)
    const existingCategory = categories.find(
      cat => cat.name.toLowerCase() === trimmedName.toLowerCase()
    );
    
    if (existingCategory) {
      Alert.alert(
        "Category Exists", 
        `The category "${trimmedName}" already exists.`,
        [{ text: "OK" }]
      );
      return;
    }

    setLoading(true);
    try {
      const newCategory = await createCategory({
        name: trimmedName,
        type: 'custom'
      });

      // Reload categories to get the updated list
      await loadCategories();
      
      setCategoryName("");
      
      Alert.alert(
        "✅ Success", 
        `Category "${trimmedName}" created successfully! It will be available on all your devices.`,
        [
          { 
            text: "OK", 
            onPress: () => {
              refreshProducts();
            }
          }
        ]
      );
      
    } catch (error: any) {
      console.error('Error creating category:', error);
      
      switch (error.message) {
        case 'DUPLICATE_CATEGORY':
          Alert.alert(
            "⚠️ Category Exists", 
            `The category "${trimmedName}" already exists.`,
            [{ text: "OK" }]
          );
          break;
          
        case 'VALIDATION_ERROR':
          Alert.alert(
            "📝 Invalid Data", 
            "Please check the category name is valid.",
            [{ text: "OK" }]
          );
          break;
          
        default:
          Alert.alert(
            "❌ Error", 
            "Unable to create category. Please try again later.",
            [{ text: "OK" }]
          );
      }
    } finally {
      setLoading(false);
    }
  };

  // Delete custom category
  const handleDeleteCategory = async (category: Category) => {
    if (category.type === 'predefined') {
      Alert.alert(
        "Cannot Delete", 
        "Predefined categories cannot be deleted.",
        [{ text: "OK" }]
      );
      return;
    }

    Alert.alert(
      "Delete Category",
      `Are you sure you want to delete "${category.name}"? This will remove it from all devices and products using this category will be moved to "Other".`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              // ✅ FIX: Use category.id instead of category._id
              await deleteCategory(category.id);
              
              // Reload categories
              await loadCategories();
              refreshProducts();
              
              Alert.alert("✅ Success", "Category deleted from all devices");
            } catch (error) {
              console.error('Error deleting category:', error);
              Alert.alert("Error", "Failed to delete category");
            }
          }
        }
      ]
    );
  };
  const handleSubmit = () => {
    handleCreateCategory();
  };

  const styles = getStyles(isDarkMode);

  const renderCategoryItem = ({ item }: { item: Category }) => {
    const categoryColor = getCategoryColor(item.name);
    
    return (
      <View style={[
        styles.categoryItem,
        item.type === 'predefined' && styles.predefinedCategoryItem
      ]}>
        <View style={styles.categoryInfo}>
          <View style={[
            styles.categoryIconContainer,
            { backgroundColor: categoryColor }
          ]}>
            <Text style={styles.categoryIcon}>
              {getCategoryIcon(item.name)}
            </Text>
          </View>
          <View style={styles.categoryDetails}>
            <Text style={styles.categoryName}>{item.name}</Text>
            <Text style={styles.categoryType}>
              {item.type === 'predefined' ? 'Predefined • Cannot be deleted' : 'Custom • Created by you'}
            </Text>
            {item.productCount !== undefined && (
              <Text style={styles.productCount}>
                Used by {item.productCount} product{item.productCount !== 1 ? 's' : ''}
              </Text>
            )}
          </View>
        </View>
        
        {item.type === 'custom' && (
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => handleDeleteCategory(item)}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ headerShown:false }} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Manage Categories</Text>
        <Text style={styles.headerSubtitle}>
          Create custom categories for your products
        </Text>
      </View>

      {/* Create Category Section */}
      <View style={styles.createSection}>
        <Text style={styles.sectionTitle}>Create New Category</Text>
        <Text style={styles.sectionDescription}>
          Custom categories will be available on all your devices
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>
            Category Name <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Enter category name (e.g., Organic Products)"
            placeholderTextColor={isDarkMode ? "#94a3b8" : "#64748b"}
            value={categoryName}
            onChangeText={setCategoryName}
            onSubmitEditing={handleSubmit}
            returnKeyType="done"
            maxLength={50}
          />
          <Text style={styles.characterCount}>
            {categoryName.length}/50 characters
          </Text>
        </View>

        <TouchableOpacity 
          style={[
            styles.createButton,
            (!categoryName.trim() || loading) && styles.createButtonDisabled
          ]}
          onPress={handleCreateCategory}
          disabled={!categoryName.trim() || loading}
        >
          <Text style={styles.createButtonText}>
            {loading ? "Creating..." : "Create Category"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Predefined Categories Section */}
      

      {/* Custom Categories Section */}
      <View style={styles.categoriesSection}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Your Custom Categories</Text>
            <Text style={styles.sectionDescription}>
              Categories you've created ({customCategories.length} total)
            </Text>
          </View>
          {(customCategories.length > 0 || refreshing) && (
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={loadCategories}
              disabled={refreshing}
            >
              <Text style={styles.refreshButtonText}>
                {refreshing ? "⟳" : "↻"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {customCategories.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📁</Text>
            <Text style={styles.emptyTitle}>No Custom Categories Yet</Text>
            <Text style={styles.emptyDescription}>
              Create your first custom category above to organize your products
            </Text>
          </View>
        ) : (
          <FlatList
            data={customCategories}
            renderItem={renderCategoryItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            refreshing={refreshing}
            onRefresh={loadCategories}
          />
        )}
      </View>

      {/* Help Section */}
      <View style={styles.helpSection}>
        <Text style={styles.helpTitle}>💡 Category Tips</Text>
        <View style={styles.tipItem}>
          <Text style={styles.tipBullet}>•</Text>
          <Text style={styles.tipText}>
            Use descriptive names that make it easy to find products
          </Text>
        </View>
        <View style={styles.tipItem}>
          <Text style={styles.tipBullet}>•</Text>
          <Text style={styles.tipText}>
            Categories are synced across all your devices
          </Text>
        </View>
        <View style={styles.tipItem}>
          <Text style={styles.tipBullet}>•</Text>
          <Text style={styles.tipText}>
            Each category has a unique color for easy identification
          </Text>
        </View>
        <View style={styles.tipItem}>
          <Text style={styles.tipBullet}>•</Text>
          <Text style={styles.tipText}>
            Deleting a category will not delete products, but will remove the category from them
          </Text>
        </View>
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
  createSection: {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkMode ? 0.1 : 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  categoriesSection: {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkMode ? 0.1 : 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    marginBottom: 16,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 20,
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
  input: {
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#cbd5e1",
    borderRadius: 12,
    padding: 16,
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    color: isDarkMode ? "#f8fafc" : "#1e293b",
    fontSize: 16,
  },
  characterCount: {
    fontSize: 12,
    color: isDarkMode ? "#64748b" : "#94a3b8",
    marginTop: 4,
    textAlign: 'right',
  },
  createButton: {
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
  createButtonDisabled: {
    backgroundColor: isDarkMode ? "#374151" : "#9ca3af",
    opacity: 0.6,
  },
  createButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#e2e8f0",
  },
  predefinedCategoryItem: {
    backgroundColor: isDarkMode ? "#1e3a8a" : "#dbeafe",
    borderColor: isDarkMode ? "#3730a3" : "#bfdbfe",
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryIcon: {
    fontSize: 18,
    color: '#ffffff',
  },
  categoryDetails: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 2,
  },
  categoryType: {
    fontSize: 12,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    marginBottom: 2,
  },
  productCount: {
    fontSize: 11,
    color: isDarkMode ? "#64748b" : "#94a3b8",
    fontStyle: 'italic',
  },
  deleteButton: {
    backgroundColor: isDarkMode ? "#dc2626" : "#ef4444",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  refreshButton: {
    backgroundColor: isDarkMode ? "#374151" : "#e2e8f0",
    padding: 8,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: isDarkMode ? "#cbd5e1" : "#475569",
    fontSize: 16,
    fontWeight: "bold",
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDarkMode ? "#cbd5e1" : "#475569",
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    textAlign: 'center',
    lineHeight: 20,
  },
  helpSection: {
    backgroundColor: isDarkMode ? "#1e293b" : "#e0f2fe",
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: isDarkMode ? "#2E8B57" : "#2E8B57",
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: isDarkMode ? "#cbd5e1" : "#1e40af",
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  tipBullet: {
    color: isDarkMode ? "#2E8B57" : "#2E8B57",
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
    marginTop: 2,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: isDarkMode ? "#cbd5e1" : "#1e40af",
    lineHeight: 20,
  },
});