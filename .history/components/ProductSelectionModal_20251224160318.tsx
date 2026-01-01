// components/ProductSelectionModal.tsx
import { getCategories, getProducts } from '@/app/api';
import { getCategoryColor, getCategoryIcon } from '@/constants/categoryColors';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
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
  categories?: string[];
  primaryCategory?: string;
  lastUpdated?: number; // Add timestamp for caching
}

interface Category {
  id: string;
  name: string;
  color?: string;
}

interface ProductSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (product: Product) => void;
  onAddProduct: () => void;
  movementType: 'stock_in' | 'distribution';
  selectedProductIds: string[];
  // Optional: Pass pre-loaded products from parent
  initialProducts?: Product[];
  initialCategories?: Category[];
}

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

export default function ProductSelectionModal({
  visible,
  onClose,
  onSelect,
  onAddProduct,
  movementType,
  selectedProductIds,
  initialProducts = [],
  initialCategories = [],
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
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<string>('');

  // Refs to track cache state (proper React pattern instead of global variables)
  const cacheRef = useRef<{
    products: Product[];
    categories: Category[];
    lastFetchTime: number;
    isFetching: boolean;
  }>({
    products: [],
    categories: [],
    lastFetchTime: 0,
    isFetching: false,
  });

  // Initialize with initial data if provided
  useEffect(() => {
    if (initialProducts.length > 0 && cacheRef.current.products.length === 0) {
      cacheRef.current.products = initialProducts;
    }
    if (initialCategories.length > 0 && cacheRef.current.categories.length === 0) {
      cacheRef.current.categories = initialCategories;
    }
  }, [initialProducts, initialCategories]);

  // Smart data loading function
  const loadData = useCallback(async (forceRefresh: boolean = false) => {
    const now = Date.now();
    const cache = cacheRef.current;
    const isCacheValid = !forceRefresh && 
                        (now - cache.lastFetchTime < CACHE_DURATION) && 
                        cache.products.length > 0;

    // If cache is valid and not forcing refresh, use cached data
    if (isCacheValid && !forceRefresh) {
      setProducts(cache.products);
      setCategories(cache.categories);
      updateLastRefreshTime();
      return;
    }

    // Otherwise, fetch fresh data
    if (cache.isFetching && !forceRefresh) {
      return;
    }

    cache.isFetching = true;
    
    try {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      console.log('🔄 Fetching fresh data...');
      
      // Fetch in parallel
      const [productsResponse, categoriesResponse] = await Promise.allSettled([
        getProducts(),
        getCategories()
      ]);

      // Process products
      let productsData: Product[] = [];
      if (productsResponse.status === 'fulfilled') {
        const response = productsResponse.value;
        if (response.data && response.data.success && response.data.data) {
          productsData = response.data.data;
        } else if (response.data && Array.isArray(response.data)) {
          productsData = response.data;
        } else if (response.data) {
          productsData = response.data;
        } else if (Array.isArray(response)) {
          productsData = response;
        }

        // Add timestamp to each product
        productsData = productsData.map((product: any) => ({
          ...product,
          lastUpdated: now,
        }));

        // Update cache
        cacheRef.current.products = productsData;
        cacheRef.current.lastFetchTime = now;
        setProducts(productsData);
      }

      // Process categories
      let categoriesData: Category[] = [];
      if (categoriesResponse.status === 'fulfilled') {
        const response = categoriesResponse.value;
        if (response.data && response.data.success && response.data.data) {
          categoriesData = response.data.data;
        } else if (response.data && Array.isArray(response.data)) {
          categoriesData = response.data;
        } else if (response.data) {
          categoriesData = response.data;
        } else if (Array.isArray(response)) {
          categoriesData = response;
        }

        // Update cache
        cacheRef.current.categories = categoriesData;
        setCategories(categoriesData);
      }

      updateLastRefreshTime();

    } catch (error) {
      console.error('❌ Error loading data:', error);
      
      // Fallback to cached data if available
      if (cacheRef.current.products.length > 0) {
        setProducts(cacheRef.current.products);
        setCategories(cacheRef.current.categories);
      }
    } finally {
      cacheRef.current.isFetching = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Load data when modal opens
  useEffect(() => {
    if (visible) {
      loadData();
      // Reset filters when modal opens
      setSearchQuery('');
      setSelectedCategory('all');
    }
  }, [visible, loadData]);

  // Manual refresh function
  const handleManualRefresh = useCallback(async () => {
    await loadData(true);
  }, [loadData]);

  // Update last refresh time display
  const updateLastRefreshTime = () => {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    setLastRefreshTime(`Last updated: ${timeString}`);
  };

  // Filter products based on search query and category
  useEffect(() => {
    let filtered = products;

    // Apply category filter
    if (selectedCategory !== 'all') {
      const selectedCategoryName = getCategoryNameById(selectedCategory);
      filtered = filtered.filter(product => {
        const productCategories = getProductCategories(product);
        return productCategories.some(productCat => 
          productCat === selectedCategoryName
        );
      });
    }

    // Apply search filter
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getProductCategories(product).some(cat => 
          cat.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    setFilteredProducts(filtered);
  }, [searchQuery, selectedCategory, products, categories]);

  // Get all categories for a product
  const getProductCategories = (product: Product): string[] => {
    if (product.categories && Array.isArray(product.categories)) {
      return product.categories.filter(cat => cat && cat.trim() !== '');
    }
    if (product.category && product.category.trim() !== '') {
      return [product.category];
    }
    if (product.primaryCategory && product.primaryCategory.trim() !== '') {
      return [product.primaryCategory];
    }
    return ["Other"];
  };

  // Get primary category for display
  const getPrimaryCategory = (product: Product): string => {
    const categories = getProductCategories(product);
    return categories[0] || "Other";
  };

  // Get color for a category (using shared helper)
  const getCategoryColorForProduct = useCallback((categoryName: string): string => {
    // Try to find color from categories data first
    const categoryFromData = categories.find(cat => cat.name === categoryName);
    if (categoryFromData?.color) {
      return categoryFromData.color;
    }
    // Fallback to shared helper
    return getCategoryColor(categoryName);
  }, [categories]);

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
      movementType: movementType,
      categories: getProductCategories(product)
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


  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
  };

  const hasActiveFilters = searchQuery !== '' || selectedCategory !== 'all';

  // Get category name by ID
  const getCategoryNameById = (categoryId: string): string => {
    if (categoryId === 'all') return 'All';
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || categoryId;
  };

  // Calculate cache age
  const getCacheAge = useCallback((): string => {
    const lastFetch = cacheRef.current.lastFetchTime;
    if (lastFetch === 0) return 'Never';
    
    const ageMs = Date.now() - lastFetch;
    const minutes = Math.floor(ageMs / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 minute ago';
    if (minutes < 60) return `${minutes} minutes ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return '1 hour ago';
    return `${hours} hours ago`;
  }, []);

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
            {/* Full Screen Modal Container */}
            <View style={styles.fullScreenModal}>
              
              {/* Header with Refresh Button */}
              <View style={styles.header}>
                <View style={styles.headerContent}>
                  <View style={styles.headerTopRow}>
                    <View style={styles.headerTitleContainer}>
                      <Ionicons name="cube-outline" size={24} color={isDarkMode ? "#f1f5f9" : "#1e293b"} />
                      <Text style={styles.headerTitle}>Select Product</Text>
                    </View>
                    <TouchableOpacity 
                      onPress={handleManualRefresh}
                      style={styles.refreshButton}
                      disabled={refreshing}
                    >
                      {refreshing ? (
                        <ActivityIndicator size="small" color="#6366f1" />
                      ) : (
                        <Ionicons 
                          name="refresh" 
                          size={20} 
                          color={isDarkMode ? "#94a3b8" : "#64748b"} 
                        />
                      )}
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.headerSubtitle}>
                    {lastRefreshTime || 'Loading...'}
                    {cacheRef.current.products.length > 0 && (
                      <Text style={styles.cacheInfo}> • Cache: {getCacheAge()}</Text>
                    )}
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={onClose}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color={isDarkMode ? "#94a3b8" : "#64748b"} />
                </TouchableOpacity>
              </View>

              {/* Search and Filters Section */}
              <View style={styles.filtersSection}>
                {/* Search Bar */}
                <View style={styles.searchSection}>
                  <View style={styles.searchContainer}>
                    <View style={styles.searchIconContainer}>
                      <Ionicons name="search" size={20} color={isDarkMode ? "#94a3b8" : "#64748b"} />
                    </View>
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search products or categories..."
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
                        contentContainerStyle={styles.categoriesScrollContainer}
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
                              selectedCategory === category.id && styles.categoryChipSelected,
                              selectedCategory === category.id && { 
                                backgroundColor: getCategoryColorForProduct(category.name),
                                borderColor: getCategoryColorForProduct(category.name)
                              }
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
                      {selectedCategory !== 'all' && 
                        ` in ${getCategoryNameById(selectedCategory)}`
                      }
                    </Text>
                    <TouchableOpacity onPress={clearFilters} style={styles.clearFiltersButton}>
                      <Text style={styles.clearFiltersText}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Products List Section */}
              <View style={styles.productsSection}>
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366f1" />
                    <Text style={styles.loadingText}>Loading products...</Text>
                    {cachedProducts.length > 0 && (
                      <TouchableOpacity 
                        onPress={() => {
                          setProducts(cachedProducts);
                          setCategories(cachedCategories);
                          setLoading(false);
                        }}
                        style={styles.useCacheButton}
                      >
                        <Text style={styles.useCacheButtonText}>Use cached data</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : filteredProducts.length > 0 ? (
                  <FlatList
                    data={filteredProducts}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={true}
                    style={styles.productsList}
                    contentContainerStyle={styles.productsListContent}
                    refreshControl={
                      <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleManualRefresh}
                        colors={['#6366f1']}
                        tintColor="#6366f1"
                      />
                    }
                    renderItem={({ item }) => {
                      const isSelected = selectedProductIds.includes(item.id);
                      const currentStock = getProductStock(item);
                      const stockStatus = getStockStatus(currentStock);
                      const isDisabled = isSelected || (movementType === 'distribution' && currentStock === 0);
                      const primaryCategory = getPrimaryCategory(item);
                      const categoryColor = getCategoryColorForProduct(primaryCategory);
                      const allCategories = getProductCategories(item);
                      
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
                          {/* Category Icon with Color */}
                          <View style={[
                            styles.productIcon,
                            { backgroundColor: categoryColor }
                          ]}>
                            <Text style={styles.categoryIconText}>
                              {getCategoryIcon(primaryCategory)}
                            </Text>
                          </View>
                          
                          <View style={styles.productInfo}>
                            <Text style={[
                              styles.productName,
                              isSelected && styles.productNameSelected,
                              isDisabled && styles.productNameDisabled
                            ]}>
                              {item.name}
                            </Text>
                            
                            {/* Categories Display */}
                            <View style={styles.categoriesTagsContainer}>
                              {allCategories.slice(0, 2).map((category, index) => (
                                <View 
                                  key={category} 
                                  style={[
                                    styles.categoryTag,
                                    { backgroundColor: getCategoryColorForProduct(category) }
                                  ]}
                                >
                                  <Text style={styles.categoryTagText}>
                                    {index === 0 && "🏠 "}{category}
                                  </Text>
                                </View>
                              ))}
                              {allCategories.length > 2 && (
                                <View style={styles.moreCategoriesTag}>
                                  <Text style={styles.moreCategoriesText}>
                                    +{allCategories.length - 2}
                                  </Text>
                                </View>
                              )}
                            </View>

                            <View style={styles.productStockInfo}>
                              <Text style={styles.stockLabel}>Current stock:</Text>
                              <Text style={[
                                styles.stockValue,
                                { color: stockStatus.color }
                              ]}>
                                {currentStock} {item.unit || 'units'}
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
                  />
                ) : (
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
                    {!hasActiveFilters && (
                      <TouchableOpacity onPress={handleAddProduct} style={styles.emptyStateButton}>
                        <Text style={styles.emptyStateButtonText}>Add New Product</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
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
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  fullScreenModal: {
    flex: 1,
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    marginTop: Platform.OS === 'ios' ? 40 : 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "#334155" : "#e2e8f0",
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
  },
  headerContent: {
    flex: 1,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
  },
  refreshButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: isDarkMode ? "#334155" : "#f1f5f9",
  },
  headerSubtitle: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    marginTop: 4,
  },
  cacheInfo: {
    fontSize: 12,
    color: isDarkMode ? "#64748b" : "#94a3b8",
    fontStyle: 'italic',
  },
  closeButton: {
    padding: 4,
    marginTop: 4,
  },
  filtersSection: {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "#334155" : "#e2e8f0",
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
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? "#94a3b8" : "#64748b",
    marginBottom: 12,
  },
  categoriesScrollContainer: {
    gap: 8,
    paddingRight: 16,
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
    borderTopWidth: 1,
    borderTopColor: isDarkMode ? "#475569" : "#e2e8f0",
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
    backgroundColor: isDarkMode ? "#0f172a" : "#f8fafc",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  productsList: {
    flex: 1,
  },
  productsListContent: {
    paddingBottom: 20,
    paddingTop: 8,
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
  useCacheButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: isDarkMode ? "#334155" : "#f1f5f9",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#e2e8f0",
  },
  useCacheButtonText: {
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontSize: 14,
    fontWeight: '500',
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "#334155" : "#e2e8f0",
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    minHeight: 100,
    marginHorizontal: 1,
    marginBottom: 1,
  },
  productCardSelected: {
    backgroundColor: isDarkMode ? "#374151" : "#f8fafc",
  },
  productCardDisabled: {
    opacity: 0.6,
  },
  productIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryIconText: {
    fontSize: 20,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 6,
  },
  productNameSelected: {
    color: '#10b981',
  },
  productNameDisabled: {
    color: isDarkMode ? "#64748b" : "#94a3b8",
  },
  categoriesTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ffffff',
  },
  moreCategoriesTag: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: isDarkMode ? "#475569" : "#cbd5e1",
  },
  moreCategoriesText: {
    fontSize: 12,
    fontWeight: '500',
    color: isDarkMode ? "#cbd5e1" : "#475569",
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
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