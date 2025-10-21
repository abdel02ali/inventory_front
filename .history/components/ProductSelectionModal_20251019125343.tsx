// components/ProductSelectionModal.tsx
import { getCategories, getProducts } from '@/app/api';
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
  category?: string;
  categoryId?: string;
}

interface Category {
  id: string;
  name: string;
}

interface ProductSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (product: Product) => void;
  onAddProduct: () => void;
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  // Fetch products and categories when modal opens
  useEffect(() => {
    if (visible) {
      fetchProducts();
      fetchCategories();
      // Reset filters when modal opens
      setSearchQuery('');
      setSelectedCategory('all');
    }
  }, [visible]);

  // Filter products based on search query and category
  useEffect(() => {
    let filtered = products;

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => 
        product.category === selectedCategory || product.categoryId === selectedCategory
      );
    }

    // Apply search filter
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  }, [searchQuery, selectedCategory, products]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      console.log('🔄 ProductSelectionModal: Fetching fresh products data...');
      
      const response = await getProducts();
      
      // Handle different response formats
      let productsData = [];
      
      if (response.data && response.data.success && response.data.data) {
        productsData = response.data.data;
      } else if (response.data && Array.isArray(response.data)) {
        productsData = response.data;
      } else if (response.data) {
        productsData = response.data;
      } else if (Array.isArray(response)) {
        productsData = response;
      } else {
        console.log('❌ ProductSelectionModal: Unexpected response format', response);
        return;
      }

      console.log('✅ ProductSelectionModal: Products fetched successfully');
      setProducts(productsData);
      
    } catch (error) {
      console.error('❌ ProductSelectionModal: Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      console.log('🔄 ProductSelectionModal: Fetching categories...');
      
      const response = await getCategories();
      
      let categoriesData = [];
      
      if (response.data && response.data.success && response.data.data) {
        categoriesData = response.data.data;
      } else if (response.data && Array.isArray(response.data)) {
        categoriesData = response.data;
      } else if (response.data) {
        categoriesData = response.data;
      } else if (Array.isArray(response)) {
        categoriesData = response;
      } else {
        console.log('❌ ProductSelectionModal: Unexpected categories format', response);
        return;
      }

      console.log('✅ ProductSelectionModal: Categories fetched successfully');
      setCategories(categoriesData);
      
    } catch (error) {
      console.error('❌ ProductSelectionModal: Error fetching categories:', error);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const getProductStock = (product: Product) => {
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
    if (stock === 0) return { text: 'Out of stock', color: '#ef4444', bgColor: isDarkMode ? '#7f1d1d' : '#fee2e2' };
    if (stock < 10) return { text: 'Low stock', color: '#f59e0b', bgColor: isDarkMode ? '#78350f' : '#fef3c7' };
    return { text: 'In stock', color: '#10b981', bgColor: isDarkMode ? '#064e3b' : '#d1fae5' };
  };

  const getProductCategory = (product: Product) => {
    return product.category || 'Uncategorized';
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
  };

  const hasActiveFilters = searchQuery !== '' || selectedCategory !== 'all';

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
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerContent}>
                  <View style={styles.headerTitleContainer}>
                    <Ionicons name="cube-outline" size={24} color={isDarkMode ? "#f1f5f9" : "#1e293b"} />
                    <Text style={styles.headerTitle}>Select Product</Text>
                  </View>
                  <Text style={styles.headerSubtitle}>
                    Choose from available products
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={onClose}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color={isDarkMode ? "#94a3b8" : "#64748b"} />
                </TouchableOpacity>
              </View>

              {/* Search Bar */}
              <View style={styles.searchSection}>
                <View style={styles.searchContainer}>
                  <View style={styles.searchIconContainer}>
                    <Ionicons name="search" size={20} color={isDarkMode ? "#94a3b8" : "#64748b"} />
                  </View>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search products..."
                    placeholderTextColor={isDarkMode ? "#94a3b8" : "#9ca3af"}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
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
                  style={styles.addButton}
                  onPress={handleAddProduct}
                >
                  <Ionicons name="add" size={20} color="#ffffff" />
                </TouchableOpacity>
              </View>

              {/* Category Filter */}
              {categories.length > 0 && (
                <View style={styles.categorySection}>
                  <Text style={styles.sectionLabel}>Categories</Text>
                  {categoriesLoading ? (
                    <ActivityIndicator size="small" color="#6366f1" />
                  ) : (
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.categoriesContainer}
                    >
                      <TouchableOpacity
                        style={[
                          styles.categoryChip,
                          selectedCategory === 'all' && styles.categoryChipSelected
                        ]}
                        onPress={() => setSelectedCategory('all')}
                      >
                        <Text style={[
                          styles.categoryChipText,
                          selectedCategory === 'all' && styles.categoryChipTextSelected
                        ]}>
                          All
                        </Text>
                      </TouchableOpacity>
                      {categories.map((category) => (
                        <TouchableOpacity
                          key={category.id}
                          style={[
                            styles.categoryChip,
                            selectedCategory === category.id && styles.categoryChipSelected
                          ]}
                          onPress={() => setSelectedCategory(category.id)}
                        >
                          <Text style={[
                            styles.categoryChipText,
                            selectedCategory === category.id && styles.categoryChipTextSelected
                          ]}>
                            {category.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              )}

              {/* Active Filters Bar */}
              {hasActiveFilters && (
                <View style={styles.activeFiltersBar}>
                  <Text style={styles.activeFiltersText}>
                    {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
                    {searchQuery && ` for "${searchQuery}"`}
                    {selectedCategory !== 'all' && categories.find(c => c.id === selectedCategory) && 
                      ` in ${categories.find(c => c.id === selectedCategory)?.name}`
                    }
                  </Text>
                  <TouchableOpacity onPress={clearFilters} style={styles.clearFiltersButton}>
                    <Text style={styles.clearFiltersText}>Clear</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Products List */}
              <View style={styles.productsSection}>
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
                      const isDisabled = isSelected || (movementType === 'distribution' && currentStock === 0);
                      
                      return (
                        <TouchableOpacity
                          style={[
                            styles.productCard,
                            isSelected && styles.productCardSelected,
                            isDisabled && styles.productCardDisabled
                          ]}
                          onPress={() => handleSelectProduct(item)}
                          disabled={isDisabled}
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
                              isSelected && styles.productNameSelected,
                              isDisabled && styles.productNameDisabled
                            ]}>
                              {item.name}
                            </Text>
                            
                            <View style={styles.productMeta}>
                              <Text style={styles.productCategory}>
                                {getProductCategory(item)}
                              </Text>
                              <Text style={styles.productUnit}>
                                • {item.unit || 'units'}
                              </Text>
                            </View>

                            <View style={styles.productStockInfo}>
                              <Text style={styles.stockLabel}>Current stock:</Text>
                              <Text style={[
                                styles.stockValue,
                                { color: stockStatus.color }
                              ]}>
                                {currentStock}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.productStatus}>
                            <View style={[styles.stockBadge, { backgroundColor: stockStatus.bgColor }]}>
                              <Text style={[styles.stockBadgeText, { color: stockStatus.color }]}>
                                {stockStatus.text}
                              </Text>
                            </View>
                            {isSelected && (
                              <Ionicons name="checkmark-circle" size={24} color="#10b981" />
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
                          {hasActiveFilters ? 'No products found' : 'No products available'}
                        </Text>
                        <Text style={styles.emptyStateText}>
                          {hasActiveFilters 
                            ? 'Try adjusting your filters or search terms'
                            : 'Add products to get started'
                          }
                        </Text>
                        {hasActiveFilters && (
                          <TouchableOpacity onPress={clearFilters} style={styles.emptyStateButton}>
                            <Text style={styles.emptyStateButtonText}>Clear Filters</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    }
                  />
                )}
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// Add ScrollView import and update the import statement
import { ScrollView } from 'react-native';

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
    maxHeight: '0%',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "#334155" : "#e2e8f0",
  },
  headerContent: {
    flex: 1,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
  },
  headerSubtitle: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  closeButton: {
    padding: 4,
    marginTop: 4,
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#e2e8f0",
  },
  searchIconContainer: {
    padding: 8,
  },
  searchInput: {
    flex: 1,
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    fontSize: 16,
    paddingVertical: 12,
  },
  clearSearchButton: {
    padding: 4,
  },
  addButton: {
    backgroundColor: '#6366f1',
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  categorySection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "#334155" : "#e2e8f0",
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? "#94a3b8" : "#64748b",
    marginBottom: 12,
  },
  categoriesContainer: {
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: isDarkMode ? "#334155" : "#f1f5f9",
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#e2e8f0",
  },
  categoryChipSelected: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  categoryChipTextSelected: {
    color: '#ffffff',
  },
  activeFiltersBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "#475569" : "#e2e8f0",
  },
  activeFiltersText: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    flex: 1,
  },
  clearFiltersButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearFiltersText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
  },
  productsSection: {
    flex: 1,
    minHeight: 200,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontSize: 14,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "#334155" : "#f1f5f9",
  },
  productCardSelected: {
    backgroundColor: isDarkMode ? "#374151" : "#f8fafc",
  },
  productCardDisabled: {
    opacity: 0.6,
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
  productNameDisabled: {
    color: isDarkMode ? "#64748b" : "#94a3b8",
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  productCategory: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
  },
  productUnit: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  productStockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stockLabel: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  stockValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  productStatus: {
    alignItems: 'flex-end',
    gap: 8,
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stockBadgeText: {
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
    marginBottom: 16,
  },
  emptyStateButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});