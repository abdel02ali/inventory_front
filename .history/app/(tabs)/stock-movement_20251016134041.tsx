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

// Move getStyles function outside the component
const getStyles = (isDarkMode: boolean) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: isDarkMode ? "#121212" : "#f8fafc" 
  },
  scrollContent: {
    flexGrow: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
    width: '100%',
  },
  
  // Header
  header: {
    padding: 16,
    paddingTop: 60,
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "#334155" : "#e2e8f0",
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 16,
    zIndex: 1,
    backgroundColor: isDarkMode ? "#334155" : "#f1f5f9",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    textAlign: 'center',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    textAlign: 'center',
  },
  
  // Content
  content: {
    padding: 16,
    flex: 1,
  },
  
  // Sections
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
    color: isDarkMode ? "#60a5fa" : "#3b82f6",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  
  // Type Selector
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: isDarkMode ? "#475569" : "#cbd5e1",
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: isDarkMode ? "#1e40af" : "#dbeafe",
    borderColor: '#3b82f6',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: isDarkMode ? "#94a3b8" : "#64748b",
    marginBottom: 4,
  },
  typeButtonTextActive: {
    color: isDarkMode ? "#60a5fa" : "#1d4ed8",
  },
  typeDescription: {
    fontSize: 12,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    textAlign: 'center',
  },
  
  // Inputs
  textInput: {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderWidth: 1,
    borderColor: isDarkMode ? "#334155" : "#cbd5e1",
    borderRadius: 8,
    padding: 12,
    color: isDarkMode ? "#f8fafc" : "#1e293b",
    fontSize: 14,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  
  // Department Dropdown
  departmentDropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderWidth: 1,
    borderColor: isDarkMode ? "#334155" : "#cbd5e1",
    borderRadius: 8,
    padding: 12,
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
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
  },
  
  // Product Cards
  productCard: {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: isDarkMode ? "#60a5fa" : "#3b82f6",
    borderWidth: 1,
    borderColor: isDarkMode ? "#334155" : "#e2e8f0",
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  productNumber: {
    color: isDarkMode ? "#60a5fa" : "#3b82f6",
    fontWeight: 'bold',
    fontSize: 14,
  },
  removeBtn: {
    backgroundColor: "#ef4444",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // Product Form
  productForm: {
    gap: 12,
  },
  productRow: {
    flexDirection: 'row',
    gap: 10,
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
    fontWeight: '600',
    marginBottom: 6,
    color: isDarkMode ? "#cbd5e1" : "#64748b",
    fontSize: 12,
  },
  currentStockInfo: {
    fontSize: 11,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  
  // Dropdown Styles
  dropdownTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: isDarkMode ? "#334155" : "#cbd5e1",
    borderRadius: 8,
    padding: 12,
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
  },
  dropdownTriggerText: {
    color: isDarkMode ? "#f8fafc" : "#1e293b",
    fontSize: 14,
    flex: 1,
  },
  dropdownPlaceholder: {
    color: isDarkMode ? "#94a3b8" : "#9ca3af",
  },
  dropdownArrow: {
    color: isDarkMode ? "#60a5fa" : "#3b82f6",
    fontSize: 12,
  },
  
  // Unit Display
  unitDisplay: {
    backgroundColor: isDarkMode ? "#334155" : "#f1f5f9",
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#cbd5e1",
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
  addProductBtn: {
    backgroundColor: isDarkMode ? "#22d3ee" : "#06b6d4",
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: isDarkMode ? "#06b6d4" : "#0891b2",
  },
  addProductBtnText: {
    color: isDarkMode ? "#0f172a" : "#ffffff",
    fontWeight: 'bold',
    fontSize: 14,
  },
  
  // Empty State
  emptyProducts: {
    alignItems: 'center',
    padding: 20,
  },
  emptyProductsText: {
    color: isDarkMode ? "#94a3b8" : "#9ca3af",
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 4,
    fontWeight: '600',
  },
  emptyProductsSubtext: {
    color: isDarkMode ? "#6b7280" : "#9ca3af",
    textAlign: 'center',
    fontSize: 12,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  dropdownContainer: {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderRadius: 12,
    padding: 16,
    width: "90%",
    maxHeight: "70%",
    borderWidth: 1,
    borderColor: isDarkMode ? "#334155" : "#cbd5e1",
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dropdownTitle: {
    color: isDarkMode ? "#60a5fa" : "#3b82f6",
    fontSize: 16,
    fontWeight: "bold",
  },
  refreshHint: {
    color: isDarkMode ? "#94a3b8" : "#9ca3af",
    fontSize: 12,
    fontWeight: "normal",
  },
  
  // Search Styles
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
  
  // Dropdown Items
  dropdownFlatList: {
    maxHeight: 300,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "#334155" : "#e2e8f0",
  },
  dropdownItemSelected: {
    backgroundColor: isDarkMode ? "#374151" : "#f1f5f9",
  },
  productInfo: {
    flex: 1,
  },
  dropdownItemText: {
    color: isDarkMode ? "#f8fafc" : "#1e293b",
    fontSize: 14,
    flex: 1,
    marginBottom: 4,
  },
  dropdownItemTextSelected: {
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  productUnit: {
    fontSize: 12,
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  lowStockWarning: {
    color: '#ef4444',
    fontWeight: 'bold',
  },
  
  // Empty Dropdown State
  emptyDropdown: {
    alignItems: "center",
    padding: 20,
  },
  emptyDropdownText: {
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
  
  // Add New Product Button
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
  
  // Department Dropdown Items
  departmentDropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "#334155" : "#e2e8f0",
  },
  departmentDropdownItemActive: {
    backgroundColor: isDarkMode ? "#1e40af" : "#dbeafe",
  },
  departmentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  departmentDropdownText: {
    color: isDarkMode ? "#f8fafc" : "#1e293b",
    fontSize: 14,
  },
  departmentDropdownTextActive: {
    color: isDarkMode ? "#60a5fa" : "#1d4ed8",
    fontWeight: 'bold',
  },
  
  // Submit Button
  actionButtons: {
    marginTop: 24,
    marginBottom: 30,
    gap: 12,
  },
  saveBtn: {
    backgroundColor: "#fc7c05ff",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  saveBtnDisabled: {
    backgroundColor: "#9ca3af",
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },

  // Refresh Button
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? "#334155" : "#e2e8f0",
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    justifyContent: 'center',
  },
  refreshButtonText: {
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginLeft: 8,
    fontSize: 14,
  },
  refreshProductsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDarkMode ? "#1e293b" : "#f1f5f9",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? "#334155" : "#cbd5e1",
  },
  refreshProductsText: {
    color: "#3b82f6",
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
});

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

  // Available products from context
  const availableProducts = products || [];
  
  // 🔄 Refresh data function
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

  // 🔄 Refresh products when dropdown opens
  useEffect(() => {
    if (productDropdownVisible) {
      refreshProducts();
      console.log('🔄 Auto-refreshing products for dropdown');
    }
  }, [productDropdownVisible]);

  // Debug product data - FIXED to handle both q and quantity fields
  useEffect(() => {
    console.log('📦 Available products from context:', availableProducts);
    if (availableProducts.length > 0) {
      const firstProduct = availableProducts[0];
      const actualStock = firstProduct.quantity !== undefined ? firstProduct.quantity : firstProduct.q;
      
      console.log('🔍 First product details:', {
        id: firstProduct.id,
        name: firstProduct.name,
        quantity: firstProduct.quantity,
        q: firstProduct.q,
        actualStock: actualStock,
        unit: firstProduct.unit,
      });
    }
  }, [availableProducts]);

  // Helper function to get actual stock (handles both q and quantity fields)
  const getProductStock = (product: any) => {
    return product.quantity !== undefined ? product.quantity : product.q;
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
        console.log('🔍 Selected product details:', selectedProduct);
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

  // Product dropdown functions with auto-refresh
  const openProductDropdown = (index: number) => {
    setActiveProductIndex(index);
    setProductSearch('');
    setProductDropdownVisible(true);
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

  // Add new product navigation with callback refresh
  const navigateToAddProduct = () => {
    setProductDropdownVisible(false);
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

      console.log('📦 Submitting movement data:', movementData);

      const result = await stockMovementService.createMovement(movementData);

      console.log('✅ Server response:', result);

      if (result.success) {
        // 🔄 CRITICAL: Refresh products BEFORE showing success alert
        console.log('🔄 Refreshing products data...');
        await refreshProducts();
        
        // 🔄 Wait a moment for the context to update
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log('📊 Products refreshed, showing success alert');
        
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

  // Product Dropdown Modal with correct stock display
  const ProductDropdownModal = () => (
    <Modal
      visible={productDropdownVisible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        setProductDropdownVisible(false);
        setActiveProductIndex(null);
        setProductSearch('');
      }}
    >
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1}
        onPress={() => {
          setProductDropdownVisible(false);
          setActiveProductIndex(null);
          setProductSearch('');
        }}
      >
        <View style={styles.dropdownContainer}>
          <View style={styles.dropdownHeader}>
            <Text style={styles.dropdownTitle}>
              Select Product ({filteredProducts.length})
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
          
          {/* Refresh Button */}
          <TouchableOpacity 
            style={styles.refreshProductsButton}
            onPress={refreshProducts}
          >
            <Ionicons name="refresh" size={16} color="#3b82f6" />
            <Text style={styles.refreshProductsText}>Refresh Stock Data</Text>
          </TouchableOpacity>
          
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
            <View style={styles.emptyDropdown}>
              <Text style={styles.emptyDropdownText}>
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
            onPress={() => {
              setProductDropdownVisible(false);
              setActiveProductIndex(null);
              setProductSearch('');
            }}
          >
            <Text style={styles.dropdownCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // Department Dropdown Modal
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
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={isDarkMode ? "#f1f5f9" : "#1e293b"} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add Stock Movement</Text>
            <Text style={styles.headerSubtitle}>Manage inventory movements</Text>
          </View>

          <View style={styles.content}>
            {/* Manual Refresh Button */}
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={refreshProducts}
            >
              <Ionicons name="refresh" size={16} color={isDarkMode ? "#f1f5f9" : "#1e293b"} />
              <Text style={styles.refreshButtonText}>Refresh Stock Data</Text>
            </TouchableOpacity>

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
              {selectedProducts.map((product, index) => (
                <View key={index} style={styles.productCard}>
                  <View style={styles.productHeader}>
                    <Text style={styles.productNumber}>Product {index + 1}</Text>
                    {selectedProducts.length > 1 && (
                      <TouchableOpacity 
                        style={styles.removeBtn}
                        onPress={() => removeProduct(index)}
                      >
                        <Text style={styles.removeBtnText}>✕</Text>
                      </TouchableOpacity>
                    )}
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
                        <Text style={styles.dropdownArrow}>▼</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.productRow}>
                      {/* Quantity Input */}
                      <View style={[styles.inputGroup, styles.quantityInput]}>
                        <Text style={styles.inputLabel}>
                          Quantity * {product.productId && (
                            <Text style={styles.currentStockInfo}>
                              (Current: {
                                (() => {
                                  const foundProduct = availableProducts.find(p => p.id === product.productId);
                                  return foundProduct ? getProductStock(foundProduct) : 0;
                                })()
                              })
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
                style={styles.addProductBtn}
                onPress={addProduct}
              >
                <Text style={styles.addProductBtnText}>+ Add Another Product</Text>
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
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  isSubmitting && styles.saveBtnDisabled
                ]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {isSubmitting ? "Creating Movement..." : `Confirm ${movementType === 'stock_in' ? 'Stock In' : 'Distribution'}`}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Dropdown Modals */}
          <ProductDropdownModal />
          <DepartmentDropdownModal />
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}