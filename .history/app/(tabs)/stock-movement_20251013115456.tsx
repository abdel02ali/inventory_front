// app/stock-movement.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import { useAppContext } from '../context/appContext';

type Department = 'pastry' | 'bakery' | 'cleaning' | 'management';
type MovementType = 'stock_in' | 'distribution';

type ProductSelection = {
  productId: string;
  productName: string;
  quantity: string;
  unit: string;
  price: string;
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

  const styles = getStyles(isDarkMode);

  // Department configuration
  const departments: { key: Department; label: string; icon: string; color: string }[] = [
    { key: 'pastry', label: 'Pastry Department', icon: '🥐', color: '#f59e0b' },
    { key: 'bakery', label: 'Bakery Department', icon: '🍞', color: '#84cc16' },
    { key: 'cleaning', label: 'Cleaning Department', icon: '🧹', color: '#06b6d4' },
    { key: 'management', label: 'Management', icon: '👔', color: '#8b5cf6' },
  ];

  // Available products from context
  const availableProducts = products || [];

  const addProduct = () => {
    setSelectedProducts([
      ...selectedProducts,
      { productId: '', productName: '', quantity: '', unit: '', price: '' }
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
      // Here you would make API calls to save the stock movement
      // For now, we'll just show a success message
      
      const movementData = {
        type: movementType,
        department: movementType === 'distribution' ? selectedDepartment : undefined,
        supplier: movementType === 'stock_in' ? supplier : undefined,
        notes,
        products: selectedProducts.map(p => ({
          ...p,
          quantity: parseInt(p.quantity),
          price: p.price ? parseFloat(p.price) : undefined
        }))
      };

      console.log('Submitting stock movement:', movementData);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      Alert.alert(
        'Success!',
        `Stock ${movementType === 'stock_in' ? 'added to' : 'distributed from'} inventory successfully`,
        [
          {
            text: 'OK',
            onPress: () => {
              router.back();
              // You might want to refresh the history screen here
            }
          }
        ]
      );

    } catch (error) {
      console.error('Error submitting stock movement:', error);
      Alert.alert('Error', 'Failed to save stock movement. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <View style={styles.departmentGrid}>
              {departments.map((dept) => (
                <TouchableOpacity
                  key={dept.key}
                  style={[
                    styles.departmentButton,
                    selectedDepartment === dept.key && styles.departmentButtonActive,
                    { borderLeftColor: dept.color }
                  ]}
                  onPress={() => setSelectedDepartment(dept.key)}
                >
                  <Text style={styles.departmentIcon}>{dept.icon}</Text>
                  <Text style={[
                    styles.departmentLabel,
                    selectedDepartment === dept.key && styles.departmentLabelActive
                  ]}>
                    {dept.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
                <TouchableOpacity onPress={() => removeProduct(index)}>
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>

              <View style={styles.productForm}>
                {/* Product Selection */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Product</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.productOptions}>
                      {availableProducts.map((prod) => (
                        <TouchableOpacity
                          key={prod.id}
                          style={[
                            styles.productOption,
                            product.productId === prod.id && styles.productOptionActive
                          ]}
                          onPress={() => updateProduct(index, 'productId', prod.id)}
                        >
                          <Text style={[
                            styles.productOptionText,
                            product.productId === prod.id && styles.productOptionTextActive
                          ]}>
                            {prod.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>

                {/* Quantity and Unit */}
                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 2 }]}>
                    <Text style={styles.inputLabel}>Quantity</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="0"
                      placeholderTextColor={isDarkMode ? "#94a3b8" : "#9ca3af"}
                      keyboardType="numeric"
                      value={product.quantity}
                      onChangeText={(value) => updateProduct(index, 'quantity', value)}
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                    <Text style={styles.inputLabel}>Unit</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="kg, units..."
                      placeholderTextColor={isDarkMode ? "#94a3b8" : "#9ca3af"}
                      value={product.unit}
                      onChangeText={(value) => updateProduct(index, 'unit', value)}
                    />
                  </View>
                </View>

                {/* Price (only for stock in) */}
                {movementType === 'stock_in' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Price (MAD)</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="0.00"
                      placeholderTextColor={isDarkMode ? "#94a3b8" : "#9ca3af"}
                      keyboardType="numeric"
                      value={product.price}
                      onChangeText={(value) => updateProduct(index, 'price', value)}
                    />
                  </View>
                )}
              </View>
            </View>
          ))}
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
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Saving...' : `Confirm ${movementType === 'stock_in' ? 'Stock In' : 'Distribution'}`}
          </Text>
        </TouchableOpacity>
      </View>
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
  departmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  departmentButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#e2e8f0",
    borderLeftWidth: 4,
    alignItems: 'center',
  },
  departmentButtonActive: {
    backgroundColor: isDarkMode ? "#1e1b4b" : "#e0e7ff",
  },
  departmentIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  departmentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: isDarkMode ? "#94a3b8" : "#64748b",
    textAlign: 'center',
  },
  departmentLabelActive: {
    color: isDarkMode ? "#e0e7ff" : "#3730a3",
    fontWeight: 'bold',
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
  row: {
    flexDirection: 'row',
  },
  productOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  productOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: isDarkMode ? "#475569" : "#e2e8f0",
  },
  productOptionActive: {
    backgroundColor: '#6366f1',
  },
  productOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: isDarkMode ? "#f1f5f9" : "#64748b",
  },
  productOptionTextActive: {
    color: '#ffffff',
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