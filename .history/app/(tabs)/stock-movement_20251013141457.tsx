// app/stock-movement.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';
import { stockMovementService } from '../../services/stockMovmentService';
import { useAppContext } from '../context/appContext';

type Department = 'pastry' | 'bakery' | 'cleaning' | 'management' | 'beverage' | 'packaging' | 'storage' | 'front_desk';
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
  const { products } = useAppContext();
  
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

  // Department configuration - using the same Department type
  const departments: { key: Department; label: string; icon: string; color: string }[] = [
    { key: 'pastry', label: 'Pastry Department', icon: '🥐', color: '#f59e0b' },
    { key: 'bakery', label: 'Bakery Department', icon: '🍞', color: '#84cc16' },
    { key: 'beverage', label: 'Beverage Department', icon: '☕', color: '#f97316' },
    { key: 'cleaning', label: 'Cleaning Department', icon: '🧹', color: '#06b6d4' },
    { key: 'packaging', label: 'Packaging Department', icon: '📦', color: '#8b5cf6' },
    { key: 'storage', label: 'Storage Department', icon: '🏪', color: '#64748b' },
    { key: 'front_desk', label: 'Front Desk', icon: '💁', color: '#ec4899' },
    { key: 'management', label: 'Management', icon: '👔', color: '#0ea5e9' },
  ];

  // Available products from context
  const availableProducts = products || [];
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
    updated[index] = { ...updated[index], [field]: value };
    setSelectedProducts(updated);
  };

  const removeProduct = (index: number) => {
    const updated = selectedProducts.filter((_, i) => i !== index);
    setSelectedProducts(updated);
  };

  // Product dropdown functions
  const openProductDropdown = (index: number) => {
    setActiveProductIndex(index);
    setProductSearch('');
    setProductDropdownVisible(true);
  };

  const selectProduct = (product: any) => {
    if (activeProductIndex !== null) {
      updateProduct(activeProductIndex, 'productId', product.id);
      updateProduct(activeProductIndex, 'productName', product.name);
      updateProduct(activeProductIndex, 'unit', product.unit || 'units'); // Get unit from product data
      setProductDropdownVisible(false);
      setActiveProductIndex(null);
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
    router.push('/add-product');
  };

  const handleSubmit = async () => {
    // Validation
    if (selectedProducts.length === 0) {
      Alert.alert('Error', 'Please add at least one product');
      return;
    }

    for (const product of selectedProducts) {
      if (!product.productId || !product.quantity || parseInt(product.quantity) <= 0) {
        Alert.alert('Error', 'Please fill all product fields with valid values');
        return;
      }
    }

    if (movementType === 'stock_in' && !supplier.trim()) {
      Alert.alert('Error', 'Please enter supplier name for stock in');
      return;
    }

    setIsSubmitting(true);

    try {
      // Convert form data to API data format
      const movementData = {
        type: movementType,
        department: movementType === 'distribution' ? selectedDepartment : undefined,
        supplier: movementType === 'stock_in' ? supplier : undefined,
        stockManager: 'Ahmed',
        notes: notes.trim(),
        products: selectedProducts.map(product => ({
          productId: product.productId,
          productName: product.productName,
          quantity: parseInt(product.quantity),
          unit: product.unit
        }))
      };

      const result = await stockMovementService.createMovement(movementData);

      if (result.success) {
        Alert.alert(
          'Success!',
          result.message,
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
          result.errors.forEach((error: string) => {
            Alert.alert('Validation Error', error);
          });
        } else {
          Alert.alert('Error', result.message);
        }
      }
    } catch (error) {
      console.error('Error submitting stock movement:', error);
      Alert.alert('Error', 'Failed to create stock movement. Please try again.');
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
      onRequestClose={() => setProductDropdownVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.dropdownContainer}>
          <View style={styles.dropdownHeader}>
            <Text style={styles.dropdownTitle}>Select Product</Text>
            <TouchableOpacity onPress={() => setProductDropdownVisible(false)}>
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
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => selectProduct(item)}
              >
                <View style={styles.productInfo}>
                  <Text style={styles.dropdownItemText}>{item.name}</Text>
                  <Text style={styles.productUnit}>
                    Unit: {item.unit || 'units'}
                  </Text>
                </View>
                <Text style={styles.stockInfo}>
                  Stock: {item.quantity || 0}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyDropdown}>
                <Text style={styles.emptyDropdownText}>
                  {productSearch ? 'No products found' : 'No products available'}
                </Text>
              </View>
            }
          />

          {/* Add New Product Button */}
          <TouchableOpacity style={styles.addNewProductButton} onPress={navigateToAddProduct}>
            <Ionicons name="add-circle" size={20} color="#10b981" />
            <Text style={styles.addNewProductText}>Add New Product</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
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

        {/* Products Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Products</Text>
            <TouchableOpacity style={styles.addButton} onPress={addProduct}>
              <Text style={styles.addButtonText}>+ Add Product</Text>
            </TouchableOpacity>
          </View>

          {selectedProducts.map((product, index) => (
            <View key={index} style={styles.productCard}>
              <View style={styles.productHeader}>
                <Text style={styles.productNumber}>Product {index + 1}</Text>
                {selectedProducts.length > 1 && (
                  <TouchableOpacity onPress={() => removeProduct(index)}>
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
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
                    <Ionicons name="chevron-down" size={16} color={isDarkMode ? "#94a3b8" : "#64748b"} />
                  </TouchableOpacity>
                </View>

                {/* Quantity Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Quantity *</Text>
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
                {product.unit && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Unit</Text>
                    <View style={styles.unitDisplay}>
                      <Text style={styles.unitText}>{product.unit}</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          ))}

          {selectedProducts.length === 0 && (
            <View style={styles.emptyProducts}>
              <Ionicons name="cube-outline" size={48} color={isDarkMode ? "#475569" : "#cbd5e1"} />
              <Text style={styles.emptyProductsText}>No products added yet</Text>
              <Text style={styles.emptyProductsSubtext}>
                Click "Add Product" to start adding items
              </Text>
            </View>
          )}
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
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
  );
}

const getStyles = (isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDarkMode ? "#0f172a" : "#f8fafc",
  },
  header: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#6366f1',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 24,
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#e0e7ff',
    opacity: 0.9,
    textAlign: 'center',
  },
  content: {
    padding: 16,
  },
  section: {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDarkMode ? 0.1 : 0.05,
    shadowRadius: 12,
    elevation: 3,
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
    marginBottom: 16,
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
    height: 80,
    textAlignVertical: 'top',
  },
  addButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
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
  productForm: {
    gap: 12,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? "#94a3b8" : "#64748b",
    marginBottom: 8,
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
  },
  unitText: {
    fontSize: 16,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontWeight: '500',
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
  productInfo: {
    flex: 1,
  },
  dropdownItemText: {
    fontSize: 16,
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    fontWeight: '500',
    marginBottom: 4,
  },
  productUnit: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  stockInfo: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontWeight: '600',
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
  // Add New Product Button
  addNewProductButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: isDarkMode ? "#334155" : "#e2e8f0",
    backgroundColor: isDarkMode ? "#1e293b" : "#f8fafc",
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