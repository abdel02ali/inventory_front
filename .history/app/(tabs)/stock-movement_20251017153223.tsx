// app/stock-movement.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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
import { stockMovementService } from '../../services/stockMovmentService';
import { useAppContext } from '../context/appContext';

type Department = 'pastry' | 'bakery' | 'cleaning' | 'magazin';
type MovementType = 'stock_in' | 'distribution';

type ProductSelection = {
  productId: string;
  productName: string;
  quantity: string;
  unit: string;
};

export default function StockMovementScreen() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const router = useRouter();
  const { products, refreshProducts } = useAppContext();
  
  const [movementType, setMovementType] = useState<MovementType>('stock_in');
  const [selectedDepartment, setSelectedDepartment] = useState<Department>('pastry');
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<ProductSelection[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Dropdown states
  const [productDropdownVisible, setProductDropdownVisible] = useState(false);
  const [activeProductIndex, setActiveProductIndex] = useState<number | null>(null);
  const [departmentDropdownVisible, setDepartmentDropdownVisible] = useState(false);
  
  // Search state
  const [productSearch, setProductSearch] = useState('');

  const styles = getStyles(isDarkMode);

  // Department configuration
  const departments: { key: Department; label: string; icon: string; color: string }[] = [
    { key: 'pastry', label: 'Pastry', icon: '🥐', color: '#f59e0b' },
    { key: 'bakery', label: 'Bakery', icon: '🍞', color: '#84cc16' },
    { key: 'cleaning', label: 'Cleaning', icon: '🧹', color: '#06b6d4' },
    { key: 'magazin', label: 'Office', icon: '👔', color: '#8b5cf6' },
  ];

  // Available products from context
  const availableProducts = products || [];
  
  // 🔄 Auto-refresh products when dropdown opens - FIXED
  useEffect(() => {
    console.log('🔄 useEffect triggered for product dropdown:', productDropdownVisible);
    if (productDropdownVisible) {
      console.log('📦 Refreshing products for dropdown...');
      refreshProducts();
    }
  }, [productDropdownVisible]);

  // Helper function to get actual stock (handles both q and quantity fields)
  const getProductStock = (product: any) => {
    return product.quantity !== undefined ? product.quantity : product.q || 0;
  };

  const filteredProducts = availableProducts.filter(product =>
    product.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const addProduct = () => {
    setSelectedProducts([
      ...selectedProducts,
      { productId: '', productName: '', quantity: '', unit: '' }
    ]);
  };

  const updateProduct = (index: number, field: keyof ProductSelection, value: string) => {
    const updated = [...selectedProducts];
    
    if (field === 'quantity') {
      // Only allow numbers and empty string
      const numericValue = value.replace(/[^0-9]/g, '');
      updated[index] = { ...updated[index], [field]: numericValue };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    
    if (field === 'productId' && value) {
      const selectedProduct = availableProducts.find(p => p.id === value);
      if (selectedProduct) {
        updated[index].productName = selectedProduct.name;
        updated[index].unit = String(selectedProduct.unit || 'units');
        
        // If this is a stock_in movement, pre-fill a default quantity
        if (movementType === 'stock_in' && !updated[index].quantity) {
          updated[index].quantity = '1';
        }
      }
    }
    
    setSelectedProducts(updated);
  };

  const removeProduct = (index: number) => {
    const updated = selectedProducts.filter((_, i) => i !== index);
    setSelectedProducts(updated);
  };

  // Product dropdown functions - FIXED
  const openProductDropdown = async (index: number) => {
    console.log("📦 Opening product dropdown for index:", index);
    
    // Refresh products BEFORE opening modal
    try {
      await refreshProducts();
      console.log("✅ Products refreshed before opening dropdown");
    } catch (error) {
      console.log("❌ Error refreshing products:", error);
    }
    
    setActiveProductIndex(index);
    setProductSearch('');
    setProductDropdownVisible(true);
  };

  const closeProductDropdown = () => {
    console.log("❌ Closing product dropdown");
    setProductDropdownVisible(false);
    setActiveProductIndex(null);
    setProductSearch('');
  };

  const selectProduct = (product: any) => {
    if (activeProductIndex !== null) {
      const updated = [...selectedProducts];
      updated[activeProductIndex] = {
        productId: product.id,
        productName: product.name,
        quantity: updated[activeProductIndex].quantity || (movementType === 'stock_in' ? '1' : ''),
        unit: String(product.unit || 'units')
      };
      
      setSelectedProducts(updated);
      closeProductDropdown();
    }
  };

  // Department selection
  const openDepartmentDropdown = () => {
    setDepartmentDropdownVisible(true);
  };

  const selectDepartment = (department: Department) => {
    setSelectedDepartment(department);
    setDepartmentDropdownVisible(false);
  };

  // Add new product navigation
  const navigateToAddProduct = () => {
    closeProductDropdown();
    router.push('/details/add-product');
  };

  const handleSubmit = async () => {
    if (selectedProducts.length === 0) {
      Alert.alert('Error', 'Please add at least one product');
      return;
    }

    const invalidProducts = selectedProducts.filter(product => 
      !product.productId || !product.quantity || parseInt(product.quantity) <= 0
    );

    if (invalidProducts.length > 0) {
      Alert.alert('Error', 'Please fill all product fields with valid quantities');
      return;
    }

    if (movementType === 'stock_in' && !supplier.trim()) {
      Alert.alert('Error', 'Please enter supplier name for stock in');
      return;
    }

    if (movementType === 'distribution' && !selectedDepartment) {
      Alert.alert('Error', 'Please select a department for distribution');
      return;
    }

    setIsSubmitting(true);

    try {
      const movementData = {
        type: movementType,
        department: movementType === 'distribution' ? selectedDepartment : undefined,
        supplier: movementType === 'stock_in' ? supplier.trim() : undefined,
        stockManager: 'Ahmed',
        notes: notes.trim() || undefined,
        products: selectedProducts.map(product => ({
          productId: product.productId,
          productName: product.productName,
          quantity: parseInt(product.quantity),
          unit: product.unit
        }))
      };

      const result = await stockMovementService.createMovement(movementData);

      if (result.success) {
        // Auto-refresh products after successful submission
        await refreshProducts();
        
        Alert.alert(
          'Success!',
          result.message || 'Stock movement created successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                setSelectedProducts([]);
                setSupplier('');
                setNotes('');
                setMovementType('stock_in');
                setSelectedDepartment('pastry');
                router.back();
              }
            }
          ]
        );
      } else {
        if (result.errors && result.errors.length > 0) {
          Alert.alert('Validation Error', result.errors.join('\n'));
        } else {
          Alert.alert('Error', result.message || 'Failed to create stock movement. Please try again.');
        }
      }
    } catch (error: any) {
      Alert.alert(
        'Network Error', 
        error.message || 'Failed to connect to server. Please check your internet connection and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get selected department info
  const selectedDeptInfo = departments.find(dept => dept.key === selectedDepartment);

  // Product Dropdown Modal - USING INVOICE SCREEN DESIGN
  const ProductDropdownModal = () => (
    <Modal
      visible={productDropdownVisible}
      transparent
      animationType="fade"
      onRequestClose={closeProductDropdown}
    >
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1}
        onPress={closeProductDropdown}
      >
        <View style={styles.dropdownList}>
          <Text style={styles.dropdownTitle}>
            Select Product ({filteredProducts.length})
          </Text>
          
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
              placeholderTextColor={isDarkMode ? "#94a3b8" : "#9ca3af"}
              value={productSearch}
              onChangeText={setProductSearch}
              autoFocus
            />
          </View>

          {filteredProducts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                {productSearch ? "No products found" : "No products available"}
              </Text>
              <Text style={styles.emptySubText}>
                {productSearch ? "Try a different search term" : "Add a new product to get started"}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredProducts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isSelected = selectedProducts.some(p => p.productId === item.id);
                const currentStock = getProductStock(item);
                
                return (
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => selectProduct(item)}
                    disabled={isSelected}
                  >
                    <View style={styles.dropdownItemContent}>
                      <Text style={[
                        styles.dropdownItemText,
                        isSelected && styles.dropdownItemTextSelected
                      ]}>
                        {item.name}
                        {` - ${item.price || 0} MAD`}
                      </Text>
                      <Text style={[
                        styles.stockBadge,
                        { 
                          color: currentStock === 0 ? '#ef4444' : 
                                 currentStock <= 10 ? '#f59e0b' : '#10b981'
                        }
                      ]}>
                        Stock: {currentStock}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark" size={20} color="#10b981" />
                    )}
                  </TouchableOpacity>
                );
              }}
              style={styles.dropdownFlatList}
            />
          )}

          {/* Add New Product Button */}
          <TouchableOpacity 
            style={styles.addNewButton}
            onPress={navigateToAddProduct}
          >
            <Text style={styles.addNewButtonText}>+ Add New Product</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.dropdownClose} 
            onPress={closeProductDropdown}
          >
            <Text style={styles.dropdownCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // Department Dropdown Modal - USING INVOICE SCREEN DESIGN
  const DepartmentDropdownModal = () => (
    <Modal
      visible={departmentDropdownVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setDepartmentDropdownVisible(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1}
        onPress={() => setDepartmentDropdownVisible(false)}
      >
        <View style={styles.dropdownList}>
          <Text style={styles.dropdownTitle}>
            Select Department ({departments.length})
          </Text>
          
          <FlatList
            data={departments}
            keyExtractor={(item) => item.key}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => selectDepartment(item.key)}
              >
                <View style={styles.dropdownItemContent}>
                  <Text style={styles.dropdownItemText}>
                    {item.icon} {item.label}
                  </Text>
                </View>
                {selectedDepartment === item.key && (
                  <Ionicons name="checkmark" size={20} color="#10b981" />
                )}
              </TouchableOpacity>
            )}
            style={styles.dropdownFlatList}
          />
          
          <TouchableOpacity 
            style={styles.dropdownClose} 
            onPress={() => setDepartmentDropdownVisible(false)}
          >
            <Text style={styles.dropdownCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          style={styles.container} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add Stock Movement</Text>
            <Text style={styles.headerSubtitle}>Manage inventory movements</Text>
          </View>

          <View style={styles.content}>
            {/* Movement Type Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Movement Type</Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    movementType === 'stock_in' && styles.typeButtonActive
                  ]}
                  onPress={() => setMovementType('stock_in')}
                >
                  <Text style={[
                    styles.typeButtonText,
                    movementType === 'stock_in' && styles.typeButtonTextActive
                  ]}>
                    📥 Stock In
                  </Text>
                  <Text style={styles.typeDescription}>Add products to inventory</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    movementType === 'distribution' && styles.typeButtonActive
                  ]}
                  onPress={() => setMovementType('distribution')}
                >
                  <Text style={[
                    styles.typeButtonText,
                    movementType === 'distribution' && styles.typeButtonTextActive
                  ]}>
                    📤 Distribution
                  </Text>
                  <Text style={styles.typeDescription}>Distribute to departments</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Department Selection (only for distributions) */}
            {movementType === 'distribution' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Select Department</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={openDepartmentDropdown}
                >
                  <View style={styles.dropdownButtonContent}>
                    <Text style={selectedDeptInfo ? styles.dropdownButtonText : styles.dropdownButtonPlaceholder}>
                      {selectedDeptInfo ? `${selectedDeptInfo.icon} ${selectedDeptInfo.label}` : "Choose a department..."}
                    </Text>
                  </View>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Supplier (only for stock in) */}
            {movementType === 'stock_in' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Supplier Information</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter supplier name"
                  placeholderTextColor={isDarkMode ? "#94a3b8" : "#9ca3af"}
                  value={supplier}
                  onChangeText={setSupplier}
                />
              </View>
            )}

            {/* Products Section Header */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Products</Text>
                  <Text style={styles.sectionSubtitle}>
                    {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected
                  </Text>
                </View>
              </View>

              {/* Products List */}
              {selectedProducts.map((product, index) => {
                const currentStock = product.productId ? getProductStock(availableProducts.find(p => p.id === product.productId)) : 0;
                const stockInfo = product.productId ? getStockStatus(currentStock, parseInt(product.quantity)) : null;
                
                return (
                  <View key={index} style={styles.productCard}>
                    <View style={styles.productHeader}>
                      <Text style={styles.productNumber}>Product {index + 1}</Text>
                      <TouchableOpacity 
                        style={styles.deleteButton}
                        onPress={() => removeProduct(index)}
                      >
                        <Ionicons name="trash-outline" size={18} color="#ef4444" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.productForm}>
                      {/* Product Selection Dropdown */}
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Product *</Text>
                        <TouchableOpacity
                          style={styles.dropdownButton}
                          onPress={() => openProductDropdown(index)}
                        >
                          <View style={styles.dropdownButtonContent}>
                            <Text style={[
                              product.productName ? styles.dropdownButtonText : styles.dropdownButtonPlaceholder
                            ]}>
                              {product.productName || 'Select a product'}
                            </Text>
                            {product.productName && stockInfo && (
                              <Text style={[styles.stockStatus, { color: stockInfo.color }]}>
                                {stockInfo.text}
                              </Text>
                            )}
                          </View>
                          <Text style={styles.dropdownArrow}>▼</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.productRow}>
                        {/* Quantity Input */}
                        <View style={[styles.inputGroup, styles.quantityInput]}>
                          <Text style={styles.inputLabel}>
                            Quantity * {product.productId && (
                              <Text style={styles.currentStockInfo}>
                                (Current: {currentStock})
                              </Text>
                            )}
                          </Text>
                          <TextInput
                            style={styles.textInput}
                            placeholder="0"
                            placeholderTextColor={isDarkMode ? "#94a3b8" : "#9ca3af"}
                            keyboardType="numeric"
                            value={product.quantity}
                            onChangeText={(value) => updateProduct(index, 'quantity', value)}
                          />
                          {product.productId && stockInfo && (
                            <Text style={[styles.stockHint, { color: stockInfo.color }]}>
                              {stockInfo.text}
                            </Text>
                          )}
                        </View>

                        {/* Unit Display (read-only) */}
                        <View style={[styles.inputGroup, styles.unitInput]}>
                          <Text style={styles.inputLabel}>Unit</Text>
                          <View style={styles.unitDisplay}>
                            <Text style={styles.unitText}>{product.unit || '-'}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}

              {/* Add Product Button */}
              <TouchableOpacity 
                style={styles.addProductButton}
                onPress={addProduct}
              >
                <Ionicons name="add-circle-outline" size={20} color="#6366f1" />
                <Text style={styles.addProductButtonText}>Add Product</Text>
              </TouchableOpacity>

              {selectedProducts.length === 0 && (
                <View style={styles.emptyProducts}>
                  <Ionicons name="cube-outline" size={48} color={isDarkMode ? "#475569" : "#cbd5e1"} />
                  <Text style={styles.emptyProductsText}>No products added</Text>
                  <Text style={styles.emptyProductsSubtext}>
                    Add products to continue
                  </Text>
                </View>
              )}
            </View>

            {/* Notes */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notes (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Add any notes about this movement..."
                placeholderTextColor={isDarkMode ? "#94a3b8" : "#9ca3af"}
                multiline
                numberOfLines={3}
                value={notes}
                onChangeText={setNotes}
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                isSubmitting && styles.submitButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  Confirm {movementType === 'stock_in' ? 'Stock In' : 'Distribution'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Dropdown Modals */}
          <ProductDropdownModal />
          <DepartmentDropdownModal />
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );

  // Helper function for stock status
  function getStockStatus(stock: number, quantity: number) {
    if (stock === 0) return { color: '#ef4444', text: 'Out of Stock' };
    if (quantity > stock) return { color: '#f59e0b', text: `Insufficient: ${stock} available` };
    if (stock <= 10) return { color: '#f59e0b', text: `Low Stock: ${stock} left` };
    return { color: '#10b981', text: `In Stock: ${stock} available` };
  }
}

// Styles using the same design as invoice screen
const getStyles = (isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDarkMode ? "#121212" : "#f8fafc",
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#f1ac63ff',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#e0e7ff',
    opacity: 0.9,
    textAlign: 'center',
  },
  content: {
    padding: 16,
    flex: 1,
  },
  section: {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: isDarkMode ? "#334155" : "#e2e8f0",
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: isDarkMode ? "#475569" : "#e2e8f0",
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: isDarkMode ? "#a39930ff" : "#e0e7ff",
    borderColor: '#63f17bff',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: isDarkMode ? "#94a3b8" : "#64748b",
    marginBottom: 4,
  },
  typeButtonTextActive: {
    color: '#f16363ff',
  },
  typeDescription: {
    fontSize: 12,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    textAlign: 'center',
  },
  // Dropdown Styles
  dropdownButton: {
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center",
    borderWidth: 1, 
    borderColor: isDarkMode ? "#334155" : "#cbd5e1", 
    borderRadius: 8, 
    padding: 12,
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff", 
    marginBottom: 12,
  },
  dropdownButtonContent: {
    flex: 1,
  },
  dropdownButtonText: { 
    color: isDarkMode ? "#f8fafc" : "#1e293b", 
    fontSize: 14 
  },
  dropdownButtonPlaceholder: { 
    color: isDarkMode ? "#94a3b8" : "#9ca3af", 
    fontSize: 14 
  },
  dropdownArrow: { 
    color: isDarkMode ? "#60a5fa" : "#3b82f6", 
    fontSize: 12 
  },
  textInput: {
    backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#cbd5e1",
    borderRadius: 8,
    padding: 12,
    color: isDarkMode ? "#f8fafc" : "#1e293b",
    fontSize: 14,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  // Products Section
  productCard: {
    backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#e2e8f0",
    marginBottom: 12,
    borderLeftWidth: 3, 
    borderLeftColor: isDarkMode ? "#60a5fa" : "#3b82f6",
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  productNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
  },
  deleteButton: {
    padding: 4,
  },
  productForm: {
    gap: 12,
  },
  productRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    flex: 1,
  },
  quantityInput: {
    flex: 2,
  },
  unitInput: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? "#94a3b8" : "#64748b",
    marginBottom: 8,
  },
  currentStockInfo: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  stockStatus: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  stockHint: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  // Unit Display
  unitDisplay: {
    backgroundColor: isDarkMode ? "#475569" : "#e2e8f0",
    borderWidth: 1,
    borderColor: isDarkMode ? "#64748b" : "#cbd5e1",
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
  },
  unitText: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontWeight: '500',
    textAlign: 'center',
  },
  // Add Product Button
  addProductButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
    borderWidth: 2,
    borderColor: isDarkMode ? "#475569" : "#e2e8f0",
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  addProductButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
    marginLeft: 8,
  },
  emptyProducts: {
    alignItems: 'center',
    padding: 40,
  },
  emptyProductsText: {
    fontSize: 16,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    marginTop: 12,
    fontWeight: '600',
  },
  emptyProductsSubtext: {
    fontSize: 14,
    color: isDarkMode ? "#64748b" : "#94a3b8",
    marginTop: 4,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: '#6366f1',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 24,
  },
  submitButtonDisabled: {
    backgroundColor: isDarkMode ? "#374151" : "#9ca3af",
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Modal Styles - USING INVOICE SCREEN DESIGN
  modalOverlay: {
    flex: 1, 
    backgroundColor: "rgba(0, 0, 0, 0.7)", 
    justifyContent: "center",
    alignItems: "center", 
    padding: 20,
  },
  dropdownList: {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff", 
    borderRadius: 12, 
    padding: 16, 
    width: "90%",
    maxHeight: "70%", 
    borderWidth: 1, 
    borderColor: isDarkMode ? "#334155" : "#cbd5e1",
  },
  dropdownTitle: {
    color: isDarkMode ? "#60a5fa" : "#3b82f6", 
    fontSize: 16, 
    fontWeight: "bold", 
    marginBottom: 12, 
    textAlign: "center",
  },
  searchContainer: {
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: isDarkMode ? "#334155" : "#f1f5f9",
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#cbd5e1",
    borderRadius: 8,
    padding: 12,
    color: isDarkMode ? "#f8fafc" : "#1e293b",
    fontSize: 14,
  },
  dropdownFlatList: { 
    maxHeight: 300 
  },
  dropdownItem: { 
    padding: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: isDarkMode ? "#334155" : "#e2e8f0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdownItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
  },
  dropdownItemText: { 
    color: isDarkMode ? "#f8fafc" : "#1e293b", 
    fontSize: 14,
    flex: 1,
  },
  dropdownItemTextSelected: {
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  stockBadge: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: "center",
    padding: 20,
  },
  emptyText: { 
    color: isDarkMode ? "#94a3b8" : "#9ca3af", 
    textAlign: "center", 
    fontSize: 14,
    marginBottom: 4,
  },
  emptySubText: {
    color: isDarkMode ? "#6b7280" : "#9ca3af",
    textAlign: "center",
    fontSize: 12,
  },
  addNewButton: {
    backgroundColor: isDarkMode ? "#10b981" : "#059669",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  addNewButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  dropdownClose: { 
    backgroundColor: isDarkMode ? "#334155" : "#f1f5f9", 
    padding: 12, 
    borderRadius: 8, 
    alignItems: "center", 
    marginTop: 8 
  },
  dropdownCloseText: { 
    color: isDarkMode ? "#f8fafc" : "#1e293b", 
    fontWeight: "bold" 
  },
});