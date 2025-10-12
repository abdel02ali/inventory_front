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
  const [showExpired, setShowExpired] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searchType, setSearchType] = useState<"name" | "id">("name");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

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
        
        return {
          ...product,
          unitPrice: price, // Map to unitPrice for consistency
          quantity: quantity, // Map to quantity for consistency
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

  // 🔄 AUTO-REFRESH: Fetch products when screen is focused, but only show loading in FlatList
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 ProductsScreen focused - refreshing data...');
      if (!initialLoad) {
        // For subsequent focuses, refresh without showing full screen loader
        setRefreshing(true);
        fetchProducts(true);
      }
    }, [initialLoad])
  );

  // Initial load on component mount
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

  // Filter products based on search and filters
  const filteredProducts = products
    .filter((product) =>
      searchType === "name"
        ? product.name.toLowerCase().includes(searchText.toLowerCase())
        : product.id.toLowerCase().includes(searchText.toLowerCase())
    )
    .filter((product) => (showExpired ? product.quantity === 0 : true));

  const styles = getStyles(isDarkMode);

  const renderItem: ListRenderItem<Product> = ({ item }) => {
    // Get the actual values with fallbacks
    const displayPrice = item.unitPrice || item.price || 0;
    const displayQuantity = item.quantity || item.q || 0;
    
    // Determine if product is low stock or out of stock
    const isLowStock = displayQuantity > 0 && displayQuantity <= 10;
    const isOutOfStock = displayQuantity === 0;
    
    return (
      <TouchableOpacity
        style={[
          styles.productCard,
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
            },
          })
        }
        activeOpacity={0.7}
      >
        <Text style={[styles.cell, styles.idCell, styles.text]}>
          {item.id.substring(0, 10)}... {/* Show shortened ID */}
        </Text>
        <Text style={[styles.cell, styles.nameCell, styles.text]}>
          {item.name}
        </Text>
        <View style={styles.quantityCell}>
          <Text style={[
            styles.quantityText,
            isOutOfStock && styles.outOfStockText,
            isLowStock && styles.lowStockText,
          ]}>
            {displayQuantity}
          </Text>
          {isLowStock && <Text style={styles.lowStockIndicator}>⚠️</Text>}
          {isOutOfStock && <Text style={styles.outOfStockIndicator}>🔴</Text>}
        </View>
        <Text style={[styles.cell, styles.priceCell, styles.text]}>
          {displayPrice.toFixed(2)} MAD
        </Text>
      </TouchableOpacity>
    );
  };

  // Only show full screen loading on initial load
  if (loading && initialLoad) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>
            Loading products...
          </Text>
          <Text style={styles.loadingSubtext}>
            Please wait while we fetch your products
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* Debug Header */}
      <View style={styles.debugHeader}>
        <Text style={styles.debugText}>
          Products: {products.length} | Filtered: {filteredProducts.length} | Search: {searchType}
          {initialLoad ? " | ⏳ Initial Loading..." : " | ✅ Data Loaded"}
        </Text>
      </View>

      {/* Title */}
      <View style={styles.titleBanner}>
        <Text style={styles.titleBannerText}>Products</Text>
        <Text style={styles.subtitleText}>
          {products.length} product{products.length !== 1 ? 's' : ''} total
        </Text>
      </View>

      {/* Search Row */}
      <View style={styles.searchRow}>
        {/* Search Type Buttons */}
        <View style={{ flexDirection: "row", marginRight: 8 }}>
          <TouchableOpacity
            style={[
              styles.searchTypeButton,
              searchType === "name" && styles.searchTypeButtonActive,
            ]}
            onPress={() => setSearchType("name")}
          >
            <Text style={[
              styles.searchTypeText,
              searchType === "name" && styles.searchTypeTextActive,
            ]}>
              Name
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.searchTypeButton,
              searchType === "id" && styles.searchTypeButtonActive,
            ]}
            onPress={() => setSearchType("id")}
          >
            <Text style={[
              styles.searchTypeText,
              searchType === "id" && styles.searchTypeTextActive,
            ]}>
              ID
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <TextInput
          style={[
            styles.searchInput,
            { flex: 1 },
          ]}
          placeholder={`Search by ${searchType}`}
          placeholderTextColor={isDarkMode ? "#94a3b8" : "#64748b"}
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {/* Filter Buttons - HORIZONTAL */}
      <View style={styles.filterRow}>
        <TouchableOpacity 
          style={[
            styles.filterButton,
            !showExpired && styles.filterButtonActive,
          ]}
          onPress={() => setShowExpired(false)}
        >
          <Text style={[
            styles.filterButtonText,
            !showExpired && styles.filterButtonTextActive,
          ]}>
            All Products
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.filterButton,
            showExpired && styles.filterButtonActive,
          ]}
          onPress={() => setShowExpired(true)}
        >
          <Text style={[
            styles.filterButtonText,
            showExpired && styles.filterButtonTextActive,
          ]}>
            Out of Stock
          </Text>
        </TouchableOpacity>
      </View>

      {/* Active Filters Info */}
      {(searchText || showExpired) && (
        <View style={styles.filterInfo}>
          <Text style={styles.filterInfoText}>
            {showExpired && "Out of Stock"}
            {showExpired && searchText && " • "}
            {searchText && `Search: ${searchText}`}
          </Text>
          <TouchableOpacity 
            onPress={() => {
              setSearchText("");
              setShowExpired(false);
            }}
          >
            <Text style={styles.clearFiltersText}>
              Clear
            </Text>
          </TouchableOpacity>
        </View>
      )}

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

      {/* Table Header */}
      <View style={[styles.row, styles.headerRow]}>
        <Text style={[styles.cell, styles.idCell, styles.headerText]}>ID</Text>
        <Text style={[styles.cell, styles.nameCell, styles.headerText]}>Name</Text>
        <Text style={[styles.cell, styles.quantityCell, styles.headerText]}>Quantity</Text>
        <Text style={[styles.cell, styles.priceCell, styles.headerText]}>Price</Text>
      </View>

      {/* Products List with RefreshControl */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[isDarkMode ? "#2ab723ff" : "#16a34a"]}
            tintColor={isDarkMode ? "#2ab723ff" : "#16a34a"}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {searchText || showExpired ? "No products match your filters" : "No products found"}
            </Text>
            <Text style={styles.emptySubtext}>
              {!searchText && !showExpired && "Create your first product to get started"}
              {(searchText || showExpired) && "Try adjusting your search or filters"}
            </Text>
            {(searchText || showExpired) && (
              <TouchableOpacity 
                style={styles.clearFiltersButton}
                onPress={() => {
                  setSearchText("");
                  setShowExpired(false);
                }}
              >
                <Text style={styles.clearFiltersButtonText}>Clear All Filters</Text>
              </TouchableOpacity>
            )}
            {!searchText && !showExpired && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.primaryButton, styles.emptyButton]}
                onPress={handleAddProduct}
              >
                <Text style={styles.actionButtonText}>Create First Product</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        style={{ marginTop: 5, width: "100%" }}
      />
    </SafeAreaView>
  );
}


