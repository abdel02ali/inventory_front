// app/stock-movement.tsx
import ProductSelectionModal from '@/components/ProductSelectionModal';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
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
import {
  MovementType,
  StockMovementData,
  Department as StockMovementDepartment,
  stockMovementService,
  ProductSelection as StockProductSelection
} from '../../services/stockMovmentService';
import { useAppContext } from '../context/appContext';

import { Department as ApiDepartment } from '../types/department';

// Use the exact types from stockMovementService
type ProductSelection = {
  productId: string;
  productName: string;
  quantity: string; // string for input, will convert to number on submit
  unit: string;
  unitPrice?: number;
};

export default function StockMovementScreen() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const router = useRouter();
  const { products, refreshProducts } = useAppContext();
  
  const [movementType, setMovementType] = useState<MovementType>('stock_in');
  const [selectedDepartment, setSelectedDepartment] = useState<{
    id: StockMovementDepartment;
    name: string;
  } | null>(null);
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<ProductSelection[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Modal states for ProductSelectionModal
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [activeProductIndex, setActiveProductIndex] = useState<number | null>(null);
  const [departmentDropdownVisible, setDepartmentDropdownVisible] = useState(false);
  
  // Departments state
  const [departments, setDepartments] = useState<ApiDepartment[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);

  const styles = getStyles(isDarkMode, movementType);

  // Available products from context
  console.log('📦 App Context Products:', {
    productsCount: products?.length || 0,
    products: products?.map(p => ({ id: p.id, name: p.name, quantity: p.quantity }))
  });
  
  const availableProducts = products || [];
  console.log('📦 Available Products:', availableProducts.length);
  
  // Load departments from backend
  useEffect(() => {
    const loadDepartments = async () => {
      try {
        setLoadingDepartments(true);
        const depts = await departmentService.getDepartments();
        setDepartments(depts);
        
        // Set default department if available
        if (depts.length > 0) {
          setSelectedDepartment({
            id: depts[0].id as StockMovementDepartment,
            name: depts[0].name
          });
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

  // Get selected department info
  const selectedDeptInfo = selectedDepartment 
    ? departments.find(dept => dept.id === selectedDepartment.id)
    : null;

  // Helper function to validate quantity based on unit
  const validateQuantityForUnit = (value: string, unit: string): boolean => {
    if (value === '') return true;
    
    // For units that accept decimals (kg, g, lb, etc.)
    const decimalUnits = ['kg', 'g', 'lb', 'oz', 'liter', 'l', 'lt'];
    
    // For units that should be integers (pcs, units, loaves, etc.)
    const integerUnits = ['pcs', 'units', 'loaves', 'cakes', 'pieces', 'bottles', 'packs', 'unit'];
    
    const unitLower = unit.toLowerCase();
    
    if (decimalUnits.includes(unitLower)) {
      // Allow decimals for these units
      const normalizedValue = value.replace(',', '.');
      const validDecimalRegex = /^\d*\.?\d*$/; // No negative numbers, allows decimals
      const decimalCount = (normalizedValue.match(/\./g) || []).length;
      return (validDecimalRegex.test(normalizedValue) && decimalCount <= 1);
    } else if (integerUnits.includes(unitLower)) {
      // Only allow integers for these units
      const validIntegerRegex = /^\d+$/;
      return validIntegerRegex.test(value);
    }
    
    // Default: allow decimals
    const normalizedValue = value.replace(',', '.');
    const validDecimalRegex = /^\d*\.?\d*$/;
    const decimalCount = (normalizedValue.match(/\./g) || []).length;
    return (validDecimalRegex.test(normalizedValue) && decimalCount <= 1);
  };

  // Update product function with decimal support
  const updateProduct = (index: number, field: keyof ProductSelection, value: string) => {
    const updated = [...selectedProducts];
    
    if (field === 'quantity') {
      const currentUnit = updated[index].unit || 'units';
      
      // Allow clearing the field
      if (value === '') {
        updated[index] = { ...updated[index], [field]: '' };
      } 
      // Check if this is a valid quantity for the unit
      else if (validateQuantityForUnit(value, currentUnit)) {
        updated[index] = { ...updated[index], [field]: value };
      }
      // If not valid, keep the current value
      else {
        // Don't update, keep current value
        return;
      }
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
          // Set default quantity based on unit type
          const unitLower = updated[index].unit.toLowerCase();
          const isDecimalUnit = ['kg', 'g', 'lb', 'oz', 'liter', 'l', 'lt'].includes(unitLower);
          const defaultQuantity = isDecimalUnit ? '0.5' : '1';
          updated[index].quantity = defaultQuantity;
        }
      }
    }
    
    setSelectedProducts(updated);
  };

  const addProduct = () => {
    setSelectedProducts([
      ...selectedProducts,
      { productId: '', productName: '', quantity: '', unit: '' }
    ]);
  };

  const removeProduct = (index: number) => {
    const updated = selectedProducts.filter((_, i) => i !== index);
    setSelectedProducts(updated);
  };

  // Product selection functions for ProductSelectionModal
  const openProductDropdown = (index: number) => {
    console.log("📦 Opening product dropdown for index:", index);
    setActiveProductIndex(index);
    setProductModalVisible(true);
  };

  const selectProduct = (product: any) => {
    if (activeProductIndex !== null) {
      const updated = [...selectedProducts];
      const unitLower = String(product.unit || 'units').toLowerCase();
      const isDecimalUnit = ['kg', 'g', 'lb', 'oz', 'liter', 'l', 'lt'].includes(unitLower);
      const defaultQuantity = movementType === 'stock_in' ? (isDecimalUnit ? '0.5' : '1') : '';
      
      updated[activeProductIndex] = {
        productId: product.id,
        productName: product.name,
        quantity: defaultQuantity,
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

  const selectDepartment = (department: ApiDepartment) => {
    setSelectedDepartment({
      id: department.id as StockMovementDepartment,
      name: department.name
    });
    setDepartmentDropdownVisible(false);
  };

  // Add new product navigation
  const handleAddProduct = () => {
    router.push('/details/add-product');
  };

  // Get selected product IDs for the modal
  const selectedProductIds = selectedProducts.map(p => p.productId).filter(Boolean);

  const handleSubmit = async () => {
    console.log('🚀 handleSubmit started');
    
    // Validation checks
    if (selectedProducts.length === 0) {
      Alert.alert('Error', 'Please add at least one product');
      return;
    }

    // Debug: Log each product's quantity before validation
    console.log('📊 [DEBUG] Product quantities before validation:');
    selectedProducts.forEach((product, index) => {
      console.log(`  Product ${index + 1}: "${product.productName}"`);
      console.log(`    Quantity string: "${product.quantity}"`);
      console.log(`    Unit: "${product.unit}"`);
      console.log(`    Product ID: "${product.productId}"`);
      
      // Test different parsing methods
      const cleanValue = product.quantity.replace(',', '.');
      const asNumber = Number(cleanValue);
      const asFloat = parseFloat(cleanValue);
      
      console.log(`    Clean value: "${cleanValue}"`);
      console.log(`    As Number(): ${asNumber}`);
      console.log(`    As parseFloat(): ${asFloat}`);
      console.log(`    Is NaN (Number): ${isNaN(asNumber)}`);
      console.log(`    Is NaN (parseFloat): ${isNaN(asFloat)}`);
      console.log(`    Type (Number): ${typeof asNumber}`);
      console.log(`    Type (parseFloat): ${typeof asFloat}`);
    });
  
    const invalidProducts = selectedProducts.filter(product => {
      if (!product.productId || !product.quantity) {
        console.log(`❌ Missing fields for ${product.productName || 'unknown product'}`);
        return true;
      }
      
      // Convert quantity to number for validation
      const cleanValue = product.quantity.replace(',', '.');
      const quantityNum = Number(cleanValue);
      
      console.log(`🔍 Validating ${product.productName}:`);
      console.log(`   Input: "${product.quantity}" → Clean: "${cleanValue}" → Number: ${quantityNum}`);
      console.log(`   Is NaN: ${isNaN(quantityNum)}`);
      console.log(`   Is > 0: ${quantityNum > 0}`);
      console.log(`   Is valid: ${!isNaN(quantityNum) && quantityNum > 0}`);
      
      return isNaN(quantityNum) || quantityNum <= 0;
    });

    if (invalidProducts.length > 0) {
      console.log('❌ Invalid products found:', invalidProducts.length);
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

    console.log('✅ All validations passed');
    setIsSubmitting(true);

    try {
      // Convert selected products to the exact type expected by the service
      const productsData: StockProductSelection[] = selectedProducts.map((product, index) => {
        const cleanValue = product.quantity.replace(',', '.');
        
        // Try multiple parsing methods to ensure we get a valid number
        let quantityNum: number;
        
        // Method 1: Try Number() first
        quantityNum = Number(cleanValue);
        
        // Method 2: If NaN, try parseFloat
        if (isNaN(quantityNum)) {
          console.log(`⚠️ Number() failed for "${cleanValue}", trying parseFloat`);
          quantityNum = parseFloat(cleanValue);
        }
        
        // Method 3: If still NaN, try manual extraction
        if (isNaN(quantityNum)) {
          console.log(`⚠️ parseFloat() failed for "${cleanValue}", trying manual extraction`);
          const match = cleanValue.match(/[-+]?\d*\.?\d+/);
          if (match) {
            quantityNum = parseFloat(match[0]);
          } else {
            quantityNum = 0;
          }
        }
        
        // Ensure it's a valid number
        if (isNaN(quantityNum) || quantityNum <= 0) {
          throw new Error(`Invalid quantity for ${product.productName}: ${product.quantity}`);
        }
        
        // Round to 2 decimal places to avoid floating point issues
        quantityNum = Math.round(quantityNum * 100) / 100;
        
        console.log(`📦 [DEBUG] Product ${index + 1} conversion:`);
        console.log(`   Original: "${product.quantity}"`);
        console.log(`   Cleaned: "${cleanValue}"`);
        console.log(`   Final quantity: ${quantityNum}`);
        console.log(`   Final type: ${typeof quantityNum}`);
        console.log(`   Is finite: ${Number.isFinite(quantityNum)}`);
        
        return {
        productId: product.productId,
        productName: product.productName,
          quantity: quantityNum, // This MUST be a number, not a string
        unit: product.unit
        };
      });
  
      // Validate the products array
      console.log('📦 [DEBUG] Final products array validation:');
      productsData.forEach((product, index) => {
        console.log(`  Product ${index + 1}: ${product.productName}`);
        console.log(`    Quantity: ${product.quantity}`);
        console.log(`    Type: ${typeof product.quantity}`);
        console.log(`    Is number: ${typeof product.quantity === 'number'}`);
        console.log(`    Is finite: ${Number.isFinite(product.quantity)}`);
        console.log(`    Is integer: ${Number.isInteger(product.quantity)}`);
        console.log(`    Is float: ${!Number.isInteger(product.quantity)}`);
      });

      // Create the exact data structure expected by the service
      const movementData: StockMovementData = {
        type: movementType,
        stockManager: 'Abdelali', // You can get this from user context
        products: productsData,
        ...(movementType === 'distribution' && selectedDepartment && {
          department: {
            id: selectedDepartment.id,
            name: selectedDepartment.name
          }
        }),
        ...(movementType === 'stock_in' && {
          supplier: supplier.trim()
        }),
        ...(notes.trim() && {
          notes: notes.trim()
        })
      };

      // Log the complete movement data
      console.log('📦 [DEBUG] Complete movement data structure:');
      console.log(JSON.stringify(movementData, null, 2));
      
      // Also log a minified version for easy copying
      console.log('📦 [DEBUG] Minified movement data (copy this for testing):');
      console.log(JSON.stringify(movementData));
  
      // Test that the data can be stringified (valid JSON)
      try {
        const testString = JSON.stringify(movementData);
        const testParse = JSON.parse(testString);
        console.log('✅ Data is valid JSON');
        
        // Check if quantities are still numbers after stringify/parse
        testParse.products.forEach((product: any, index: number) => {
          console.log(`🔍 After JSON roundtrip - Product ${index + 1}:`);
          console.log(`   Quantity: ${product.quantity}`);
          console.log(`   Type: ${typeof product.quantity}`);
        });
      } catch (jsonError) {
        console.error('❌ Invalid JSON structure:', jsonError);
        Alert.alert('Error', 'Invalid data format. Please check your entries.');
        return;
      }
  
      console.log('📡 Calling stockMovementService.createMovement...');
      console.log('⏱️ Start time:', new Date().toISOString());

      const result = await stockMovementService.createMovement(movementData);
      console.log('⏱️ End time:', new Date().toISOString());
      console.log('📦 Movement creation result:', result);

      if (result.success) {
        console.log('✅ Movement created successfully');
        console.log('🔄 Refreshing products after movement creation...');
        await refreshProducts();

        Alert.alert(
          'Success!',
          result.message || 'Stock movement created successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                console.log('🔄 Resetting form and navigating back...');
                // Reset form
                setSelectedProducts([]);
                setSupplier('');
                setNotes('');
                setMovementType('stock_in');
                if (departments.length > 0) {
                  setSelectedDepartment({
                    id: departments[0].id as StockMovementDepartment,
                    name: departments[0].name
                  });
                } else {
                  setSelectedDepartment(null);
                }
                router.back();
              }
            }
          ]
        );
      } else {
        console.error('❌ Movement creation failed:', result);
        
        // Detailed error analysis with better user messaging
        if (result.errors && result.errors.length > 0) {
          const isTimeoutError = result.errors.some((e: string) => 
            e.includes('timeout') || e.includes('buffering')
          );
          
          if (isTimeoutError) {
            Alert.alert(
              'Timeout Error',
              result.message || 'The operation timed out while processing multiple products.\n\n' +
              '💡 Suggestions:\n' +
              '• Try adding products in smaller batches (5-10 at a time)\n' +
              '• Check your internet connection\n' +
              '• Wait a moment and try again',
              [
                { text: 'OK', style: 'default' },
                { 
                  text: 'Retry', 
                  style: 'default',
                  onPress: () => handleSubmit()
                }
              ]
            );
        } else {
            Alert.alert(
              'Validation Error', 
              result.message || result.errors.join('\n'),
              [{ text: 'OK' }]
            );
          }
        } else if (result.message) {
          const isTimeoutMessage = result.message.toLowerCase().includes('timeout');
          
          if (isTimeoutMessage) {
            Alert.alert(
              'Timeout Error',
              result.message + '\n\n💡 Try adding products in smaller batches.',
              [
                { text: 'OK', style: 'default' },
                { 
                  text: 'Retry', 
                  style: 'default',
                  onPress: () => handleSubmit()
                }
              ]
            );
          } else {
            Alert.alert(
              'Error', 
              result.message,
              [{ text: 'OK' }]
            );
          }
        } else {
          Alert.alert(
            'Error', 
            'An unknown error occurred. Please try again.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error: any) {
      console.error('❌ [EXCEPTION] Error creating stock movement:');
      console.error('❌ Error name:', error.name);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      
      if (error.response) {
        console.error('❌ Response status:', error.response.status);
        console.error('❌ Response headers:', error.response.headers);
        console.error('❌ Response data:', error.response.data);
      } else if (error.request) {
        console.error('❌ No response received');
        console.error('❌ Request:', error.request);
      }
      
      Alert.alert(
        'Network Error', 
        error.message || 'Failed to connect to server. Please check your internet connection and try again.'
      );
    } finally {
      console.log('🏁 handleSubmit completed');
      setIsSubmitting(false);
    }
  };

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
                  router.push('/details/create-department');
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
                    selectedDepartment?.id === item.id && styles.departmentDropdownItemActive
                  ]}
                  onPress={() => selectDepartment(item)}
                >
                  <Text style={styles.departmentIcon}>{item.icon}</Text>
                  <View style={styles.departmentInfo}>
                    <Text style={[
                      styles.departmentDropdownText,
                      selectedDepartment?.id === item.id && styles.departmentDropdownTextActive
                    ]}>
                      {item.name}
                    </Text>
                    {item.description && (
                      <Text style={styles.departmentDescription}>
                        {item.description}
                      </Text>
                    )}
                  </View>
                  {selectedDepartment?.id === item.id && (
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
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Fixed Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Stock Movement</Text>
        <Text style={styles.headerSubtitle}>Manage inventory movements</Text>
      </View>

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          style={styles.contentContainer} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
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
                      onPress={() => router.push('/details/create-department')}
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
                      {selectedDepartment ? (
                        <>
                          <Text style={styles.departmentIcon}>
                            {selectedDeptInfo?.icon || '🏢'}
                          </Text>
                          <View style={styles.departmentTriggerInfo}>
                            <Text style={styles.departmentTriggerLabel}>{selectedDepartment.name}</Text>
                            <Text style={styles.departmentTriggerDescription}>
                              Department ID: {selectedDepartment.id}
                            </Text>
                          </View>
                        </>
                      ) : (
                        <Text style={styles.dropdownPlaceholder}>Select a department</Text>
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

            {/* Products Section */}
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
                const unitLower = product.unit.toLowerCase();
                const isDecimalUnit = ['kg', 'g', 'lb', 'oz', 'liter', 'l', 'lt'].includes(unitLower);
                const placeholderText = isDecimalUnit ? "0.5" : "1";
                
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
                            Quantity * 
                            
                        </Text>
                        <TextInput
                          style={styles.textInput}
                            placeholder={placeholderText}
                          placeholderTextColor={isDarkMode ? "#94a3b8" : "#9ca3af"}
                            keyboardType="decimal-pad"
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

            {/* Summary Section */}
            {selectedProducts.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.summaryHeaderRow}>
                    <Ionicons 
                      name={movementType === 'stock_in' ? 'arrow-down-circle' : 'arrow-forward-circle'} 
                      size={24} 
                      color={movementType === 'stock_in' ? '#10b981' : '#6366f1'} 
                    />
                    <Text style={styles.sectionTitle}>
                      {movementType === 'stock_in' ? 'Stock In' : 'Distribution'} Summary
                    </Text>
                  </View>
                </View>

                {/* Movement Type Info */}
                <View style={styles.summaryInfoCard}>
                  <View style={styles.summaryInfoRow}>
                    <Ionicons name="information-circle-outline" size={18} color={isDarkMode ? "#94a3b8" : "#64748b"} />
                    <Text style={styles.summaryInfoLabel}>Type:</Text>
                    <Text style={styles.summaryInfoValue}>
                      {movementType === 'stock_in' ? '📥 Stock In' : '📤 Distribution'}
                    </Text>
                  </View>

                  {movementType === 'stock_in' && supplier && (
                    <View style={styles.summaryInfoRow}>
                      <Ionicons name="storefront-outline" size={18} color={isDarkMode ? "#94a3b8" : "#64748b"} />
                      <Text style={styles.summaryInfoLabel}>Supplier:</Text>
                      <Text style={styles.summaryInfoValue}>{supplier}</Text>
                    </View>
                  )}

                  {movementType === 'distribution' && selectedDepartment && (
                    <View style={styles.summaryInfoRow}>
                      <Ionicons name="business-outline" size={18} color={isDarkMode ? "#94a3b8" : "#64748b"} />
                      <Text style={styles.summaryInfoLabel}>Department:</Text>
                      <Text style={styles.summaryInfoValue}>{selectedDepartment.name}</Text>
                    </View>
                  )}

                  <View style={styles.summaryInfoRow}>
                    <Ionicons name="cube-outline" size={18} color={isDarkMode ? "#94a3b8" : "#64748b"} />
                    <Text style={styles.summaryInfoLabel}>Total Products:</Text>
                    <Text style={[styles.summaryInfoValue, styles.summaryHighlight]}>
                      {selectedProducts.length}
                    </Text>
                  </View>
                </View>

                {/* Products List */}
                <View style={styles.summaryProductsContainer}>
                  <Text style={styles.summaryProductsTitle}>Products:</Text>
                  {selectedProducts.map((product, index) => {
                    const quantity = product.quantity ? parseFloat(product.quantity.replace(',', '.')) : 0;
                    const isValidQuantity = !isNaN(quantity) && quantity > 0;
                    
                    return (
                      <View key={index} style={styles.summaryProductItem}>
                        <View style={styles.summaryProductNumber}>
                          <Text style={styles.summaryProductNumberText}>{index + 1}</Text>
                        </View>
                        <View style={styles.summaryProductDetails}>
                          <Text style={styles.summaryProductName} numberOfLines={1}>
                            {product.productName || 'Unnamed Product'}
                          </Text>
                          <View style={styles.summaryProductQuantity}>
                            <Text style={styles.summaryProductQuantityText}>
                              {isValidQuantity ? quantity : '0'} {product.unit || 'units'}
                            </Text>
                            {!isValidQuantity && (
                              <Ionicons name="warning-outline" size={14} color="#ef4444" />
                            )}
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* Total Quantities Summary */}
                <View style={styles.summaryTotalsCard}>
                  <View style={styles.summaryTotalRow}>
                    <Text style={styles.summaryTotalLabel}>Total Items:</Text>
                    <Text style={styles.summaryTotalValue}>
                      {selectedProducts.reduce((sum, p) => {
                        const qty = p.quantity ? parseFloat(p.quantity.replace(',', '.')) : 0;
                        return sum + (isNaN(qty) ? 0 : qty);
                      }, 0).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.summaryTotalRow}>
                    <Text style={styles.summaryTotalLabel}>Products Count:</Text>
                    <Text style={[styles.summaryTotalValue, styles.summaryHighlight]}>
                      {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>

                {/* Notes Preview */}
                {notes.trim() && (
                  <View style={styles.summaryNotesCard}>
                    <View style={styles.summaryInfoRow}>
                      <Ionicons name="document-text-outline" size={18} color={isDarkMode ? "#94a3b8" : "#64748b"} />
                      <Text style={styles.summaryInfoLabel}>Notes:</Text>
                    </View>
                    <Text style={styles.summaryNotesText}>{notes}</Text>
                  </View>
                )}
              </View>
            )}

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
                <View style={styles.submittingContainer}>
                  <ActivityIndicator color="#ffffff" size="small" />
                  <Text style={styles.submittingText}>
                    Processing {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''}...
                  </Text>
                </View>
              ) : (
                <Text style={styles.submitButtonText}>
                  Confirm {movementType === 'stock_in' ? 'Stock In' : 'Distribution'}
                  {selectedProducts.length > 0 && ` (${selectedProducts.length} product${selectedProducts.length !== 1 ? 's' : ''})`}
                </Text>
              )}
            </TouchableOpacity>
            
            {/* Warning for many products */}
            {selectedProducts.length > 10 && (
              <View style={styles.warningContainer}>
                <Ionicons name="warning-outline" size={16} color="#f59e0b" />
                <Text style={styles.warningText}>
                  Adding many products at once may take longer. Consider adding in smaller batches for better performance.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>

      {/* Product Selection Modal */}
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

      {/* Department Dropdown Modal */}
      <DepartmentDropdownModal />
    </KeyboardAvoidingView>
  );
}
const getStyles = (isDarkMode: boolean, movementType: 'stock_in' | 'distribution') => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDarkMode ? "#0f172a" : "#f8fafc",
  },
  scrollContent: {
    flexGrow: 1,
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
    fontSize: 12,
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
  unitTypeHint: {
    fontSize: 12,
    color: isDarkMode ? "#64748b" : "#94a3b8",
    fontWeight: 'normal',
    fontStyle: 'italic',
  },
  currentStockInfo: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 120
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
  contentContainer: {
    flex: 1,
  },
  submittingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submittingText: {
    color: '#ffffff',
    fontSize: 14,
    marginLeft: 8,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: isDarkMode ? "#78350f" : "#fef3c7",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: isDarkMode ? "#fbbf24" : "#92400e",
    lineHeight: 16,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryInfoCard: {
    backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: movementType === 'stock_in' ? '#10b981' : '#6366f1',
  },
  summaryInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  summaryInfoLabel: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontWeight: '500',
    marginLeft: 4,
  },
  summaryInfoValue: {
    fontSize: 14,
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  summaryHighlight: {
    color: movementType === 'stock_in' ? '#10b981' : '#6366f1',
    fontSize: 16,
  },
  summaryProductsContainer: {
    backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  summaryProductsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 12,
  },
  summaryProductItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "#475569" : "#e2e8f0",
  },
  summaryProductNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: movementType === 'stock_in' ? '#10b981' : '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  summaryProductNumberText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  summaryProductDetails: {
    flex: 1,
  },
  summaryProductName: {
    fontSize: 15,
    fontWeight: '600',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 4,
  },
  summaryProductQuantity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryProductQuantityText: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontWeight: '500',
  },
  summaryTotalsCard: {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: movementType === 'stock_in' ? '#10b981' : '#6366f1',
  },
  summaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? "#cbd5e1" : "#475569",
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
  },
  summaryNotesCard: {
    backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: isDarkMode ? "#64748b" : "#94a3b8",
  },
  summaryNotesText: {
    fontSize: 14,
    color: isDarkMode ? "#cbd5e1" : "#475569",
    marginTop: 8,
    lineHeight: 20,
    fontStyle: 'italic',
  },
});