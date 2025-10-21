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
import { departmentService } from '../../services/departmentService';
import { getProducts } from "../api";
import { Product } from "../types/model";

// Define Department type if not already defined
interface Department {
  id: string;
  name: string;
}

export default function ProductsScreen() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("All");
  const [stockFilter, setStockFilter] = useState<string>("All");
  const [products, setProducts] = useState<Product[]>([]);
  const [departments, setDepartments] = useState<string[]>(["All"]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [imageErrors, setImageErrors] = useState<{[key: string]: boolean}>({});

  // Stock status filters
  const stockFilters = ["All", "In Stock", "Low Stock", "Out of Stock"];

  const handleImageError = (productId: string) => {
    setImageErrors(prev => ({
      ...prev,
      [productId]: true
    }));
  };

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      const depts = await departmentService.getDepartments();
      // Extract department names and add "All" option
      const departmentNames = ["All", ...depts.map((dept: Department) => dept.name)];
      setDepartments(departmentNames);
    } catch (error) {
      console.error('Failed to load departments:', error);
      // Fallback departments if the service fails
      setDepartments(["All", "Kitchen", "Bar", "Pastry", "Butchery", "Pantry"]);
    }
  };

  // Filter products based on search, department, and stock status
  const filteredProducts = products.filter(product => {
    // Safely handle potentially undefined fields
    const productDepartment = product.department || "Other";
    const productName = product.name || "";
    const quantity = product.quantity || product.q || 0;
    
    // Search filter
    const matchesSearch = productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         productDepartment.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Department filter
    const matchesDepartment = selectedDepartment === "All" || productDepartment === selectedDepartment;
    
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
    
    return matchesSearch && matchesDepartment && matchesStock;
  });

  const getProductImage = (product: Product) => {
    if (product.image) return product.image;
    
    // Safely handle potentially undefined department
    const productDepartment = product.department || "Other";
    
    // Fallback images based on department
    const departmentImages: {[key: string]: string} = {
      'Kitchen': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop',
      'Bar': 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=400&h=400&fit=crop',
      'Pastry': 'https://images.unsplash.com/photo-1555507036-ab794f27d2e9?w=400&h=400&fit=crop',
      'Butchery': 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&h=400&fit=crop',
      'Pantry': 'https://images.unsplash.com/photo-1546548970-71785318a17b?w=400&h=400&fit=crop',
      'Other': 'https://images.unsplash.com/photo-1546548970-71785318a17b?w=400&h=400&fit=crop',
    };
    
    return departmentImages[productDepartment] || departmentImages['Other'];
  };

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
      
      // Normalize the data to handle inconsistent field names
      const normalizedProducts = (res.data || []).map((product: any) => {
        // Handle price field - use price (from Firestore)
        const price = product.price || product.unitPrice || 0;
        
        // Handle quantity field - check for q, quantity, or stock
        const quantity = product.q || product.quantity || product.stock || 0;
        
        // Handle department - default to "Other" if not provided
        const department = product.department || "Other";
        
        // Handle last used date
        const lastUsed = product.lastUsed || product.lastUsedDate || null;
        
        return {
          ...product,
          unitPrice: price,
          quantity: quantity,
          department: department,
          lastUsed: lastUsed,
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

  const loadAllData = async () => {
    await Promise.all([fetchDepartments(), fetchProducts()]);
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
    loadAllData();
  }, []);

  const onRefresh = () => {
    console.log('🔄 Manual refresh triggered');
    setRefreshing(true);
    loadAllData();
  };

  const handleAddProduct = () => {
    router.push("/details/add-product");
  };

  const styles = getStyles(isDarkMode);

  const renderDepartmentChip = (department: string) => (
    <TouchableOpacity
      key={department}
      style={[
        styles.categoryChip,
        selectedDepartment === department && styles.categoryChipSelected
      ]}
      onPress={() => setSelectedDepartment(department)}
    >
      <Text style={[
        styles.categoryChipText,
        selectedDepartment === department && styles.categoryChipTextSelected
      ]}>
        {department}
      </Text>
    </TouchableOpacity>
  );

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
    const displayQuantity = item.quantity || item.q || 0;
    const isOutOfStock = displayQuantity === 0;
    const isLowStock = displayQuantity > 0 && displayQuantity <= 10;
    const productImage = getProductImage(item);
    const productDepartment = item.department || "Other";
    const lastUsedText = formatLastUsed(item.lastUsed);

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
              department: productDepartment,
              lastUsed: item.lastUsed || '',
 category: item.category || "Other",
    

              
    
              
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
          
          <Text style={styles.productDepartment}>{productDepartment}</Text>
          
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
        <Text style={styles.headerSubtitle}>Manage ingredients by department</Text>
      </View>

      {/* Search Bar */}
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

      {/* Department Filter */}
      <View style={styles.filterSection}>
        <Text style={styles.filterSectionTitle}>Departments</Text>
        <FlatList
          data={departments}
          renderItem={({ item }) => renderDepartmentChip(item)}
          keyExtractor={(item) => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
        />
      </View>

      {/* Stock Status Filter */}
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

      {/* Results Count */}
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsText}>
          {filteredProducts.length} item{filteredProducts.length !== 1 ? 's' : ''} found
          {selectedDepartment !== 'All' ? ` in ${selectedDepartment}` : ''}
          {stockFilter !== 'All' ? ` • ${stockFilter}` : ''}
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
              {searchQuery || selectedDepartment !== "All" || stockFilter !== "All" 
                ? "No items match your filters" 
                : "No products found"}
            </Text>
            <Text style={styles.emptySubtext}>
              {!searchQuery && selectedDepartment === "All" && stockFilter === "All" 
                ? "Create your first product to get started"
                : "Try adjusting your search or filters"}
            </Text>
            {(searchQuery || selectedDepartment !== "All" || stockFilter !== "All") && (
              <TouchableOpacity 
                style={styles.clearFiltersButton}
                onPress={() => {
                  setSearchQuery("");
                  setSelectedDepartment("All");
                  setStockFilter("All");
                }}
              >
                <Text style={styles.clearFiltersButtonText}>Clear All Filters</Text>
              </TouchableOpacity>
            )}
            {!searchQuery && selectedDepartment === "All" && stockFilter === "All" && (
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

// ... (keep the same getStyles function from previous code)
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
  },
  resultsText: {
    fontSize: 14,
    color: isDarkMode ? "#cbd5e1" : "#666",
    fontWeight: '500',
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
  lowStockCard: {
    borderLeftWidth: 4,
    borderLeftColor: isDarkMode ? "#f59e0b" : "#f59e0b",
  },
  imageContainer: {
    position: 'relative',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
    backgroundColor: isDarkMode ? '#2d2d2d' : '#f0f0f0',
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
  lowStockBadge: {
    position: 'absolute',
    top: 4,
    right: 20,
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
  productDepartment: {
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
    marginBottom: 4,
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