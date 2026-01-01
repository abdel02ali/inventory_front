import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState, useMemo } from "react";
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
import { getCategoryColor, getCategoryIcon, COMMON_CATEGORIES } from "../../constants/categoryColors";
import { useStockMonitor } from "../../hooks/useStockMonitor";
import { getProducts } from "../api";
import { useNotifications } from "../context/NotificationContext";
import { Product } from "../types/model";

export default function ProductsScreen() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const router = useRouter();
  
  // Notification hooks
  const { scheduleLowStockAlert, scheduleOutOfStockAlert } = useNotifications();
  useStockMonitor(); // This will automatically monitor stock levels
  
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

  // Common category options with colors (using shared constants)
  const commonCategories = useMemo(() => ["All", ...COMMON_CATEGORIES], []);

  // Extract unique categories from products
  const extractCategoriesFromProducts = (products: Product[]) => {
    const allCategories = new Set<string>();
    
    products.forEach(product => {
      // Handle categories array
      if (product.categories && Array.isArray(product.categories)) {
        product.categories.forEach(cat => allCategories.add(cat));
      }
      // Handle single category
      if (product.category) {
        allCategories.add(product.category);
      }
      // Handle primary category
      if (product.primaryCategory) {
        allCategories.add(product.primaryCategory);
      }
    });

    const sortedCategories = Array.from(allCategories).sort();
    return ["All", ...sortedCategories];
  };

  // Filter products based on search, category, and stock status (memoized for performance)
  const filteredProducts = useMemo(() => products.filter(product => {
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
  }), [products, searchQuery, selectedCategory, stockFilter]);

  const formatLastUsed = (lastUsed?: string) => {
  if (!lastUsed) {
    console.log('❌ No lastUsed date provided');
    return "Never used";
  }
  
  try {
    const lastUsedDate = new Date(lastUsed);
    const now = new Date();
    
    console.log('📅 Date Debug:', {
      input: lastUsed,
      parsed: lastUsedDate.toString(),
      now: now.toString(),
      isValid: !isNaN(lastUsedDate.getTime())
    });
    
    // Check if the date is valid
    if (isNaN(lastUsedDate.getTime())) {
      console.log('❌ Invalid date:', lastUsed);
      return "Never used";
    }
    
    const diffTime = Math.abs(now.getTime() - lastUsedDate.getTime());
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    console.log('⏰ Time Differences:', {
      minutes: diffMinutes,
      hours: diffHours,
      days: diffDays
    });
    
    // Handle same day
    if (diffDays === 0) {
      if (diffMinutes < 1) return "Just now";
      if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
      return "Today";
    }
    
    // Handle yesterday
    if (diffDays === 1) return "Yesterday";
    
    // Handle recent days
    if (diffDays < 7) return `${diffDays} days ago`;
    
    // Handle weeks
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
    }
    
    // Handle months
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months !== 1 ? 's' : ''} ago`;
    }
    
    // Handle years
    const years = Math.floor(diffDays / 365);
    return `${years} year${years !== 1 ? 's' : ''} ago`;
    
  } catch (error) {
    console.error('❌ Error formatting last used date:', error);
    return "Never used";
  }
};

  // Fetch products function
const fetchProducts = async (isRefresh = false) => {
  try {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    console.log('🔄 Fetching products...');
    
    // Vérifier si getProducts existe
    if (typeof getProducts !== 'function') {
      throw new Error('getProducts function is not available');
    }

    const res = await getProducts();
    console.log('📦 Products API response:', res);
    
    // Vérifier la structure de la réponse
    if (!res || !res.data) {
      console.warn('⚠️ Unexpected API response structure:', res);
      throw new Error('Invalid API response');
    }
    
    console.log('📦 Products loaded:', res.data);

    // Normalize the data to handle inconsistent field names
    const normalizedProducts = (res.data.data || res.data || []).map((product: any) => {
      // Handle price field - use price (from Firestore)
      const price = product.price || product.unitPrice || 0;
      
      // Handle quantity field - check for q, quantity, or stock
      const quantity = product.q || product.quantity || product.stock || 0;
      
      // Handle categories - ensure we have an array
      let categories = product.categories;
      if (!categories && product.category) {
        categories = [product.category];
      }
      if (!categories) {
        categories = ["Other"];
      }
      
      // Handle last used date
      const lastUsed = product.lastUsed || product.lastUsedDate || null;
      
      // Handle usage history - ensure it's an array
      const usageHistory = product.usageHistory || [];
      
      // Add lowStockThreshold with default value
      const lowStockThreshold = product.lowStockThreshold || 10;
      
      return {
        ...product,
        unitPrice: price,
        quantity: quantity,
        categories: categories,
        primaryCategory: product.primaryCategory || categories[0],
        lastUsed: lastUsed,
        usageHistory: usageHistory,
        lowStockThreshold: lowStockThreshold,
      };
    });
    
    console.log('🔄 Normalized products:', normalizedProducts);
    setProducts(normalizedProducts);
    
    // Extract categories from products
    const extractedCategories = extractCategoriesFromProducts(normalizedProducts);
    setCategories(extractedCategories.length > 1 ? extractedCategories : ["All", ...COMMON_CATEGORIES]);
    
    setInitialLoad(false);
  } catch (err) {
    console.error('❌ Error fetching products:', err);
    
    // Message d'erreur plus détaillé
    let errorMessage = "Failed to load products";
    if (err instanceof Error) {
      errorMessage = err.message;
    }
    
    Alert.alert("Error", errorMessage);
    setProducts([]);
    setCategories(["All", ...COMMON_CATEGORIES]);
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

  const clearAllFilters = useCallback(() => {
    setSearchQuery("");
    setSelectedCategory("All");
    setStockFilter("All");
  }, []);

  const styles = useMemo(() => getStyles(isDarkMode), [isDarkMode]);

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
    const isLowStock = displayQuantity > 0 && displayQuantity <= (item.lowStockThreshold || 10);
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
              usageHistory: JSON.stringify(item.usageHistory || []),
              lowStockThreshold: (item.lowStockThreshold || 10).toString(),
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

  if (loading && initialLoad) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>
            Loading Products inventory...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container} >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Products Inventory</Text>
        <Text style={styles.headerSubtitle}>Organized by categories</Text>
        
        {/* Header Actions */}
        <View style={styles.headerActions}>

          <TouchableOpacity style={styles.filterToggleButton} onPress={handleAddProduct}>
            <Text style={styles.filterToggleText}>
              + Add Product
            </Text>
          </TouchableOpacity>
        </View>
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
    </View>
  );
}

const getStyles = (isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDarkMode ? "#121212" : "#f8f9fa",
    paddingBottom:10,
  },
  header: {
    backgroundColor: "#f97316" ,
    padding: 20,
    paddingTop: 50,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    position: 'relative',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  headerActions: {
    position: 'absolute',
    top: 60,
    right: 20,
    flexDirection: 'row',
    gap: 8,
  },
  notificationSettingsButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  notificationSettingsText: {
    color: 'white',
    fontSize: 16,
  },
  filterToggleButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterToggleButtonHi: {
    marginLeft: 12,
    backgroundColor: 'rgba(240, 209, 209, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },  
  filterToggleText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: isDarkMode ? "#1a1a1a" : 'white',
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "#333" : '#e0e0e0',
  },
  searchInput: {
    backgroundColor: isDarkMode ? "#2d2d2d" : "#f8f8f8",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: isDarkMode ? "#444" : "#ddd",
    fontSize: 16,
    color: isDarkMode ? "#fff" : "#000",
  },
  filterSection: {
    backgroundColor: isDarkMode ? "#1a1a1a" : 'white',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "#333" : '#e0e0e0',
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? "#94a3b8" : "#64748b",
    marginBottom: 8,
    marginHorizontal: 16,
    textTransform: 'uppercase',
  },
  filterList: {
    paddingHorizontal: 16,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: isDarkMode ? "#374151" : "#f1f1f1",
    marginRight: 8,
    borderWidth: 1,
    borderColor: isDarkMode ? "#4b5563" : "#e0e0e0",
  },
  categoryChipSelected: {
    borderColor: 'transparent',
  },
  categoryChipText: {
    fontSize: 14,
    color: isDarkMode ? "#d1d5db" : "#666",
    fontWeight: "500",
  },
  categoryChipTextSelected: {
    color: 'white',
    fontWeight: "600",
  },
  stockFilterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: isDarkMode ? "#374151" : "#f1f1f1",
    marginRight: 8,
    borderWidth: 1,
    borderColor: isDarkMode ? "#4b5563" : "#e0e0e0",
  },
  stockFilterChipSelected: {
    backgroundColor: isDarkMode ? "#2563eb" : "#1d4ed8",
    borderColor: isDarkMode ? "#2563eb" : "#1d4ed8",
  },
  stockFilterChipText: {
    fontSize: 14,
    color: isDarkMode ? "#d1d5db" : "#666",
    fontWeight: "500",
  },
  stockFilterChipTextSelected: {
    color: 'white',
    fontWeight: "600",
  },
  resultsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: isDarkMode ? "#1a1a1a" : 'white',
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "#333" : '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultsText: {
    fontSize: 14,
    color: isDarkMode ? "#cbd5e1" : "#666",
    fontWeight: '500',
    flex: 1,
  },
  clearFiltersSmallButton: {
    backgroundColor: isDarkMode ? "#4b5563" : "#6b7280",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  clearFiltersSmallText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    backgroundColor: isDarkMode ? "#1a1a1a" : 'white',
  },
  actionButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    backgroundColor: isDarkMode ? "#2E8B57" : "#2E8B57",
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  listContent: {
    padding: 8,
    flexGrow: 1,
  },
  listContentExpanded: {
    paddingTop: 0,
  },
  productItem: {
    flexDirection: 'row',
    backgroundColor: isDarkMode ? "#1e1e1e" : "white",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 8,
    marginVertical: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: isDarkMode ? 0.1 : 0.05,
    shadowRadius: 3,
    elevation: 3,
    alignItems: 'center',
  },
  outOfStockCard: {
    backgroundColor: isDarkMode ? "#7f1d1d" : "#fecaca",
    borderLeftWidth: 4,
    borderLeftColor: isDarkMode ? "#f87171" : "#dc2626",
  },
  lowStockCard: {
    borderLeftWidth: 4,
    borderLeftColor: isDarkMode ? "#f59e0b" : "#f59e0b",
  },
  categoryIconContainer: {
    position: 'relative',
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  categoryIcon: {
    fontSize: 24,
    color: '#ffffff',
  },
  outOfStockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  lowStockBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  lowStockBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  productInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDarkMode ? "#f0f0f0" : "#333",
    flex: 1,
    marginRight: 8,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  primaryCategoryTag: {
    // Keep the color from the style above
  },
  categoryTagText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  moreCategoriesTag: {
    backgroundColor: isDarkMode ? "#6b7280" : "#9ca3af",
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 10,
  },
  moreCategoriesText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '600',
  },
  stockContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stockStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  quantityText: {
    fontSize: 12,
    color: isDarkMode ? "#94a3b8" : "#666",
    fontWeight: '500',
  },
  lastUsedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastUsedLabel: {
    fontSize: 11,
    color: isDarkMode ? "#64748b" : "#94a3b8",
    marginRight: 4,
  },
  lastUsedText: {
    fontSize: 11,
    color: isDarkMode ? "#cbd5e1" : "#475569",
    fontWeight: '500',
  },
  arrowContainer: {
    justifyContent: 'center',
    paddingLeft: 8,
  },
  arrow: {
    fontSize: 20,
    color: isDarkMode ? "#94a3b8" : "#999",
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDarkMode ? "#cbd5e1" : "#666",
    marginBottom: 8,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDarkMode ? "#cbd5e1" : "#666",
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#888",
    textAlign: "center",
  },
  clearFiltersButton: {
    backgroundColor: isDarkMode ? "#4b5563" : "#6b7280",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  clearFiltersButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  emptyButton: {
    marginTop: 16,
  },
});