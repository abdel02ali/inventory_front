// app/stock-movement.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Product } from '../types/model';

type Department = 'pastry' | 'bakery' | 'cleaning' | 'magazin';
type MovementType = 'stock_in' | 'distribution';

type ProductSelection = {
  productId: string;
  productName: string;
  quantity: string;
  unit: string;
};

const departments: { key: Department; label: string; icon: string; color: string }[] = [
  { key: 'pastry', label: 'Pastry', icon: '🥐', color: '#f59e0b' },
  { key: 'bakery', label: 'Bakery', icon: '🍞', color: '#84cc16' },
  { key: 'cleaning', label: 'Cleaning', icon: '🧹', color: '#06b6d4' },
  { key: 'magazin', label: 'Office', icon: '👔', color: '#8b5cf6' },
];

// Sub-components (defined outside main component)
const BaseModal = ({ visible, onClose, title, children, styles }: any) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <View style={styles.dropdownContainer}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>{title}</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color={styles.dropdownTitle.color} />
              </TouchableOpacity>
            </View>
            {children}
          </View>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  </Modal>
);

const SearchBar = ({ value, onChangeText, placeholder, styles }: any) => (
  <View style={styles.searchContainer}>
    <Ionicons name="search" size={20} color={styles.searchContainer.borderColor} />
    <TextInput
      style={styles.searchInput}
      placeholder={placeholder}
      placeholderTextColor={styles.searchInput.placeholderTextColor}
      value={value}
      onChangeText={onChangeText}
      autoFocus
    />
  </View>
);

const ProductList = ({ products, selectedProducts, movementType, onSelectProduct, getProductStock, styles }: any) => (
  <FlatList
    data={products}
    keyExtractor={(item) => item.id}
    renderItem={({ item }) => {
      const isSelected = selectedProducts.some((p: any) => p.productId === item.id);
      const currentStock = getProductStock(item);
      
      return (
        <TouchableOpacity
          style={[
            styles.dropdownItem,
            isSelected && styles.dropdownItemSelected
          ]}
          onPress={() => onSelectProduct(item)}
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
          {isSelected && <Ionicons name="checkmark" size={20} color="#10b981" />}
        </TouchableOpacity>
      );
    }}
    ListEmptyComponent={
      <View style={styles.emptyDropdown}>
        <Text style={styles.emptyDropdownText}>
          {products.length === 0 ? 'No products available' : 'No products found'}
        </Text>
      </View>
    }
  />
);

const AddProductFooter = ({ onPress, styles }: any) => (
  <TouchableOpacity style={styles.addNewProductFooter} onPress={onPress}>
    <Ionicons name="add-circle" size={20} color="#10b981" />
    <Text style={styles.addNewProductText}>Add New Product</Text>
  </TouchableOpacity>
);

const DepartmentItem = ({ department, isSelected, onSelect, styles }: any) => (
  <TouchableOpacity
    style={[
      styles.departmentDropdownItem,
      isSelected && styles.departmentDropdownItemActive
    ]}
    onPress={() => onSelect(department.key)}
  >
    <Text style={styles.departmentIcon}>{department.icon}</Text>
    <View style={styles.departmentInfo}>
      <Text style={[
        styles.departmentDropdownText,
        isSelected && styles.departmentDropdownTextActive
      ]}>
        {department.label}
      </Text>
    </View>
    {isSelected && <Ionicons name="checkmark" size={20} color="#10b981" />}
  </TouchableOpacity>
);