const getStyles = (isDarkMode: boolean) => StyleSheet.create({
  container: { 
    flex: 1, 
    paddingHorizontal: 16, 
    backgroundColor: isDarkMode ? "#121212" : "#f5f7fa" 
  },
  debugHeader: {
    backgroundColor: isDarkMode ? "#334155" : "#e2e8f0",
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  debugText: {
    color: isDarkMode ? "#60a5fa" : "#2563eb",
    fontSize: 12,
    textAlign: "center",
    fontWeight: "bold",
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
  loadingSubtext: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#888",
    textAlign: 'center',
  },
  titleBanner: {
    backgroundColor: isDarkMode ? "#1e293b" : "#1e293b",
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 20,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: isDarkMode ? "#2ab723ff" : "#16a34a",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDarkMode ? 0.3 : 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  titleBannerText: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    color: "#f1f5f9",
    letterSpacing: 0.3,
  },
  subtitleText: {
    fontSize: 14,
    textAlign: "center",
    color: "#cbd5e1",
    marginTop: 4,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  searchTypeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: isDarkMode ? "#374151" : "#cbd5e1",
    marginRight: 8,
    borderWidth: 1,
    borderColor: isDarkMode ? "#4b5563" : "#cbd5e1",
  },
  searchTypeButtonActive: {
    backgroundColor: isDarkMode ? "#2ab723ff" : "#16a34a",
    borderColor: isDarkMode ? "#2ab723ff" : "#16a34a",
  },
  searchTypeText: {
    color: isDarkMode ? "#d1d5db" : "#4b5563",
    fontWeight: "600",
    fontSize: 14,
  },
  searchTypeTextActive: {
    color: "#fff",
    fontWeight: "bold",
  },
  searchInput: {
    borderWidth: 1,
    borderColor: isDarkMode ? "#444" : "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: isDarkMode ? "#1e1e1e" : "#fff",
    color: isDarkMode ? "#fff" : "#000",
    fontSize: 14,
  },
  // Filter Buttons
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: isDarkMode ? "#1e1e1e" : "#fff",
    borderWidth: 1,
    borderColor: isDarkMode ? "#444" : "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
  },
  filterButtonActive: {
    backgroundColor: isDarkMode ? "#2ab723ff" : "#16a34a",
    borderColor: isDarkMode ? "#2ab723ff" : "#16a34a",
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: isDarkMode ? "#d1d5db" : "#666",
  },
  filterButtonTextActive: {
    color: "#fff",
    fontWeight: "bold",
  },
  filterInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  filterInfoText: {
    fontSize: 12,
    color: isDarkMode ? '#94a3b8' : '#666',
    fontStyle: 'italic',
  },
  clearFiltersText: {
    fontSize: 12,
    color: isDarkMode ? '#2ab723ff' : '#16a34a',
    fontWeight: 'bold',
  },
  // Action Buttons
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    backgroundColor: isDarkMode ? "#2ab723ff" : "#16a34a",
  },
  secondaryButton: {
    backgroundColor: isDarkMode ? "#2563eb" : "#1d4ed8",
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  emptyButton: {
    marginTop: 16,
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
  // Table Styles
  row: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "#334155" : "#e2e8f0"
  },
  headerRow: {
    backgroundColor: isDarkMode ? "#1f2937" : "#e0f2fe",
    borderBottomWidth: 2,
    borderBottomColor: isDarkMode ? "#2ab723ff" : "#16a34a",
    marginBottom: 6
  },
  cell: {
    paddingHorizontal: 8,
    fontSize: 14,
    textAlign: 'center',
    justifyContent: 'center',
  },
  idCell: { flex: 1 },
  nameCell: { flex: 2 },
  quantityCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  priceCell: { flex: 1 },
  headerText: {
    fontWeight: "bold",
    color: isDarkMode ? "#f0f0f0" : "#1e293b",
    textAlign: 'center',
  },
  text: {
    color: isDarkMode ? "#f0f0f0" : "#1e293b"
  },
  quantityText: {
    fontSize: 14,
    textAlign: 'center',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
  },
  lowStockText: {
    color: isDarkMode ? "#fbbf24" : "#d97706",
    fontWeight: 'bold',
  },
  outOfStockText: {
    color: isDarkMode ? "#f87171" : "#dc2626",
    fontWeight: 'bold',
  },
  lowStockIndicator: {
    fontSize: 12,
  },
  outOfStockIndicator: {
    fontSize: 12,
  },
  productCard: {
    flexDirection: "row",
    paddingVertical: 14,
    paddingHorizontal: 8,
    backgroundColor: isDarkMode ? "#1e1e1e" : "#fff",
    borderRadius: 10,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: isDarkMode ? 0.1 : 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    alignItems: 'center',
  },
  outOfStockCard: {
    backgroundColor: isDarkMode ? "#7f1d1d" : "#fecaca",
    borderLeftWidth: 4,
    borderLeftColor: isDarkMode ? "#f87171" : "#dc2626",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    color: isDarkMode ? "#cbd5e1" : "#666",
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#888",
    textAlign: "center",
  },
});