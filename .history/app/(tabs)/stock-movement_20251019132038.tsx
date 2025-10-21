import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    Alert,
    FlatList,
    ListRenderItem,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getProducts } from "../api";
import { Product } from "../types/model";

export default function ProductsScreen() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [stockFilter, setStockFilter] = useState<string>("All");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>(["All"]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [showFilters, setShowFilters] = useState(true);

  // Stock status filters
  const stockFilters = ["All", "In Stock", "Low Stock", "Out of Stock"];

  // Common category options with colors
  const commonCategories = [
    "All", "Vegetables", "Fruits", "Meat", "Seafood", "Dairy", "Herbs & Spices",
    "Grains & Pasta", "Oils & Vinegars", "Canned Goods", "Bakery", "Beverages",
    "Cleaning Supplies", "Paper Goods", "Utensils", "Equipment", "Frozen Foods",
    "Condiments", "Spices", "Baking Supplies", "Fresh Herbs", "Other"
  ];

  // Category colors - same as in CreateCategoryScreen
  const categoryColors: {[key: string]: string} = {
    'Vegetables': '#22c55e',
    'Fruits': '#f59e0b',
    'Meat': '#dc2626',
    'Seafood': '#0ea5e9',
    'Dairy': '#fbbf24',
    'Herbs & Spices': '#10b981',
    'Grains & Pasta': '#d97706',
    'Oils & Vinegars': '#f97316',
    'Canned Goods': '#6b7280',
    'Bakery': '#d4a574',
    'Beverages': '#3b82f6',
    'Cleaning Supplies': '#6366f1',
    'Paper Goods': '#8b5cf6',
    'Utensils': '#a855f7',
    'Equipment': '#ec4899',
    'Frozen Foods': '#06b6d4',
    'Condiments': '#ef4444',
    'Spices': '#f43f5e',
    'Baking Supplies': '#f472b6',
    'Fresh Herbs': '#84cc16',
    'Other': '#6b7280'
  };

  // Color palette for custom categories
  const customCategoryColors = [
    '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#10b981',
    '#3b82f6', '#f97316', '#84cc16', '#ec4899', '#6366f1',
    '#d4a574', '#a855f7', '#f43f5e', '#22c55e', '#0ea5e9'
  ];

  // Helper function to check if a product has any valid category
const hasValidCategory = (product: Product): boolean => {
  // Check categories array
  if (product.categories && Array.isArray(product.categories)) {
    const hasValidCategories = product.categories.some(cat => 
      cat && typeof cat === 'string' && cat.trim() !== ''
    );
    if (hasValidCategories) return true;
  }
  
  // Check single category field
  if (product.category && typeof product.category === 'string' && product.category.trim() !== '') {
    return true;
  }
  
  // Check primary category field
  if (product.primaryCategory && typeof product.primaryCategory === 'string' && product.primaryCategory.trim() !== '') {
    return true;
  }
  
  return false;
};
  // Extract unique categories from products - FIXED VERSION
  const extractCategoriesFromProducts = (products: Product[]) => {
    const allCategories = new Set<string>();
    
    products.forEach(product => {
      let productCategories: string[] = [];

      // Handle all possible category fields and normalize
      if (product.categories && Array.isArray(product.categories) && product.categories.length > 0) {
        productCategories = product.categories.filter(cat => cat && cat.trim() !== '');
      } else if (product.category && product.category.trim() !== '') {
        productCategories = [product.category];
      } else if (product.primaryCategory && product.primaryCategory.trim() !== '') {
        productCategories = [product.primaryCategory];
      } else {
        // If no categories found, mark as "Other"
        productCategories = ["Other"];
      }

      // Add all valid categories to the set
      productCategories.forEach(cat => {
        if (cat && cat.trim() !== '') {
          allCategories.add(cat.trim());
        }
      });
    });

    // Always include "All" and "Other" categories
    const baseCategories = ["All"];
    const sortedCategories = Array.from(allCategories)
      .filter(cat => cat !== "Other") // Remove "Other" from sorted list to add it at the end
      .sort();

    // Add "Other" at the end if we have any products categorized as "Other"
    const finalCategories = [...baseCategories, ...sortedCategories];
    if (allCategories.has("Other") || products.some(p => !hasValidCategory(p))) {
      finalCategories.push("Other");
    }

    return finalCategories.length > 1 ? finalCategories : [...commonCategories];
  };

  // Add this function to debug category issues
  const logCategoryDebugInfo = (products: Product[]) => {
    console.log('🔍 Category Debug Info:');
    products.forEach((product, index) => {
      console.log(`Product ${index + 1}: ${product.name}`);
      console.log(`  - categories:`, product.categories);
      console.log(`  - category:`, product.category);
      console.log(`  - primaryCategory:`, product.primaryCategory);
      console.log(`  - Has valid category:`, hasValidCategory(product));
    });
    
    const uncategorizedProducts = products.filter(p => !hasValidCategory(p));
    if (uncategorizedProducts.length > 0) {
      console.log(`🚨 ${uncategorizedProducts.length} products without valid categories:`);
      uncategorizedProducts.forEach(p => console.log(`   - ${p.name}`));
    }
  };

  // Get color for a category
  const getCategoryColor = (categoryName: string) => {
    if (categoryColors[categoryName]) {
      return categoryColors[categoryName];
    } else {
      // Generate consistent color based on category name for custom categories
      const index = categoryName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return customCategoryColors[index % customCategoryColors.length];
    }
  };

  // Filter products based on search, category, and stock status
  const filteredProducts = products.filter(product => {
    // Safely handle potentially undefined fields
    const productCategories = product.categories || [product.category || "Other"];
    const productName = product.name || "";
    const quantity = product.quantity  || 0;
    
    // Search filter
    const matchesSearch = productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         productCategories.some(cat => 
                           cat.toLowerCase().includes(searchQuery.toLowerCase())
                         );
    
    // Category filter
    const matchesCategory = selectedCategory === "All" || 
                           productCategories.includes(selectedCategory);
    
    // Stock status filter
    let matchesStock = true;
    switch (stockFilter) {
      case "In Stock":
        matchesStock = quantity > 10;
        break;
      case "Low Stock":
        matchesStock = quantity > 0 && quantity <= 10;
        break;
      case "Out of Stock":
        matchesStock = quantity === 0;
        break;
      default:
        matchesStock = true;
    }
    
    return matchesSearch && matchesCategory && matchesStock;
  });

  const formatLastUsed = (lastUsed?: string) => {
    if (!lastUsed) return "Never used";
    
    try {
      const lastUsedDate = new Date(lastUsed);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - lastUsedDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return "Today";
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
      return `${Math.ceil(diffDays / 30)} months ago`;
    } catch (error) {
      return "Never used";
    }
  };

  const fetchProducts = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const res = await getProducts();
      console.log('📦 Products loaded:', res.data);
      
      // Normalize the data to handle inconsistent field names - FIXED VERSION
      const normalizedProducts = (res.data || []).map((product: any) => {
        // Handle price field - use price (from Firestore)
        const price = product.price || product.unitPrice || 0;
        
        // Handle quantity field - check for q, quantity, or stock
        const quantity = product.q || product.quantity || product.stock || 0;
        
        // Handle categories - ensure we have an array with at least one valid category
        let categories = product.categories;
        if (!categories && product.category) {
          categories = [product.category];
        }
        if (!categories || !Array.isArray(categories) || categories.length === 0) {
          categories = ["Other"];
        }
        
        // Filter out empty categories and ensure we have at least one
        categories = categories.filter((cat: string) => cat && cat.trim() !== '');
        if (categories.length === 0) {
          categories = ["Other"];
        }
        
        // Handle last used date
        const lastUsed = product.lastUsed || product.lastUsedDate || null;
        
        return {
          ...product,
          unitPrice: price,
          quantity: quantity,
          categories: categories,
          primaryCategory: product.primaryCategory || categories[0],
          lastUsed: lastUsed,
        };
      });
      
      console.log('🔄 Normalized products:', normalizedProducts);
      logCategoryDebugInfo(normalizedProducts); // Debug logging
      setProducts(normalizedProducts);
      
      // Extract categories from products
      const extractedCategories = extractCategoriesFromProducts(normalizedProducts);
      console.log('📊 Extracted categories:', extractedCategories);
      setCategories(extractedCategories.length > 1 ? extractedCategories : commonCategories);
      
      setInitialLoad(false);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to load products");
      setProducts([]);
      setCategories(commonCategories);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      console.log('🔄 ProductsScreen focused - refreshing data...');
      if (!initialLoad) {
        setRefreshing(true);
        fetchProducts(true);
      }
    }, [initialLoad])
  );

  useEffect(() => {
    console.log('🚀 ProductsScreen mounted - initial load');
    fetchProducts();
  }, []);

  const onRefresh = () => {
    console.log('🔄 Manual refresh triggered');
    setRefreshing(true);
    fetchProducts(true);
  };

  const handleAddProduct = () => {
    router.push("/details/add-product");
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedCategory("All");
    setStockFilter("All");
  };

  const styles = getStyles(isDarkMode);

  const renderCategoryChip = (category: string) => {
    const categoryColor = category === "All" ? (isDarkMode ? "#2E8B57" : "#2E8B57") : getCategoryColor(category);
    
    return (
      <TouchableOpacity
        key={category}
        style={[
          styles.categoryChip,
          selectedCategory === category && styles.categoryChipSelected,
          selectedCategory === category && { backgroundColor: categoryColor, borderColor: categoryColor }
        ]}
        onPress={() => setSelectedCategory(category)}
      >
        <Text style={[
          styles.categoryChipText,
          selectedCategory === category && styles.categoryChipTextSelected
        ]}>
          {category}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderStockFilterChip = (filter: string) => (
    <TouchableOpacity
      key={filter}
      style={[
        styles.stockFilterChip,
        stockFilter === filter && styles.stockFilterChipSelected
      ]}
      onPress={() => setStockFilter(filter)}
    >
      <Text style={[
        styles.stockFilterChipText,
        stockFilter === filter && styles.stockFilterChipTextSelected
      ]}>
        {filter}
      </Text>
    </TouchableOpacity>
  );

  const renderProductItem: ListRenderItem<Product> = ({ item }) => {
    const displayQuantity = item.quantity || 0;
    const isOutOfStock = displayQuantity === 0;
    const isLowStock = displayQuantity > 0 && displayQuantity <= 10;
    const productCategories = item.categories || [item.category || "Other"];
    const primaryCategory = item.primaryCategory || productCategories[0];
    const lastUsedText = formatLastUsed(item.lastUsed);
    const categoryColor = getCategoryColor(primaryCategory);

    return (
      <TouchableOpacity
        style={[
          styles.productItem,
          isOutOfStock && styles.outOfStockCard,
          isLowStock && styles.lowStockCard,
        ]}
        onPress={() =>
          router.push({
            pathname: "/details/product",
            params: { 
              id: item.id, 
              name: item.name, 
              quantity: displayQuantity.toString(),
              unit: item.unit || "units",
              category: item.category || "Other",
              categories: JSON.stringify(productCategories),
              primaryCategory: primaryCategory,
              description: item.description || "",
              lastUsed: item.lastUsed || "",
              totalUsed: item.totalUsed?.toString() || "0",
            },
          })
        }
        activeOpacity={0.7}
      >
        {/* Category Icon Container with Color */}
        <View style={[
          styles.categoryIconContainer,
          { backgroundColor: categoryColor }
        ]}>
          <Text style={styles.categoryIcon}>
            {getCategoryIcon(primaryCategory)}
          </Text>
          {isOutOfStock && (
            <View style={styles.outOfStockOverlay}>
              <Text style={styles.outOfStockText}>Out</Text>
            </View>
          )}
          {isLowStock && !isOutOfStock && (
            <View style={styles.lowStockBadge}>
              <Text style={styles.lowStockBadgeText}>LOW</Text>
            </View>
          )}
        </View>
        
        <View style={styles.productInfo}>
          <View style={styles.productHeader}>
            <Text style={styles.productName}>{item.name || "Unnamed Product"}</Text>
          </View>
          
          <View style={styles.categoriesContainer}>
            {productCategories.slice(0, 2).map((cat, index) => {
              const tagColor = getCategoryColor(cat);
              return (
                <View key={cat} style={[
                  styles.categoryTag,
                  index === 0 && styles.primaryCategoryTag,
                  { backgroundColor: tagColor }
                ]}>
                  <Text style={styles.categoryTagText}>
                    {index === 0 && "🏠 "}{cat}
                  </Text>
                </View>
              );
            })}
            {productCategories.length > 2 && (
              <View style={styles.moreCategoriesTag}>
                <Text style={styles.moreCategoriesText}>
                  +{productCategories.length - 2}
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.stockContainer}>
            <Text
              style={[
                styles.stockStatus,
                { color: isOutOfStock ? '#F44336' : isLowStock ? '#FF9800' : '#4CAF50' }
              ]}
            >
              {isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'In Stock'}
            </Text>
            <Text style={styles.quantityText}>
              Qty: {displayQuantity} {item.unit || "units"}
            </Text>
          </View>
          
          <View style={styles.lastUsedContainer}>
            <Text style={styles.lastUsedLabel}>Last Used:</Text>
            <Text style={styles.lastUsedText}>{lastUsedText}</Text>
          </View>
        </View>
        
        <View style={styles.arrowContainer}>
          <Text style={styles.arrow}>›</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Get category icon emoji
  const getCategoryIcon = (category: string) => {
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
    
    return iconMap[category] || '📦';
  };

  if (loading && initialLoad) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>
            Loading kitchen inventory...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Kitchen Inventory</Text>
        <Text style={styles.headerSubtitle}>Organized by categories</Text>
        
        {/* Add Product Button */}
        <TouchableOpacity style={styles.filterToggleButton} onPress={handleAddProduct}>
          <Text style={styles.filterToggleText}>
            + Add Product
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar - Conditionally Rendered */}
      {showFilters && (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor={isDarkMode ? "#94a3b8" : "#64748b"}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>
      )}

      {/* Category Filter - Conditionally Rendered */}
      {showFilters && (
        <View style={styles.filterSection}>
          <Text style={styles.filterSectionTitle}>Categories</Text>
          <FlatList
            data={categories}
            renderItem={({ item }) => renderCategoryChip(item)}
            keyExtractor={(item) => item}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterList}
          />
        </View>
      )}

      {/* Stock Status Filter - Conditionally Rendered */}
      {showFilters && (
        <View style={styles.filterSection}>
          <Text style={styles.filterSectionTitle}>Stock Status</Text>
          <FlatList
            data={stockFilters}
            renderItem={({ item }) => renderStockFilterChip(item)}
            keyExtractor={(item) => item}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterList}
          />
        </View>
      )}

      {/* Results Count */}
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsText}>
          {filteredProducts.length} item{filteredProducts.length !== 1 ? 's' : ''} found
          {selectedCategory !== 'All' ? ` in ${selectedCategory}` : ''}
          {stockFilter !== 'All' ? ` • ${stockFilter}` : ''}
          {searchQuery ? ` for "${searchQuery}"` : ''}
        </Text>
        <TouchableOpacity style={styles.filterToggleButtonHi} onPress={toggleFilters}>
          <Text style={styles.filterToggleText}>
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Text>
        </TouchableOpacity>
        
        {/* Clear Filters Button - Only show when filters are active */}
        {(searchQuery || selectedCategory !== "All" || stockFilter !== "All") && (
          <TouchableOpacity style={styles.clearFiltersSmallButton} onPress={clearAllFilters}>
            <Text style={styles.clearFiltersSmallText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Products List */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        renderItem={renderProductItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[isDarkMode ? "#2E8B57" : "#2E8B57"]}
            tintColor={isDarkMode ? "#2E8B57" : "#2E8B57"}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          !showFilters && styles.listContentExpanded
        ]}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {searchQuery || selectedCategory !== "All" || stockFilter !== "All" 
                ? "No items match your filters" 
                : "No products found"}
            </Text>
            <Text style={styles.emptySubtext}>
              {!searchQuery && selectedCategory === "All" && stockFilter === "All" 
                ? "Create your first product to get started"
                : "Try adjusting your search or filters"}
            </Text>
            {(searchQuery || selectedCategory !== "All" || stockFilter !== "All") && (
              <TouchableOpacity 
                style={styles.clearFiltersButton}
                onPress={clearAllFilters}
              >
                <Text style={styles.clearFiltersButtonText}>Clear All Filters</Text>
              </TouchableOpacity>
            )}
            {!searchQuery && selectedCategory === "All" && stockFilter === "All" && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.primaryButton, styles.emptyButton]}
                onPress={handleAddProduct}
              >
                <Text style={styles.actionButtonText}>Create First Product</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const getStyles = (isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDarkMode ? "#0f172a" : "#f8fafc",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: isDarkMode ? "#0f172a" : "#f8fafc",
  },
  loadingText: {
    fontSize: 16,
    color: isDarkMode ? "#cbd5e1" : "#64748b",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "#334155" : "#e2e8f0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    marginBottom: 12,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "#334155" : "#e2e8f0",
  },
  searchInput: {
    backgroundColor: isDarkMode ? "#334155" : "#f1f5f9",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 16,
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#cbd5e1",
  },
  filterSection: {
    paddingVertical: 12,
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "#334155" : "#e2e8f0",
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  filterList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#cbd5e1",
    backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
  },
  categoryChipSelected: {
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: "500",
    color: isDarkMode ? "#cbd5e1" : "#475569",
  },
  categoryChipTextSelected: {
    color: "#ffffff",
    fontWeight: "600",
  },
  stockFilterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#cbd5e1",
    backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
  },
  stockFilterChipSelected: {
    backgroundColor: isDarkMode ? "#2E8B57" : "#2E8B57",
    borderColor: isDarkMode ? "#2E8B57" : "#2E8B57",
  },
  stockFilterChipText: {
    fontSize: 14,
    fontWeight: "500",
    color: isDarkMode ? "#cbd5e1" : "#475569",
  },
  stockFilterChipTextSelected: {
    color: "#ffffff",
    fontWeight: "600",
  },
  resultsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "#334155" : "#e2e8f0",
  },
  resultsText: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    flex: 1,
  },
  filterToggleButton: {
    backgroundColor: isDarkMode ? "#2E8B57" : "#2E8B57",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  filterToggleButtonHi: {
    backgroundColor: isDarkMode ? "#374151" : "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  filterToggleText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  clearFiltersSmallButton: {
    backgroundColor: isDarkMode ? "#dc2626" : "#ef4444",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  clearFiltersSmallText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  listContentExpanded: {
    paddingTop: 8,
  },
  productItem: {
    flexDirection: "row",
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? "#334155" : "#e2e8f0",
    shadowColor: isDarkMode ? "#000" : "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  outOfStockCard: {
    opacity: 0.7,
    borderColor: isDarkMode ? "#dc2626" : "#fecaca",
    backgroundColor: isDarkMode ? "#1e293b" : "#fef2f2",
  },
  lowStockCard: {
    borderColor: isDarkMode ? "#d97706" : "#fed7aa",
    backgroundColor: isDarkMode ? "#1e293b" : "#fffbeb",
  },
  categoryIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    position: "relative",
  },
  categoryIcon: {
    fontSize: 20,
  },
  outOfStockOverlay: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#dc2626",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  outOfStockText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "bold",
  },
  lowStockBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#d97706",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  lowStockBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "bold",
  },
  productInfo: {
    flex: 1,
  },
  productHeader: {
    marginBottom: 8,
  },
  productName: {
    fontSize: 18,
    fontWeight: "600",
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
  },
  categoriesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  primaryCategoryTag: {
    // No additional styles needed
  },
  categoryTagText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#ffffff",
  },
  moreCategoriesTag: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: isDarkMode ? "#475569" : "#cbd5e1",
  },
  moreCategoriesText: {
    fontSize: 12,
    fontWeight: "500",
    color: isDarkMode ? "#cbd5e1" : "#475569",
  },
  stockContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  stockStatus: {
    fontSize: 14,
    fontWeight: "500",
  },
  quantityText: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  lastUsedContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  lastUsedLabel: {
    fontSize: 12,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    marginRight: 4,
  },
  lastUsedText: {
    fontSize: 12,
    color: isDarkMode ? "#cbd5e1" : "#475569",
    fontWeight: "500",
  },
  arrowContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 8,
  },
  arrow: {
    fontSize: 20,
    color: isDarkMode ? "#64748b" : "#94a3b8",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    textAlign: "center",
    marginBottom: 24,
  },
  clearFiltersButton: {
    backgroundColor: isDarkMode ? "#2E8B57" : "#2E8B57",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  clearFiltersButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  primaryButton: {
    backgroundColor: isDarkMode ? "#2E8B57" : "#2E8B57",
  },
  emptyButton: {
    marginTop: 8,
  },
  actionButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});