const MovementTypeSelector = ({ movementType, onTypeChange, styles }: any) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Movement Type</Text>
    <View style={styles.typeSelector}>
      {(['stock_in', 'distribution'] as MovementType[]).map(type => (
        <TouchableOpacity
          key={type}
          style={[styles.typeButton, movementType === type && styles.typeButtonActive]}
          onPress={() => onTypeChange(type)}
        >
          <Text style={[styles.typeButtonText, movementType === type && styles.typeButtonTextActive]}>
            {type === 'stock_in' ? '📥 Stock In' : '📤 Distribution'}
          </Text>
          <Text style={styles.typeDescription}>
            {type === 'stock_in' ? 'Add products to inventory' : 'Distribute to departments'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

const DepartmentSelector = ({ selectedDeptInfo, onPress, styles }: any) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Select Department</Text>
    <TouchableOpacity style={styles.departmentDropdownTrigger} onPress={onPress}>
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
      <Ionicons name="chevron-down" size={20} color={styles.departmentTriggerLabel.color} />
    </TouchableOpacity>
  </View>
);

const SupplierInput = ({ supplier, onSupplierChange, styles }: any) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Supplier Information</Text>
    <TextInput
      style={styles.textInput}
      placeholder="Enter supplier name"
      placeholderTextColor={styles.textInput.placeholderTextColor}
      value={supplier}
      onChangeText={onSupplierChange}
    />
  </View>
);

const NotesInput = ({ notes, onNotesChange, styles }: any) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Notes (Optional)</Text>
    <TextInput
      style={[styles.textInput, styles.textArea]}
      placeholder="Add any notes about this movement..."
      placeholderTextColor={styles.textInput.placeholderTextColor}
      multiline
      numberOfLines={3}
      value={notes}
      onChangeText={onNotesChange}
    />
  </View>
);

const SubmitButton = ({ isSubmitting, movementType, onPress, styles }: any) => (
  <TouchableOpacity
    style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
    onPress={onPress}
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
);

const ProductCard = ({
  product,
  index,
  movementType,
  onRemove,
  onUpdate,
  onOpenDropdown,
  getCurrentStockForProduct,
  isDistributionQuantityValid,
  styles
}: any) => (
  <View style={styles.productCard}>
    <View style={styles.productHeader}>
      <Text style={styles.productNumber}>Product {index + 1}</Text>
      <TouchableOpacity style={styles.deleteButton} onPress={onRemove}>
        <Ionicons name="trash-outline" size={18} color="#ef4444" />
      </TouchableOpacity>
    </View>

    <View style={styles.productForm}>
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Product *</Text>
        <TouchableOpacity style={styles.dropdownTrigger} onPress={onOpenDropdown}>
          <Text style={[styles.dropdownTriggerText, !product.productName && styles.dropdownPlaceholder]}>
            {product.productName || 'Select a product'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={styles.dropdownTriggerText.color} />
        </TouchableOpacity>
      </View>

      <View style={styles.productRow}>
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
            placeholderTextColor={styles.textInput.placeholderTextColor}
            keyboardType="numeric"
            value={product.quantity}
            onChangeText={(value) => onUpdate('quantity', value)}
          />
        </View>

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

const ProductsSection = ({
  selectedProducts,
  availableProducts,
  movementType,
  onAddProduct,
  onRemoveProduct,
  onUpdateProduct,
  onOpenProductDropdown,
  getCurrentStockForProduct,
  isDistributionQuantityValid,
  styles
}: any) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <View>
        <Text style={styles.sectionTitle}>Products</Text>
        <Text style={styles.sectionSubtitle}>
          {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected
        </Text>
      </View>
    </View>

    {selectedProducts.map((product: any, index: number) => (
      <ProductCard
        key={index}
        product={product}
        index={index}
        movementType={movementType}
        onRemove={() => onRemoveProduct(index)}
        onUpdate={(field: any, value: any) => onUpdateProduct(index, field, value)}
        onOpenDropdown={() => onOpenProductDropdown(index)}
        getCurrentStockForProduct={getCurrentStockForProduct}
        isDistributionQuantityValid={isDistributionQuantityValid}
        styles={styles}
      />
    ))}

    <TouchableOpacity style={styles.addProductButton} onPress={onAddProduct}>
      <Ionicons name="add-circle-outline" size={20} color="#6366f1" />
      <Text style={styles.addProductButtonText}>Add Product</Text>
    </TouchableOpacity>

    {selectedProducts.length === 0 && (
      <View style={styles.emptyProducts}>
        <Ionicons name="cube-outline" size={48} color={styles.emptyProductsText.color} />
        <Text style={styles.emptyProductsText}>No products added</Text>
        <Text style={styles.emptyProductsSubtext}>Add products to continue</Text>
      </View>
    )}
  </View>
);

// Main Component
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
  const [productDropdownVisible, setProductDropdownVisible] = useState(false);
  const [activeProductIndex, setActiveProductIndex] = useState<number | null>(null);
  const [departmentDropdownVisible, setDepartmentDropdownVisible] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  const styles = getStyles(isDarkMode);

  // Memoized values
  const availableProducts = products || [];
  const selectedDeptInfo = useMemo(() => 
    departments.find(dept => dept.key === selectedDepartment), 
    [selectedDepartment]
  );

  const totalItems = useMemo(() => 
    selectedProducts.reduce((sum, product) => sum + (parseInt(product.quantity) || 0), 0), 
    [selectedProducts]
  );

  const totalProductsCount = selectedProducts.length;

  // Helper functions
  const getProductStock = useCallback((product: Product) => {
    return product.quantity ?? 0;
  }, []);

  const getCurrentStockForProduct = useCallback((productId: string) => {
    const product = availableProducts.find(p => p.id === productId);
    return product ? getProductStock(product) : 0;
  }, [availableProducts, getProductStock]);

  const isDistributionQuantityValid = useCallback((productId: string, quantity: string) => {
    if (movementType !== 'distribution') return true;
    const currentStock = getCurrentStockForProduct(productId);
    const requestedQuantity = parseInt(quantity) || 0;
    return requestedQuantity <= currentStock;
  }, [movementType, getCurrentStockForProduct]);

  const filteredProducts = useMemo(() => 
    availableProducts.filter(product =>
      product.name.toLowerCase().includes(productSearch.toLowerCase())
    ), 
    [availableProducts, productSearch]
  );

  // Effects
  useEffect(() => {
    refreshProducts();
  }, []);

  useEffect(() => {
    if (productDropdownVisible) {
      refreshProducts();
    }
  }, [productDropdownVisible]);

  // Product management
  const addProduct = () => {
    setSelectedProducts(prev => [
      ...prev,
      { productId: '', productName: '', quantity: '', unit: '' }
    ]);
  };

  const updateProduct = (index: number, field: keyof ProductSelection, value: string) => {
    setSelectedProducts(prev => {
      const updated = [...prev];
      
      if (field === 'quantity') {
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
          
          if (movementType === 'stock_in' && !updated[index].quantity) {
            updated[index].quantity = '1';
          }
        }
      }
      
      return updated;
    });
  };

  const removeProduct = (index: number) => {
    setSelectedProducts(prev => prev.filter((_, i) => i !== index));
  };

  // Dropdown handlers
  const openProductDropdown = (index: number) => {
    setActiveProductIndex(index);
    setProductSearch('');
    setProductDropdownVisible(true);
  };

  const closeProductDropdown = () => {
    setProductDropdownVisible(false);
    setActiveProductIndex(null);
    setProductSearch('');
  };

  const selectProduct = (product: Product) => {
    if (activeProductIndex !== null) {
      updateProduct(activeProductIndex, 'productId', product.id);
      closeProductDropdown();
    }
  };

  const selectDepartment = (department: Department) => {
    setSelectedDepartment(department);
    setDepartmentDropdownVisible(false);
  };

  const navigateToAddProduct = () => {
    closeProductDropdown();
    router.push('/details/add-product');
  };

  // Validation and submission
  const validateForm = () => {
    if (selectedProducts.length === 0) {
      Alert.alert('Error', 'Please add at least one product');
      return false;
    }

    const invalidProducts = selectedProducts.filter(product => 
      !product.productId || !product.quantity || parseInt(product.quantity) <= 0
    );

    if (invalidProducts.length > 0) {
      Alert.alert('Error', 'Please fill all product fields with valid quantities');
      return false;
    }

    if (movementType === 'distribution') {
      const insufficientStockProducts = selectedProducts.filter(product => 
        !isDistributionQuantityValid(product.productId, product.quantity)
      );

      if (insufficientStockProducts.length > 0) {
        const productNames = insufficientStockProducts.map(p => p.productName).join(', ');
        Alert.alert('Insufficient Stock', `The following products don't have enough stock: ${productNames}`);
        return false;
      }
    }

    if (movementType === 'stock_in' && !supplier.trim()) {
      Alert.alert('Error', 'Please enter supplier name for stock in');
      return false;
    }

    if (movementType === 'distribution' && !selectedDepartment) {
      Alert.alert('Error', 'Please select a department for distribution');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

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
        await refreshProducts();
        
        Alert.alert('Success!', result.message || 'Stock movement created successfully!', [
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
        ]);
      } else {
        const errorMessage = result.errors?.join('\n') || result.message || 'Failed to create stock movement.';
        Alert.alert(result.errors ? 'Validation Error' : 'Error', errorMessage);
      }
    } catch (error: any) {
      Alert.alert('Network Error', error.message || 'Failed to connect to server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Modal Components
  const ProductDropdownModal = () => (
    <BaseModal
      visible={productDropdownVisible}
      onClose={closeProductDropdown}
      title={`Select Product ${activeProductIndex !== null ? `(Product ${activeProductIndex + 1})` : ''}`}
      styles={styles}
    >
      <SearchBar
        value={productSearch}
        onChangeText={setProductSearch}
        placeholder="Search products..."
        styles={styles}
      />
      
      <ProductList
        products={filteredProducts}
        selectedProducts={selectedProducts}
        movementType={movementType}
        onSelectProduct={selectProduct}
        getProductStock={getProductStock}
        styles={styles}
      />
      
      <AddProductFooter onPress={navigateToAddProduct} styles={styles} />
    </BaseModal>
  );

  const DepartmentDropdownModal = () => (
    <BaseModal
      visible={departmentDropdownVisible}
      onClose={() => setDepartmentDropdownVisible(false)}
      title="Select Department"
      styles={styles}
    >
      <FlatList
        data={departments}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => (
          <DepartmentItem
            department={item}
            isSelected={selectedDepartment === item.key}
            onSelect={selectDepartment}
            styles={styles}
          />
        )}
      />
    </BaseModal>
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
            <MovementTypeSelector
              movementType={movementType}
              onTypeChange={setMovementType}
              styles={styles}
            />

            {/* Department Selection */}
            {movementType === 'distribution' && (
              <DepartmentSelector
                selectedDeptInfo={selectedDeptInfo}
                onPress={() => setDepartmentDropdownVisible(true)}
                styles={styles}
              />
            )}

            {/* Supplier */}
            {movementType === 'stock_in' && (
              <SupplierInput
                supplier={supplier}
                onSupplierChange={setSupplier}
                styles={styles}
              />
            )}

            {/* Products Section */}
            <ProductsSection
              selectedProducts={selectedProducts}
              availableProducts={availableProducts}
              movementType={movementType}
              onAddProduct={addProduct}
              onRemoveProduct={removeProduct}
              onUpdateProduct={updateProduct}
              onOpenProductDropdown={openProductDropdown}
              getCurrentStockForProduct={getCurrentStockForProduct}
              isDistributionQuantityValid={isDistributionQuantityValid}
              styles={styles}
            />

            {/* Quantity Summary */}
            {selectedProducts.length > 0 && (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Quantity Summary</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Products:</Text>
                  <Text style={styles.summaryValue}>{totalProductsCount}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Items:</Text>
                  <Text style={styles.summaryValue}>{totalItems}</Text>
                </View>
              </View>
            )}

            {/* Notes */}
            <NotesInput
              notes={notes}
              onNotesChange={setNotes}
              styles={styles}
            />

            {/* Submit Button */}
            <SubmitButton
              isSubmitting={isSubmitting}
              movementType={movementType}
              onPress={handleSubmit}
              styles={styles}
            />
          </View>

          {/* Dropdown Modals */}
          <ProductDropdownModal />
          <DepartmentDropdownModal />
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

// Styles (keep the same styles object from previous response)
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
  summaryCard: {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
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
    borderColor: isDarkMode ? "#94a3b8" : "#64748b",
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    placeholderTextColor: isDarkMode ? "#94a3b8" : "#9ca3af",
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