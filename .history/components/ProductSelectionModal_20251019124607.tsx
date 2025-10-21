// components/ProductSelectionModal.tsx
import { getProducts } from '@/app/api';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    useColorScheme,
    View,
} from 'react-native';

interface Product {
  id: string;
  name: string;
  quantity: number;
  q: number;
  unit: string;
}

interface ProductSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (product: Product) => void;
  onAddProduct: () => void; // New prop for adding product
  movementType: 'stock_in' | 'distribution';
  selectedProductIds: string[];
}

export default function ProductSelectionModal({
  visible,
  onClose,
  onSelect,
  onAddProduct,
  movementType,
  selectedProductIds,
}: ProductSelectionModalProps) {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const styles = getStyles(isDarkMode);

  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch fresh products data when modal opens
  useEffect(() => {
    if (visible) {
      fetchProducts();
    }
  }, [visible]);

  // Filter products based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  }, [searchQuery, products]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      console.log('🔄 ProductSelectionModal: Fetching fresh products data...');
      
      const response = await getProducts();
      
      // Handle different response formats
      let productsData = [];
      
      if (response.data && response.data.success && response.data.data) {
        // Format: { data: { success: true, data: [...] } }
        productsData = response.data.data;
      } else if (response.data && Array.isArray(response.data)) {
        // Format: { data: [...] }
        productsData = response.data;
      } else if ( response.data) {
        // Format: { success: true, data: [...] }
        productsData = response.data;
      } else if (Array.isArray(response)) {
        // Format: [...]
        productsData = response;
      } else {
        console.log('❌ ProductSelectionModal: Unexpected response format', response);
        return;
      }

      console.log('✅ ProductSelectionModal: Products fetched successfully');
      setProducts(productsData);
      setFilteredProducts(productsData);
      
      // Log sample data for debugging
      console.log('📊 ProductSelectionModal: Sample products:', 
        productsData.slice(0, 3).map((p: any) => ({
          id: p.id,
          name: p.name,
          quantity: p.quantity,
          q: p.q,
          unit: p.unit
        }))
      );
    } catch (error) {
      console.error('❌ ProductSelectionModal: Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProductStock = (product: Product) => {
    // Check both fields and prioritize the one that has actual data
    if (product.q !== undefined && product.q !== null) {
      return product.q;
    }
    if (product.quantity !== undefined && product.quantity !== null) {
      return product.quantity;
    }
    return 0;
  };

  const handleSelectProduct = (product: Product) => {
    console.log('🎯 Product selected:', {
      name: product.name,
      stock: getProductStock(product),
      movementType: movementType
    });
    onSelect(product);
    onClose();
  };

  const handleAddProduct = () => {
    console.log('➕ Add Product button pressed');
    onAddProduct();
    onClose();
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { text: 'Out of stock', color: '#ef4444', bgColor: '#fee2e2' };
    if (stock < 10) return { text: 'Low stock', color: '#f59e0b', bgColor: '#fef3c7' };
    return { text: 'In stock', color: '#10b981', bgColor: '#d1fae5' };
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingView}
          >
            <View style={styles.modalContainer}>
              <View style={styles.dropdownHeader}>
                <View style={styles.headerTitleContainer}>
                  <Ionicons name="cube-outline" size={24} color={isDarkMode ? "#f1f5f9" : "#1e293b"} />
                  <Text style={styles.dropdownTitle}>Select Product</Text>
                </View>
                <TouchableOpacity 
                  onPress={onClose}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color={isDarkMode ? "#94a3b8" : "#64748b"} />
                </TouchableOpacity>
              </View>
              
              {/* Search Bar */}
              <View style={styles.searchContainer}>
                <View style={styles.searchIconContainer}>
                  <Ionicons name="search" size={20} color={isDarkMode ? "#94a3b8" : "#64748b"} />
                </View>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search products by name..."
                  placeholderTextColor={isDarkMode ? "#94a3b8" : "#9ca3af"}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                />
                {searchQuery ? (
                  <TouchableOpacity 
                    onPress={() => setSearchQuery('')}
                    style={styles.clearSearchButton}
                  >
                    <Ionicons name="close-circle" size={20} color={isDarkMode ? "#94a3b8" : "#64748b"} />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Add Product Button */}
              <TouchableOpacity 
                style={styles.addProductButton}
                onPress={handleAddProduct}
              >
                <View style={styles.addProductButtonContent}>
                  <Ionicons name="add-circle" size={20} color="#ffffff" />
                  <Text style={styles.addProductButtonText}>Add New Product</Text>
                </View>
              </TouchableOpacity>

              {/* Products List */}
              <View style={styles.productsListContainer}>
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366f1" />
                    <Text style={styles.loadingText}>Loading products...</Text>
                  </View>
                ) : (
                  <FlatList
                    data={filteredProducts}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => {
                      const isSelected = selectedProductIds.includes(item.id);
                      const currentStock = getProductStock(item);
                      const stockStatus = getStockStatus(currentStock);
                      
                      return (
                        <TouchableOpacity
                          style={[
                            styles.productItem,
                            isSelected && styles.productItemSelected
                          ]}
                          onPress={() => handleSelectProduct(item)}
                          disabled={isSelected || (movementType === 'distribution' && currentStock === 0)}
                        >
                          <View style={styles.productIcon}>
                            <Ionicons 
                              name="cube" 
                              size={20} 
                              color={isSelected ? '#10b981' : (isDarkMode ? "#94a3b8" : "#64748b")} 
                            />
                          </View>
                          
                          <View style={styles.productInfo}>
                            <Text style={[
                              styles.productName,
                              isSelected && styles.productNameSelected
                            ]}>
                              {item.name}
                            </Text>
                            <View style={styles.productDetails}>
                              <Text style={styles.productUnit}>
                                {item.unit || 'units'}
                              </Text>
                              <Text style={styles.productStock}>
                                Stock: {currentStock}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.productStatus}>
                            <View style={[styles.stockBadge, { backgroundColor: stockStatus.bgColor }]}>
                              <Text style={[styles.stockText, { color: stockStatus.color }]}>
                                {stockStatus.text}
                              </Text>
                            </View>
                            {isSelected && (
                              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    }}
                    ListEmptyComponent={
                      <View style={styles.emptyState}>
                        <Ionicons 
                          name="search-outline" 
                          size={64} 
                          color={isDarkMode ? "#475569" : "#cbd5e1"} 
                        />
                        <Text style={styles.emptyStateTitle}>
                          {searchQuery ? 'No products found' : 'No products available'}
                        </Text>
                        <Text style={styles.emptyStateText}>
                          {searchQuery 
                            ? 'Try adjusting your search terms'
                            : 'Add products to get started'
                          }
                        </Text>
                      </View>
                    }
                  />
                )}
              </View>

              {/* Footer */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
                </Text>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const getStyles = (isDarkMode: boolean) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: 'flex-end',
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "#334155" : "#e2e8f0",
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dropdownTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "#334155" : "#e2e8f0",
  },
  searchIconContainer: {
    padding: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    marginRight: 8,
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    fontSize: 16,
    paddingVertical: 8,
  },
  clearSearchButton: {
    padding: 4,
  },
  addProductButton: {
    backgroundColor: '#6366f1',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addProductButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addProductButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  productsListContainer: {
    flex: 1,
    minHeight: 200,
    maxHeight: 400,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontSize: 14,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "#334155" : "#f1f5f9",
  },
  productItemSelected: {
    backgroundColor: isDarkMode ? "#374151" : "#f8fafc",
  },
  productIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: isDarkMode ? "#334155" : "#f1f5f9",
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 4,
  },
  productNameSelected: {
    color: '#10b981',
  },
  productDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  productUnit: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    backgroundColor: isDarkMode ? "#334155" : "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  productStock: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  productStatus: {
    alignItems: 'flex-end',
    gap: 4,
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stockText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: isDarkMode ? "#334155" : "#e2e8f0",
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontWeight: '500',
  },
});