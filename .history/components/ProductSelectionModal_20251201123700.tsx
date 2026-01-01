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

  // Category colors for consistent styling
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

  // Filter products based on search query and category - FIXED VERSION
  useEffect(() => {
    let filtered = products;

    // Apply category filter
    if (selectedCategory !== 'all') {
      const selectedCategoryName = getCategoryNameById(selectedCategory);
      console.log(`🎯 Filtering by category: ${selectedCategoryName} (ID: ${selectedCategory})`);
      
      filtered = filtered.filter(product => {
        const productCategories = getProductCategories(product);
        const matches = productCategories.some(productCat => 
          productCat === selectedCategoryName
        );
        
        return matches;
      });

      console.log(`📊 After category filter: ${filtered.length} products`);
    }

    // Apply search filter
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getProductCategories(product).some(cat => 
          cat.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
      console.log(`📊 After search filter: ${filtered.length} products`);
    }

    console.log(`🎯 Final filtered results: ${filtered.length} products`);
    setFilteredProducts(filtered);
  }, [searchQuery, selectedCategory, products, categories]);

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

      // Normalize product categories
      const normalizedProducts = productsData.map((product: any) => {
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

        return {
          ...product,
          categories: categories,
          primaryCategory: product.primaryCategory || categories[0],
        };
      });

      console.log('✅ ProductSelectionModal: Products fetched successfully', normalizedProducts.length);
      
      // Debug: log all products and their categories
      normalizedProducts.forEach((product: Product, index: number) => {
        console.log(`📦 Product ${index + 1}: ${product.name}`);
        console.log(`   - Categories:`, getProductCategories(product));
      });
      
      setProducts(normalizedProducts);
      
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

      console.log('✅ ProductSelectionModal: Categories fetched successfully', categoriesData.length);
      
      // Debug: log all categories
      categoriesData.forEach((category: Category, index: number) => {
        console.log(`🏷️ Category ${index + 1}: ${category.name} (ID: ${category.id})`);
      });
      
      setCategories(categoriesData);
      
    } catch (error) {
      console.error('❌ ProductSelectionModal: Error fetching categories:', error);
    } finally {
      setCategoriesLoading(false);
    }
  };

  // Get all categories for a product (supports multiple categories)
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

  // Get color for a category
  const getCategoryColor = (categoryName: string): string => {
    if (categoryColors[categoryName]) {
      return categoryColors[categoryName];
    }
    
    // Try to find color from categories data
    const categoryFromData = categories.find(cat => cat.name === categoryName);
    if (categoryFromData?.color) {
      return categoryFromData.color;
    }
    
    // Generate consistent color based on category name for custom categories
    const customCategoryColors = [
      '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#10b981',
      '#3b82f6', '#f97316', '#84cc16', '#ec4899', '#6366f1'
    ];
    const index = categoryName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return customCategoryColors[index % customCategoryColors.length];
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

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
  };

  const hasActiveFilters = searchQuery !== '' || selectedCategory !== 'all';

  // Get category name by ID - FIXED VERSION
  const getCategoryNameById = (categoryId: string): string => {
    if (categoryId === 'all') return 'All';
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || categoryId;
  };

  // Debug function to check category matching
  const debugCategoryMatching = () => {
    if (selectedCategory !== 'all') {
      const selectedCategoryName = getCategoryNameById(selectedCategory);
      console.log('🔍 DEBUG Category Matching:');
      console.log('Selected Category:', selectedCategoryName, '(ID:', selectedCategory + ')');
      
      products.forEach((product, index) => {
        const productCategories = getProductCategories(product);
        const matches = productCategories.some(cat => cat === selectedCategoryName);
        console.log(`Product ${index + 1}: ${product.name}`);
        console.log('  - Product Categories:', productCategories);
        console.log('  - Matches Selected:', matches);
      });
    }
  };

  // Call debug when category changes
  useEffect(() => {
    if (selectedCategory !== 'all') {
      debugCategoryMatching();
    }
  }, [selectedCategory, products]);

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
                                backgroundColor: getCategoryColor(category.name),
                                borderColor: getCategoryColor(category.name)
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
                  </View>
                ) : filteredProducts.length > 0 ? (
                  <FlatList
                    data={filteredProducts}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={true}
                    style={styles.productsList}
                    contentContainerStyle={styles.productsListContent}
                    renderItem={({ item }) => {
                      const isSelected = selectedProductIds.includes(item.id);
                      const currentStock = getProductStock(item);
                      const stockStatus = getStockStatus(currentStock);
                      const isDisabled = isSelected || (movementType === 'distribution' && currentStock === 0);
                      const primaryCategory = getPrimaryCategory(item);
                      const categoryColor = getCategoryColor(primaryCategory);
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
                                    { backgroundColor: getCategoryColor(category) }
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
  borderTopLeftRadius: 16, // Smaller curve
  borderTopRightRadius: 16, // Smaller curve
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
    // Add top padding to account for curved corners
    
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
    // Ensure the bottom content also respects the curved top
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  productsList: {
    flex: 1,
  },
  productsListContent: {
    paddingBottom: 20,
    // Add top padding to ensure content doesn't get cut off by curved corners
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