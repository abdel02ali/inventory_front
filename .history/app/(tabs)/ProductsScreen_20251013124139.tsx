import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
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
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [imageErrors, setImageErrors] = useState<{[key: string]: boolean}>({});

  // Mock categories for restaurant ingredients
  const categories = ["All", "Vegetables", "Fruits", "Meat", "Seafood", "Dairy", "Herbs", "Grains", "Oils"];

  const handleImageError = (productId: string) => {
    setImageErrors(prev => ({
      ...prev,
      [productId]: true
    }));
  };

  // Filter products based on search and category
  const filteredProducts = products.filter(product => {
    // Safely handle potentially undefined category and name
    const productCategory = product.category || "Other";
    const productName = product.name || "";
    
    const matchesSearch = productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         productCategory.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || productCategory === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getProductImage = (product: Product) => {
    if (product.image) return product.image;
    
    // Safely handle potentially undefined category
    const productCategory = product.category || "Other";
    
    // Fallback images based on category
    const categoryImages: {[key: string]: string} = {
      'Vegetables': 'https://images.unsplash.com/photo-1546470427-e212b7d31065?w=400&h=400&fit=crop',
      'Fruits': 'https://images.unsplash.com/photo-1546548970-71785318a17b?w=400&h=400&fit=crop',
      'Meat': 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&h=400&fit=crop',
      'Seafood': 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&h=400&fit=crop',
      'Dairy': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=400&fit=crop',
      'Herbs': 'https://images.unsplash.com/photo-1599889962058-27e7b6b9baa7?w=400&h=400&fit=crop',
      'Grains': 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=400&h=400&fit=crop',
      'Oils': 'https://images.unsplash.com/photo-1612489849119-dfb7c6a1c2e9?w=400&h=400&fit=crop',
      'Other': 'https://images.unsplash.com/photo-1546548970-71785318a17b?w=400&h=400&fit=crop',
    };
    
    return categoryImages[productCategory] || categoryImages['Other'];
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
      
      // Normalize the data to handle inconsistent field names
      const normalizedProducts = (res.data || []).map((product: any) => {
        // Handle price field - use price (from Firestore)
        const price = product.price || product.unitPrice || 0;
        
        // Handle quantity field - check for q, quantity, or stock
        const quantity = product.q || product.quantity || product.stock || 0;
        
        // Handle category - default to "Other" if not provided
        const category = product.category || "Other";
        
        return {
          ...product,
          unitPrice: price,
          quantity: quantity,
          category: category,
        };
      });
      
      console.log('🔄 Normalized products:', normalizedProducts);
      setProducts(normalizedProducts);
      setInitialLoad(false);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to load products");
      setProducts([]);
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

  const styles = getStyles(isDarkMode);

  const renderCategoryChip = (category: string) => (
    <TouchableOpacity
      key={category}
      style={[
        styles.categoryChip,
        selectedCategory === category && styles.categoryChipSelected
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

  const renderProductItem: ListRenderItem<Product> = ({ item }) => {
    const displayPrice = item.unitPrice || item.price || 0;
    const displayQuantity = item.quantity || item.q || 0;
    const isOutOfStock = displayQuantity === 0;
    const isLowStock = displayQuantity > 0 && displayQuantity <= 10;
    const productImage = getProductImage(item);
    const productCategory = item.category || "Other";

    return (
      <TouchableOpacity
        style={[
          styles.productItem,
          isOutOfStock && styles.outOfStockCard,
        ]}
        onPress={() =>
          router.push({
            pathname: "/details/product",
            
            params: { 
              id: item.id, 
              name: item.name, 
              quantity: displayQuantity.toString(),
              unitPrice: displayPrice.toString(),
              category: productCategory,
            },
          })
        }
        activeOpacity={0.7}
      >
        <View style={styles.imageContainer}>
          <Image 
            source={{ 
              uri: imageErrors[item.id] 
                ? 'https://via.placeholder.com/150?text=No+Image' 
                : productImage
            }} 
            style={styles.productImage}
            onError={() => handleImageError(item.id)}
          />
          {isOutOfStock && (
            <View style={styles.outOfStockOverlay}>
              <Text style={styles.outOfStockText}>Out of Stock</Text>
            </View>
          )}
        </View>
        
        <View style={styles.productInfo}>
          <View style={styles.productHeader}>
            <Text style={styles.productName}>{item.name || "Unnamed Product"}</Text>
            <Text style={styles.productPrice}>${displayPrice.toFixed(2)}</Text>
          </View>
          
          <Text style={styles.productCategory}>{productCategory}</Text>
          
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
              Qty: {displayQuantity}
            </Text>
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
        <Text style={styles.headerSubtitle}>Ingredients & Raw Materials</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search ingredients..."
          placeholderTextColor={isDarkMode ? "#94a3b8" : "#64748b"}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Category Filter */}
      <View style={styles.categoriesContainer}>
        <FlatList
          data={categories}
          renderItem={({ item }) => renderCategoryChip(item)}
          keyExtractor={(item) => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        />
      </View>

      {/* Results Count */}
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsText}>
          {filteredProducts.length} item{filteredProducts.length !== 1 ? 's' : ''} found
          {selectedCategory !== 'All' ? ` in ${selectedCategory}` : ''}
          {searchQuery ? ` for "${searchQuery}"` : ''}
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.primaryButton]} 
          onPress={handleAddProduct}
        >
          <Text style={styles.actionButtonText}>+ Add Product</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.secondaryButton]} 
          onPress={() => router.push("/details/add-quantity")}
        >
          <Text style={styles.actionButtonText}>➕ Add Quantities</Text>
        </TouchableOpacity>
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
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {searchQuery || selectedCategory !== "All" ? "No items match your filters" : "No products found"}
            </Text>
            <Text style={styles.emptySubtext}>
              {!searchQuery && selectedCategory === "All" && "Create your first product to get started"}
              {(searchQuery || selectedCategory !== "All") && "Try adjusting your search or filters"}
            </Text>
            {(searchQuery || selectedCategory !== "All") && (
              <TouchableOpacity 
                style={styles.clearFiltersButton}
                onPress={() => {
                  setSearchQuery("");
                  setSelectedCategory("All");
                }}
              >
                <Text style={styles.clearFiltersButtonText}>Clear All Filters</Text>
              </TouchableOpacity>
            )}
            {!searchQuery && selectedCategory === "All" && (
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
    backgroundColor: isDarkMode ? "#121212" : "#f8f9fa",
  },
  header: {
    backgroundColor: isDarkMode ? "#1e293b" : "#2E8B57",
    padding: 20,
    paddingTop: 50,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
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
  searchContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    backgroundColor: isDarkMode ? "#1e1e1e" : "#f8f8f8",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: isDarkMode ? "#444" : "#ddd",
    fontSize: 16,
    color: isDarkMode ? "#fff" : "#000",
  },
  categoriesContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  categoriesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    backgroundColor: isDarkMode ? "#2E8B57" : "#2E8B57",
    borderColor: isDarkMode ? "#2E8B57" : "#2E8B57",
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
  resultsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  resultsText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
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
  secondaryButton: {
    backgroundColor: isDarkMode ? "#2563eb" : "#1d4ed8",
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
  imageContainer: {
    position: 'relative',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
    backgroundColor: '#f0f0f0',
  },
  outOfStockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 16,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
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
  productPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? "#2E8B57" : "#2E8B57",
  },
  productCategory: {
    fontSize: 12,
    color: isDarkMode ? "#94a3b8" : "#666",
    marginBottom: 8,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  stockContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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