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
  movementType: 'stock_in' | 'distribution';
  selectedProductIds: string[];
}

export default function ProductSelectionModal({
  visible,
  onClose,
  onSelect,
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

  // components/ProductSelectionModal.tsx (updated fetchProducts function)
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
    return product.quantity !== undefined ? product.quantity : product.q;
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
            <View style={styles.dropdownContainer}>
              <View style={styles.dropdownHeader}>
                <Text style={styles.dropdownTitle}>Select Product</Text>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name="close" size={24} color={isDarkMode ? "#f1f5f9" : "#1e293b"} />
                </TouchableOpacity>
              </View>
              
              {/* Search Bar */}
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={isDarkMode ? "#94a3b8" : "#64748b"} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search products..."
                  placeholderTextColor={isDarkMode ? "#94a3b8" : "#9ca3af"}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                />
              </View>

              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#6366f1" />
                  <Text style={styles.loadingText}>Loading products...</Text>
                </View>
              ) : (
                <FlatList
                  data={filteredProducts}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => {
                    const isSelected = selectedProductIds.includes(item.id);
                    const currentStock = getProductStock(item);
                    
                    return (
                      <TouchableOpacity
                        style={[
                          styles.dropdownItem,
                          isSelected && styles.dropdownItemSelected
                        ]}
                        onPress={() => handleSelectProduct(item)}
                        disabled={isSelected}
                      >
                        <View style={styles.productInfo}>
                          <Text style={[
                            styles.dropdownItemText,
                            isSelected && styles.dropdownItemTextSelected
                          ]}>
                            {item.name}
                          </Text>
                          <Text style={styles.productUnit}>
                            Unit: {item.unit || 'units'} • Current Stock: {currentStock || 0}
                            {movementType === 'distribution' && currentStock === 0 && (
                              <Text style={styles.lowStockWarning}> • Out of stock!</Text>
                            )}
                          </Text>
                        </View>
                        {isSelected && (
                          <Ionicons name="checkmark" size={20} color="#10b981" />
                        )}
                      </TouchableOpacity>
                    );
                  }}
                  ListEmptyComponent={
                    <View style={styles.emptyDropdown}>
                      <Text style={styles.emptyDropdownText}>
                        {searchQuery ? 'No products found' : 'No products available'}
                      </Text>
                    </View>
                  }
                />
              )}
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
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  keyboardAvoidingView: {
    flex: 1,
    width: '100%',
  },
  dropdownContainer: {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderRadius: 20,
    width: '100%',
    maxHeight: '80%',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "#334155" : "#e2e8f0",
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "#334155" : "#e2e8f0",
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    fontSize: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontSize: 14,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "#334155" : "#f1f5f9",
  },
  dropdownItemSelected: {
    backgroundColor: isDarkMode ? "#374151" : "#f1f5f9",
  },
  productInfo: {
    flex: 1,
  },
  dropdownItemText: {
    fontSize: 16,
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    fontWeight: '500',
    marginBottom: 4,
  },
  dropdownItemTextSelected: {
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  productUnit: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  lowStockWarning: {
    color: '#ef4444',
    fontWeight: 'bold',
  },
  emptyDropdown: {
    padding: 40,
    alignItems: 'center',
  },
  emptyDropdownText: {
    textAlign: 'center',
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontSize: 16,
  },
});