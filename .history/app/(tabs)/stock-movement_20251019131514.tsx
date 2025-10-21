// app/stock-movement.tsx (updated to use ProductSelectionModal)
import ProductSelectionModal from '@/components/ProductSelectionModal';
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
import { departmentService } from '../../services/departmentService';
import { stockMovementService } from '../../services/stockMovmentService';
import { useAppContext } from '../context/appContext';
import { Department } from '../types/department';

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
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<ProductSelection[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Updated modal states for ProductSelectionModal
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [activeProductIndex, setActiveProductIndex] = useState<number | null>(null);
  const [departmentDropdownVisible, setDepartmentDropdownVisible] = useState(false);
  
  // Remove the old search state since it's handled in the modal
  // const [productSearch, setProductSearch] = useState('');

  // Departments state
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);

  const styles = getStyles(isDarkMode);

  // Available products from context (for display in the form, not for the modal)
  const availableProducts = products || [];

  // Load departments from backend
  useEffect(() => {
    const loadDepartments = async () => {
      try {
        setLoadingDepartments(true);
        const depts = await departmentService.getDepartments();
        setDepartments(depts);
        
        // Set default department if available
        if (depts.length > 0) {
          setSelectedDepartment(depts[0].id);
        }
      } catch (error) {
        console.error('Error loading departments:', error);
        Alert.alert('Error', 'Failed to load departments');
      } finally {
        setLoadingDepartments(false);
      }
    };

    loadDepartments();
  }, []);

  // Helper function to get actual stock (handles both q and quantity fields)
  const getProductStock = (product: any) => {
    return product.quantity !== undefined ? product.quantity : product.q;
  };

  // Get selected department info
  const selectedDeptInfo = departments.find(dept => dept.id === selectedDepartment);

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

  // Updated product dropdown functions for ProductSelectionModal
  const openProductDropdown = (index: number) => {
    console.log("📦 Opening product dropdown for index:", index);
    setActiveProductIndex(index);
    setProductModalVisible(true);
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
      setActiveProductIndex(null);
    }
  };

  // Department selection
  const openDepartmentDropdown = () => {
    setDepartmentDropdownVisible(true);
  };

  const selectDepartment = (departmentId: string) => {
    setSelectedDepartment(departmentId);
    setDepartmentDropdownVisible(false);
  };

  // Add new product navigation

    const handleAddProduct = () => {
  // Navigate to product creation screen or show product creation modal
  router.push('/details/add-product');
  // or
  // setShowProductCreationModal(true);
};

  // Get selected product IDs for the modal
  const selectedProductIds = selectedProducts.map(p => p.productId).filter(Boolean);

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

    if (movementType === 'distribution' && departments.length === 0) {
      Alert.alert('Error', 'No departments available. Please create departments first.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Get the full department object for the selected department
      const departmentObj = departments.find(dept => dept.id === selectedDepartment);

      const movementData = {
        type: movementType,
        department: movementType === 'distribution' ? departmentObj : undefined,
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

      // Use type assertion if needed
      const result = await stockMovementService.createMovement(movementData as any);

      if (result.success) {
        // 🔄 CRITICAL: Refresh products to get updated quantities
        console.log('🔄 Refreshing products after movement creation...');
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
                // Reset to first department if available
                if (departments.length > 0) {
                  setSelectedDepartment(departments[0].id);
                }
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
      console.error('❌ Error creating stock movement:', error);
      Alert.alert(
        'Network Error', 
        error.message || 'Failed to connect to server. Please check your internet connection and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Department Dropdown Modal (keep this one as it's simple)
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
          
          {loadingDepartments ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6366f1" />
              <Text style={styles.loadingText}>Loading departments...</Text>
            </View>
          ) : departments.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="business-outline" size={48} color={isDarkMode ? "#475569" : "#cbd5e1"} />
              <Text style={styles.emptyStateText}>No departments available</Text>
              <Text style={styles.emptyStateSubtext}>
                Create departments first to distribute products
              </Text>
              <TouchableOpacity 
                style={styles.createDepartmentButton}
                onPress={() => {
                  setDepartmentDropdownVisible(false);
                  router.push('/create-department');
                }}
              >
                <Text style={styles.createDepartmentButtonText}>Create Department</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={departments}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.departmentDropdownItem,
                    selectedDepartment === item.id && styles.departmentDropdownItemActive
                  ]}
                  onPress={() => selectDepartment(item.id)}
                >
                  <Text style={styles.departmentIcon}>{item.icon}</Text>
                  <View style={styles.departmentInfo}>
                    <Text style={[
                      styles.departmentDropdownText,
                      selectedDepartment === item.id && styles.departmentDropdownTextActive
                    ]}>
                      {item.name}
                    </Text>
                    {item.description && (
                      <Text style={styles.departmentDescription}>
                        {item.description}
                      </Text>
                    )}
                  </View>
                  {selectedDepartment === item.id && (
                    <Ionicons name="checkmark" size={20} color="#10b981" />
                  )}
                </TouchableOpacity>
              )}
            />
          )}
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
                {loadingDepartments ? (
                  <View style={styles.departmentLoading}>
                    <ActivityIndicator size="small" color="#6366f1" />
                    <Text style={styles.departmentLoadingText}>Loading departments...</Text>
                  </View>
                ) : departments.length === 0 ? (
                  <View style={styles.noDepartments}>
                    <Ionicons name="business-outline" size={24} color="#ef4444" />
                    <Text style={styles.noDepartmentsText}>No departments available</Text>
                    <TouchableOpacity 
                      style={styles.createDepartmentButton}
                      onPress={() => router.push('/create-department')}
                    >
                      <Text style={styles.createDepartmentButtonText}>Create Department</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.departmentDropdownTrigger}
                    onPress={openDepartmentDropdown}
                  >
                    <View style={styles.departmentTriggerContent}>
                      {selectedDeptInfo && (
                        <>
                          <Text style={styles.departmentIcon}>{selectedDeptInfo.icon}</Text>
                          <View style={styles.departmentTriggerInfo}>
                            <Text style={styles.departmentTriggerLabel}>{selectedDeptInfo.name}</Text>
                            {selectedDeptInfo.description && (
                              <Text style={styles.departmentTriggerDescription}>
                                {selectedDeptInfo.description}
                              </Text>
                            )}
                          </View>
                        </>
                      )}
                    </View>
                    <Ionicons name="chevron-down" size={20} color={isDarkMode ? "#94a3b8" : "#64748b"} />
                  </TouchableOpacity>
                )}
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
                (isSubmitting || 
                 (movementType === 'distribution' && departments.length === 0) ||
                 (movementType === 'distribution' && !selectedDepartment)
                ) && styles.submitButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={
                isSubmitting || 
                (movementType === 'distribution' && departments.length === 0) ||
                (movementType === 'distribution' && !selectedDepartment)
              }
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

          {/* Use the new ProductSelectionModal instead of the old ProductDropdownModal */}
          <ProductSelectionModal
            visible={productModalVisible}
            onClose={() => {
              setProductModalVisible(false);
              setActiveProductIndex(null);
            }}
            onSelect={selectProduct}
            onAddProduct={handleAddProduct}
            movementType={movementType}
            selectedProductIds={selectedProductIds}
          />

          {/* Keep Department Dropdown Modal */}
          <DepartmentDropdownModal />
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

// Keep your existing getStyles function (no changes needed)
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
  // Department Loading States
  departmentLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
    borderRadius: 12,
  },
  departmentLoadingText: {
    marginLeft: 8,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontSize: 14,
  },
  noDepartments: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: isDarkMode ? "#475569" : "#e2e8f0",
    borderStyle: 'dashed',
  },
  noDepartmentsText: {
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontSize: 14,
    marginTop: 8,
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
  departmentTriggerDescription: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    marginTop: 2,
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
    backgroundColor: "transparent",
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop:120
  },
  dropdownContainer: {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderRadius: 30,
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
  // Loading States
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontSize: 14,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    marginTop: 12,
    fontWeight: '600',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: isDarkMode ? "#64748b" : "#94a3b8",
    marginTop: 4,
    textAlign: 'center',
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
    borderBottomEndRadius:15
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
  departmentDescription: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    marginTop: 2,
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
  // Create Department Button
  createDepartmentButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  createDepartmentButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
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