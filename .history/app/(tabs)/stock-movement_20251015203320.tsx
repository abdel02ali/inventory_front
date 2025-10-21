// app/stock-movement.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
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
    View
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
  const [refreshing, setRefreshing] = useState(false);

  const styles = getStyles(isDarkMode);

  // Department configuration
  const departments: { key: Department; label: string; icon: string; color: string }[] = [
    { key: 'pastry', label: 'Pastry', icon: '🥐', color: '#f59e0b' },
    { key: 'bakery', label: 'Bakery', icon: '🍞', color: '#84cc16' },
    { key: 'cleaning', label: 'Cleaning', icon: '🧹', color: '#06b6d4' },
    { key: 'magazin', label: 'Office', icon: '👔', color: '#8b5cf6' },
  ];

  // Available products from context with debugging
  const availableProducts = products || [];
  
  // 🔹 Refresh data function (same as AddInvoiceScreen)
  const refreshData = async () => {
    setRefreshing(true);
    try {
      await refreshProducts();
      console.log('✅ Products refreshed successfully');
    } catch (error) {
      console.error('❌ Error refreshing products:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // 🔹 Refresh products when dropdown opens (same pattern as AddInvoiceScreen)
  useEffect(() => {
    if (productDropdownVisible) {
      refreshProducts();
      console.log('🔄 Auto-refreshing products for dropdown');
    }
  }, [productDropdownVisible]);

  // Debug product data
  React.useEffect(() => {
    console.log('📦 Available products from context:', availableProducts.length);
    if (availableProducts.length > 0) {
      console.log('🔍 First product details:', {
        id: availableProducts[0].id,
        name: availableProducts[0].name,
        quantity: availableProducts[0].quantity,
        unit: availableProducts[0].unit,
        quantityType: typeof availableProducts[0].quantity
      });
    }
  }, [availableProducts]);

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
        console.log('🔍 Selected product details:', selectedProduct);
        updated[index].productName = selectedProduct.name;
        updated[index].unit = String(selectedProduct.unit || 'units');
        
        // If this is a stock_in movement, you might want to pre-fill a default quantity
        if (movementType === 'stock_in' && !updated[index].quantity) {
          updated[index].quantity = '1'; // Default quantity for stock in
        }
      }
    }
    
    setSelectedProducts(updated);
  };

  const removeProduct = (index: number) => {
    const updated = selectedProducts.filter((_, i) => i !== index);
    setSelectedProducts(updated);
  };

  // Product dropdown functions with auto-refresh
  const openProductDropdown = (index: number) => {
    setActiveProductIndex(index);
    setProductSearch('');
    setProductDropdownVisible(true);
    // Auto-refresh happens via useEffect above
  };

  const selectProduct = (product: any) => {
    if (activeProductIndex !== null) {
      console.log('🎯 Selecting product:', product);
      
      const updated = [...selectedProducts];
      updated[activeProductIndex] = {
        productId: product.id,
        productName: product.name,
        quantity: updated[activeProductIndex].quantity || (movementType === 'stock_in' ? '1' : ''),
        unit: String(product.unit || 'units')
      };
      
      console.log('✅ Updated product selection:', updated[activeProductIndex]);
      setSelectedProducts(updated);
      
      setProductDropdownVisible(false);
      setActiveProductIndex(null);
      setProductSearch('');
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

  // Add new product navigation with callback refresh (same as AddInvoiceScreen)
  const navigateToAddProduct = () => {
    setProductDropdownVisible(false);
    // Navigate with callback to refresh when returning
    router.push({
      pathname: "/details/add-product",
      params: { shouldRefresh: "true" }
    });
  };

  const handleSubmit = async () => {
    console.log('🔄 Starting stock movement submission...');
    console.log('📋 Selected products before submission:', selectedProducts);
    
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

      console.log('📦 Submitting movement data:', {
        ...movementData,
        products: movementData.products.map(p => ({
          ...p,
          quantity: p.quantity,
          quantityType: typeof p.quantity
        }))
      });

      const result = await stockMovementService.createMovement(movementData);

      console.log('✅ Server response:', result);

      if (result.success) {
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
                refreshProducts(); // Refresh products after successful submission
                router.back();
              }
            }
          ]
        );
      } else {
        console.error('❌ Server error:', result);
        if (result.errors && result.errors.length > 0) {
          Alert.alert('Validation Error', result.errors.join('\n'));
        } else {
          Alert.alert('Error', result.message || 'Failed to create stock movement. Please try again.');
        }
      }
    } catch (error: any) {
      console.error('❌ Network error:', error);
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

  // Product Dropdown Modal with refresh hint (same as AddInvoiceScreen)
  const ProductDropdownModal = () => (
    <Modal
      visible={productDropdownVisible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        setProductDropdownVisible(false);
        setActiveProductIndex(null);
        setProductSearch('');
      }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingView}
          >
            <View style={styles.dropdownContainer}>
              <View style={styles.dropdownHeader}>
                <Text style={styles.dropdownTitle}>
                  Select Product {activeProductIndex !== null ? `(Product ${activeProductIndex + 1})` : ''}
                  <Text style={styles.refreshHint}> - Pull to refresh</Text>
                </Text>
                <TouchableOpacity onPress={() => {
                  setProductDropdownVisible(false);
                  setActiveProductIndex(null);
                  setProductSearch('');
                }}>
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
                  value={productSearch}
                  onChangeText={setProductSearch}
                  autoFocus
                />
              </View>

              <FlatList
                data={filteredProducts}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const isSelected = selectedProducts.some(p => p.productId === item.id);
                  return (
                    <TouchableOpacity
                      style={[
                        styles.dropdownItem,
                        isSelected && styles.dropdownItemSelected
                      ]}
                      onPress={() => selectProduct(item)}
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
                          Unit: {item.unit || 'units'} • Current Stock: {item.quantity || 0}
                          {movementType === 'distribution' && item.quantity === 0 && (
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
                      {productSearch ? 'No products found' : 'No products available'}
                    </Text>
                    <Text style={styles.emptySubText}>
                      {productSearch ? 'Try a different search term' : 'Add a new product to get started'}
                    </Text>
                  </View>
                }
              />

              {/* Add New Product Button (same as AddInvoiceScreen) */}
              <TouchableOpacity 
                style={styles.addNewButton}
                onPress={navigateToAddProduct}
              >
                <Text style={styles.addNewButtonText}>+ Add New Product</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.dropdownClose} 
                onPress={() => {
                  setProductDropdownVisible(false);
                  setActiveProductIndex(null);
                  setProductSearch('');
                }}
              >
                <Text style={styles.dropdownCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  // Add these missing styles to your getStyles function:
  const enhancedStyles = {
    ...styles,
    refreshHint: {
      color: isDarkMode ? "#94a3b8" : "#9ca3af",
      fontSize: 12,
      fontWeight: "normal",
    },
    emptySubText: {
      color: isDarkMode ? "#6b7280" : "#9ca3af",
      textAlign: "center",
      fontSize: 12,
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
  };

  return (
    <KeyboardAvoidingView 
      style={enhancedStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          style={enhancedStyles.container} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={enhancedStyles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshData}
              colors={["#fc7c05ff"]}
              tintColor="#fc7c05ff"
            />
          }
        >
          {/* Header */}
          <View style={enhancedStyles.header}>
            <TouchableOpacity onPress={() => router.back()} style={enhancedStyles.backButton}>
              <Ionicons name="arrow-back" size={24} color={isDarkMode ? "#f1f5f9" : "#1e293b"} />
            </TouchableOpacity>
            <Text style={enhancedStyles.headerTitle}>Add Stock Movement</Text>
            <Text style={enhancedStyles.headerSubtitle}>Manage inventory movements</Text>
          </View>

          <View style={enhancedStyles.content}>
            {/* Movement Type Selection */}
            <View style={enhancedStyles.section}>
              <Text style={enhancedStyles.sectionTitle}>Movement Type</Text>
              <View style={enhancedStyles.typeSelector}>
                <TouchableOpacity
                  style={[
                    enhancedStyles.typeButton,
                    movementType === 'stock_in' && enhancedStyles.typeButtonActive
                  ]}
                  onPress={() => setMovementType('stock_in')}
                >
                  <Text style={[
                    enhancedStyles.typeButtonText,
                    movementType === 'stock_in' && enhancedStyles.typeButtonTextActive
                  ]}>
                    📥 Stock In
                  </Text>
                  <Text style={enhancedStyles.typeDescription}>Add products to inventory</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    enhancedStyles.typeButton,
                    movementType === 'distribution' && enhancedStyles.typeButtonActive
                  ]}
                  onPress={() => setMovementType('distribution')}
                >
                  <Text style={[
                    enhancedStyles.typeButtonText,
                    movementType === 'distribution' && enhancedStyles.typeButtonTextActive
                  ]}>
                    📤 Distribution
                  </Text>
                  <Text style={enhancedStyles.typeDescription}>Distribute to departments</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Rest of your component remains the same... */}
            {/* Department Selection */}
            {movementType === 'distribution' && (
              <View style={enhancedStyles.section}>
                <Text style={enhancedStyles.sectionTitle}>Select Department</Text>
                <TouchableOpacity
                  style={enhancedStyles.departmentDropdownTrigger}
                  onPress={openDepartmentDropdown}
                >
                  <View style={enhancedStyles.departmentTriggerContent}>
                    {selectedDeptInfo && (
                      <>
                        <Text style={enhancedStyles.departmentIcon}>{selectedDeptInfo.icon}</Text>
                        <View style={enhancedStyles.departmentTriggerInfo}>
                          <Text style={enhancedStyles.departmentTriggerLabel}>{selectedDeptInfo.label}</Text>
                        </View>
                      </>
                    )}
                  </View>
                  <Ionicons name="chevron-down" size={20} color={isDarkMode ? "#94a3b8" : "#64748b"} />
                </TouchableOpacity>
              </View>
            )}

            {/* Products Section */}
            <View style={enhancedStyles.section}>
              <View style={enhancedStyles.sectionHeader}>
                <View>
                  <Text style={enhancedStyles.sectionTitle}>Products</Text>
                  <Text style={enhancedStyles.sectionSubtitle}>
                    {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected
                  </Text>
                </View>
              </View>

              {/* Products List */}
              {selectedProducts.map((product, index) => (
                <View key={index} style={enhancedStyles.productCard}>
                  <View style={enhancedStyles.productHeader}>
                    <Text style={enhancedStyles.productNumber}>Product {index + 1}</Text>
                    <TouchableOpacity 
                      style={enhancedStyles.removeBtn}
                      onPress={() => removeProduct(index)}
                    >
                      <Text style={enhancedStyles.removeBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={enhancedStyles.productForm}>
                    {/* Product Selection Dropdown */}
                    <View style={enhancedStyles.inputGroup}>
                      <Text style={enhancedStyles.inputLabel}>Product *</Text>
                      <TouchableOpacity
                        style={enhancedStyles.dropdownTrigger}
                        onPress={() => openProductDropdown(index)}
                      >
                        <Text style={[
                          enhancedStyles.dropdownTriggerText,
                          !product.productName && enhancedStyles.dropdownPlaceholder
                        ]}>
                          {product.productName || 'Select a product'}
                        </Text>
                        <Text style={enhancedStyles.dropdownArrow}>▼</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={enhancedStyles.productRow}>
                      {/* Quantity Input */}
                      <View style={[enhancedStyles.inputGroup, enhancedStyles.quantityInput]}>
                        <Text style={enhancedStyles.inputLabel}>
                          Quantity * {product.productId && (
                            <Text style={enhancedStyles.currentStockInfo}>
                              (Current: {availableProducts.find(p => p.id === product.productId)?.quantity || 0})
                            </Text>
                          )}
                        </Text>
                        <TextInput
                          style={enhancedStyles.textInput}
                          placeholder="0"
                          placeholderTextColor={isDarkMode ? "#94a3b8" : "#9ca3af"}
                          keyboardType="numeric"
                          value={product.quantity}
                          onChangeText={(value) => updateProduct(index, 'quantity', value)}
                        />
                      </View>

                      {/* Unit Display (read-only) */}
                      <View style={[enhancedStyles.inputGroup, enhancedStyles.unitInput]}>
                        <Text style={enhancedStyles.inputLabel}>Unit</Text>
                        <View style={enhancedStyles.unitDisplay}>
                          <Text style={enhancedStyles.unitText}>{product.unit || '-'}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              ))}

              {/* Add Product Button */}
              <TouchableOpacity 
                style={enhancedStyles.addProductBtn}
                onPress={addProduct}
              >
                <Text style={enhancedStyles.addProductBtnText}>+ Add Another Product</Text>
              </TouchableOpacity>

              {selectedProducts.length === 0 && (
                <View style={enhancedStyles.emptyProducts}>
                  <Ionicons name="cube-outline" size={48} color={isDarkMode ? "#475569" : "#cbd5e1"} />
                  <Text style={enhancedStyles.emptyProductsText}>No products added</Text>
                  <Text style={enhancedStyles.emptyProductsSubtext}>
                    Add products to continue
                  </Text>
                </View>
              )}
            </View>

            {/* Submit Button */}
            <View style={enhancedStyles.actionButtons}>
              <TouchableOpacity
                style={[
                  enhancedStyles.saveBtn,
                  isSubmitting && enhancedStyles.saveBtnDisabled
                ]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                <Text style={enhancedStyles.saveBtnText}>
                  {isSubmitting ? "Creating Movement..." : `Confirm ${movementType === 'stock_in' ? 'Stock In' : 'Distribution'}`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Dropdown Modals */}
          <ProductDropdownModal />
          {/* DepartmentDropdownModal remains the same */}
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
const getStyles = (isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDarkMode ? "#0f172a" : "#f8fafc",
  },
  scrollContent: {
    flexGrow: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
    width: '100%',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#6366f1',
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
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkMode ? 0.1 : 0.05,
    shadowRadius: 8,
    elevation: 2,
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
    backgroundColor: isDarkMode ? "#3730a3" : "#e0e7ff",
    borderColor: '#6366f1',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: isDarkMode ? "#94a3b8" : "#64748b",
    marginBottom: 4,
  },
  typeButtonTextActive: {
    color: '#6366f1',
  },
  typeDescription: {
    fontSize: 12,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    textAlign: 'center',
  },
  // Department Dropdown
  departmentDropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#cbd5e1",
    borderRadius: 12,
    padding: 16,
  },
  departmentTriggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  departmentIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  departmentTriggerInfo: {
    flex: 1,
  },
  departmentTriggerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
  },
  textInput: {
    backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#cbd5e1",
    borderRadius: 12,
    padding: 16,
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    fontSize: 16,
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
  // Dropdown Styles
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#cbd5e1",
    borderRadius: 12,
    padding: 16,
  },
  dropdownTriggerText: {
    fontSize: 16,
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    flex: 1,
  },
  dropdownPlaceholder: {
    color: isDarkMode ? "#94a3b8" : "#9ca3af",
  },
  // Unit Display
  unitDisplay: {
    backgroundColor: isDarkMode ? "#475569" : "#e2e8f0",
    borderWidth: 1,
    borderColor: isDarkMode ? "#64748b" : "#cbd5e1",
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
  },
  unitText: {
    fontSize: 16,
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdownContainer: {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderRadius: 16,
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
  // Search Styles
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
    marginBottom: 16,
  },
  // Add New Product Button
  addNewProductFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: isDarkMode ? "#334155" : "#e2e8f0",
    backgroundColor: isDarkMode ? "#1e293b" : "#f8fafc",
  },
  addNewProductButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addNewProductButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  addNewProductText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
    marginLeft: 8,
  },
  // Department Dropdown Items
  departmentDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "#334155" : "#f1f5f9",
  },
  departmentDropdownItemActive: {
    backgroundColor: isDarkMode ? "#3730a3" : "#e0e7ff",
  },
  departmentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  departmentDropdownText: {
    fontSize: 16,
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    fontWeight: '500',
  },
  departmentDropdownTextActive: {
    color: isDarkMode ? "#e0e7ff" : "#3730a3",
    fontWeight: 'bold',
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
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
});