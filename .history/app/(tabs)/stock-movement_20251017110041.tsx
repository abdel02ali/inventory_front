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

  // 🔄 Refresh products when component mounts
  useEffect(() => {
    const loadProducts = async () => {
      console.log('📦 Loading products on component mount...');
      await refreshProducts();
    };
    loadProducts();
  }, []);

  // 🔄 Refresh products when product dropdown opens
  useEffect(() => {
    if (productDropdownVisible) {
      console.log('📦 Refreshing products for dropdown...');
      const refreshForDropdown = async () => {
        await refreshProducts();
      };
      refreshForDropdown();
    }
  }, [productDropdownVisible]);

  // Helper function to get actual stock (handles both q and quantity fields)
  const getProductStock = (product: any) => {
    return product.quantity !== undefined ? product.quantity : product.q || 0;
  };

  // Get current stock for a specific product
  const getCurrentStockForProduct = (productId: string) => {
    const product = availableProducts.find(p => p.id === productId);
    return product ? getProductStock(product) : 0;
  };

  // Check if distribution quantity is valid
  const isDistributionQuantityValid = (productId: string, quantity: string) => {
    if (movementType !== 'distribution') return true;
    
    const currentStock = getCurrentStockForProduct(productId);
    const requestedQuantity = parseInt(quantity) || 0;
    
    return requestedQuantity <= currentStock;
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

  // Product dropdown functions
  const openProductDropdown = async (index: number) => {
    console.log("📦 Opening product dropdown for index:", index);
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

  // Add new product navigation
  const navigateToAddProduct = () => {
    setProductDropdownVisible(false);
    router.push('/details/add-product');
  };

  const handleSubmit = async () => {
    if (selectedProducts.length === 0) {
      Alert.alert('Error', 'Please add at least one product');
      return;
    }

    // Validate all products
    const invalidProducts = selectedProducts.filter(product => 
      !product.productId || !product.quantity || parseInt(product.quantity) <= 0
    );

    if (invalidProducts.length > 0) {
      Alert.alert('Error', 'Please fill all product fields with valid quantities');
      return;
    }

    // Validate stock for distributions
    if (movementType === 'distribution') {
      const insufficientStockProducts = selectedProducts.filter(product => 
        !isDistributionQuantityValid(product.productId, product.quantity)
      );

      if (insufficientStockProducts.length > 0) {
        const productNames = insufficientStockProducts.map(p => p.productName).join(', ');
        Alert.alert('Insufficient Stock', `The following products don't have enough stock: ${productNames}`);
        return;
      }
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

      console.log('📤 Submitting movement data:', movementData);
      const result = await stockMovementService.createMovement(movementData);

      if (result.success) {
        // Force refresh products after successful submission
        console.log('🔄 Refreshing products after movement creation...');
        await refreshProducts();
        
        Alert.alert(
          'Success!',
          result.message || 'Stock movement created successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                // Reset form
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
      console.error('❌ Submission error:', error);
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

  // Product Dropdown Modal
  const ProductDropdownModal = () => (
    <Modal
      visible={productDropdownVisible}
      transparent
      animationType="slide"
      onRequestClose={closeProductDropdown}
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
                </Text>
                <TouchableOpacity onPress={closeProductDropdown}>
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
                  const currentStock = getProductStock(item);
                  
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
                          Unit: {item.unit || 'units'} • Current Stock: {currentStock}
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
                      {productSearch ? 'No products found' : 'No products available'}
                    </Text>
                    <TouchableOpacity 
                      style={styles.addNewProductButton}
                      onPress={navigateToAddProduct}
                    >
                      <Text style={styles.addNewProductButtonText}>Add New Product</Text>
                    </TouchableOpacity>
                  </View>
                }
              />

              {/* Add New Product Button */}
              <TouchableOpacity 
                style={styles.addNewProductFooter}
                onPress={navigateToAddProduct}
              >
                <Ionicons name="add-circle" size={20} color="#10b981" />
                <Text style={styles.addNewProductText}>Add New Product</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  // Department Dropdown Modal
  const DepartmentDropdownModal = () => (
    <Modal
      visible={departmentDropdownVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setDepartmentDropdownVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.dropdownContainer}>
          <View style={styles.dropdownHeader}>
            <Text style={styles.dropdownTitle}>Select Department</Text>
            <TouchableOpacity onPress={() => setDepartmentDropdownVisible(false)}>
              <Ionicons name="close" size={24} color={isDarkMode ? "#f1f5f9" : "#1e293b"} />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={departments}
            keyExtractor={(item) => item.key}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.departmentDropdownItem,
                  selectedDepartment === item.key && styles.departmentDropdownItemActive
                ]}
                onPress={() => selectDepartment(item.key)}
              >
                <Text style={styles.departmentIcon}>{item.icon}</Text>
                <View style={styles.departmentInfo}>
                  <Text style={[
                    styles.departmentDropdownText,
                    selectedDepartment === item.key && styles.departmentDropdownTextActive
                  ]}>
                    {item.label}
                  </Text>
                </View>
                {selectedDepartment === item.key && (
                  <Ionicons name="checkmark" size={20} color="#10b981" />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
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
                  style={styles.departmentDropdownTrigger}
                  onPress={openDepartmentDropdown}
                >
                  <View style={styles.departmentTriggerContent}>
                    {selectedDeptInfo && (
                      <>
                        <Text style={styles.departmentIcon}>{selectedDeptInfo.icon}</Text>
                        <View style={styles.departmentTriggerInfo}>
                          <Text style={styles.departmentTriggerLabel}>{selectedDeptInfo.label}</Text>
                        </View>
                      </>
                    )}
                  </View>
                  <Ionicons name="chevron-down" size={20} color={isDarkMode ? "#94a3b8" : "#64748b"} />
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
              {selectedProducts.map((product, index) => (
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
                        style={styles.dropdownTrigger}
                        onPress={() => openProductDropdown(index)}
                      >
                        <Text style={[
                          styles.dropdownTriggerText,
                          !product.productName && styles.dropdownPlaceholder
                        ]}>
                          {product.productName || 'Select a product'}
                        </Text>
                        <Ionicons name="chevron-down" size={16} color={isDarkMode ? "#94a3b8" : "#64748b"} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.productRow}>
                      {/* Quantity Input */}
                      <View style={[styles.inputGroup, styles.quantityInput]}>
                        <Text style={styles.inputLabel}>
                          Quantity * {product.productId && (
                            <Text style={styles.currentStockInfo}>
                              (Current: {getCurrentStockForProduct(product.productId)})
                              {movementType === 'distribution' && !isDistributionQuantityValid(product.productId, product.quantity) && (
                                <Text style={styles.insufficientStockWarning}> • Insufficient stock!</Text>
                              )}
                            </Text>
                          )}
                        </Text>
                        <TextInput
                          style={[
                            styles.textInput,
                            movementType === 'distribution' && product.productId && !isDistributionQuantityValid(product.productId, product.quantity) && styles.invalidInput
                          ]}
                          placeholder="0"
                          placeholderTextColor={isDarkMode ? "#94a3b8" : "#9ca3af"}
                          keyboardType="numeric"
                          value={product.quantity}
                          onChangeText={(value) => updateProduct(index, 'quantity', value)}
                        />
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
              ))}

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
}

const getStyles = (isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDarkMode ? "#0f172a" : "#f8fafc",
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: '#6366f1',
    padding: 24,
    paddingTop: 60,
    paddingBottom: 30,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderRadius: 16,
    padding: 4,
  },
  typeButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: isDarkMode ? "#334155" : "#e2e8f0",
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? "#94a3b8" : "#64748b",
    marginBottom: 4,
  },
  typeButtonTextActive: {
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
  },
  typeDescription: {
    fontSize: 12,
    color: isDarkMode ? "#64748b" : "#94a3b8",
    textAlign: 'center',
  },
  departmentDropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderWidth: 1,
    borderColor: isDarkMode ? "#334155" : "#e2e8f0",
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
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    fontWeight: '500',
  },
  textInput: {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderWidth: 1,
    borderColor: isDarkMode ? "#334155" : "#e2e8f0",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  productCard: {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  productNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
  },
  deleteButton: {
    padding: 8,
  },
  productForm: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
  },
  currentStockInfo: {
    fontSize: 12,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontWeight: 'normal',
  },
  insufficientStockWarning: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderWidth: 1,
    borderColor: isDarkMode ? "#334155" : "#e2e8f0",
    borderRadius: 12,
    padding: 16,
  },
  dropdownTriggerText: {
    fontSize: 16,
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    flex: 1,
  },
  dropdownPlaceholder: {
    color: isDarkMode ? "#64748b" : "#9ca3af",
  },
  productRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quantityInput: {
    flex: 2,
  },
  unitInput: {
    flex: 1,
  },
  unitDisplay: {
    backgroundColor: isDarkMode ? "#334155" : "#f1f5f9",
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#e2e8f0",
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
  },
  unitText: {
    fontSize: 16,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontWeight: '500',
  },
  invalidInput: {
    borderColor: '#ef4444',
    backgroundColor: isDarkMode ? '#7f1d1d20' : '#fef2f2',
  },
  addProductButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderWidth: 2,
    borderColor: isDarkMode ? "#334155" : "#e2e8f0",
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
  },
  addProductButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
  },
  emptyProducts: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: isDarkMode ? "#334155" : "#e2e8f0",
    borderStyle: 'dashed',
  },
  emptyProductsText: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginTop: 16,
    marginBottom: 4,
  },
  emptyProductsSubtext: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: '#6366f1',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 40,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dropdownContainer: {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
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
    backgroundColor: isDarkMode ? "#0f172a" : "#f1f5f9",
    margin: 20,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "#334155" : "#f1f5f9",
  },
  dropdownItemSelected: {
    backgroundColor: isDarkMode ? "#1e40af20" : "#dbeafe",
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
    color: '#1e40af',
  },
  productUnit: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  lowStockWarning: {
    color: '#ef4444',
    fontWeight: '600',
  },
  emptyDropdown: {
    padding: 40,
    alignItems: 'center',
  },
  emptyDropdownText: {
    fontSize: 16,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    marginBottom: 16,
    textAlign: 'center',
  },
  addNewProductButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addNewProductButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  addNewProductFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: isDarkMode ? "#334155" : "#e2e8f0",
  },
  addNewProductText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
  },
  departmentDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "#334155" : "#f1f5f9",
  },
  departmentDropdownItemActive: {
    backgroundColor: isDarkMode ? "#1e40af20" : "#dbeafe",
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
    color: '#1e40af',
  },
});