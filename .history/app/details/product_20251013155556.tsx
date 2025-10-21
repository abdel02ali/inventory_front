import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { deleteProductImage, getProductImage } from "../../utils/productImageStorage";
import { deleteProduct, updateProduct } from "../api";

export default function ProductDetailScreen() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const router = useRouter();
  const { id, name, quantity: q, unit, category, description } = useLocalSearchParams();

  // Helper functions
  const getQuantityFromParams = () => {
    const quantityParam = Array.isArray(q) ? q[0] : q;
    return Number(quantityParam) || 0;
  };

  const getUnitFromParams = () => {
    const unitParam = Array.isArray(unit) ? unit[0] : unit;
    return String(unitParam || "units");
  };

  const getCategoryFromParams = () => {
    const categoryParam = Array.isArray(category) ? category[0] : category;
    return String(categoryParam || "Other");
  };

  const getDescriptionFromParams = () => {
    const descriptionParam = Array.isArray(description) ? description[0] : description;
    return String(descriptionParam || "");
  };

  const getNameFromParams = () => {
    const nameParam = Array.isArray(name) ? name[0] : name;
    return String(nameParam || "Unknown Product");
  };

  // State
  const [quantity, setQuantity] = useState(getQuantityFromParams());
  const [stockOperation, setStockOperation] = useState<'add' | 'remove'>('add');
  const [operationAmount, setOperationAmount] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(getNameFromParams());
  const [editedUnit, setEditedUnit] = useState(getUnitFromParams());
  const [editedCategory, setEditedCategory] = useState(getCategoryFromParams());
  const [editedDescription, setEditedDescription] = useState(getDescriptionFromParams());
  const [isLoading, setIsLoading] = useState(false);
  const [productImage, setProductImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);

  // Common unit options
  const unitOptions = ['kg', 'g', 'L', 'mL', 'box', 'piece', 'pack', 'bottle', 'can', 'bag'];
  const quickAmounts = [1, 5, 10, 25, 50, 100];

  // Load product image
  useEffect(() => {
    loadProductImage();
  }, [id]);

  const loadProductImage = async () => {
    try {
      setImageLoading(true);
      const productId = Array.isArray(id) ? id[0] : id;
      const imageUri = await getProductImage(productId);
      setProductImage(imageUri);
    } catch (error) {
      console.error('❌ Error loading product image:', error);
      setProductImage(null);
    } finally {
      setImageLoading(false);
    }
  };

  // Stock operations
  const handleStockOperation = () => {
    const amount = parseInt(operationAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Invalid Input", "Please enter a positive number.");
      return;
    }

    let newQuantity = quantity;
    if (stockOperation === 'add') {
      newQuantity = quantity + amount;
      Alert.alert("✅ Stock Added", `${amount} ${editedUnit} added to inventory!`);
    } else {
      if (amount > quantity) {
        Alert.alert("Insufficient Stock", `Cannot remove more than current stock (${quantity} ${editedUnit})`);
        return;
      }
      newQuantity = quantity - amount;
      Alert.alert("📤 Stock Removed", `${amount} ${editedUnit} removed from inventory!`);
    }

    setQuantity(newQuantity);
    setOperationAmount("");
    
    // Auto-save the quantity change
    handleQuickSave(newQuantity);
  };

  const handleQuickAmount = (amount: number) => {
    setOperationAmount(amount.toString());
  };

  const handleQuickSave = async (newQuantity: number) => {
    try {
      const productId = Array.isArray(id) ? id[0] : id;
      await updateProduct(productId, { quantity: newQuantity });
    } catch (error) {
      console.error("❌ Quick save error:", error);
      // Silent fail - user can manually save if needed
    }
  };

  // Update product
  const handleUpdate = async () => {
    if (!editedName.trim() || !editedUnit.trim()) {
      Alert.alert("Error", "Please enter valid values for name and unit.");
      return;
    }

    setIsLoading(true);
    try {
      const productId = Array.isArray(id) ? id[0] : id;
      const updateData = {
        name: editedName.trim(),
        unit: editedUnit.trim(),
        category: editedCategory.trim(),
        description: editedDescription.trim(),
        quantity: quantity
      };

      await updateProduct(productId, updateData);
      
      Alert.alert(
        "✅ Success", 
        `Product updated successfully!`,
        [
          { 
            text: "OK", 
            onPress: () => {
              setIsEditing(false);
              router.back();
            }
          }
        ]
      );
    } catch (error) {
      console.error("❌ Update product error:", error);
      Alert.alert("❌ Error", "Failed to update product. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Delete product
  const handleDelete = () => {
    Alert.alert(
      "🗑️ Delete Product",
      "Are you sure you want to delete this product? This action cannot be undone.",
      [
        { 
          text: "Cancel", 
          style: "cancel" 
        },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: handleConfirmDelete 
        }
      ]
    );
  };

  const handleConfirmDelete = async () => {
    setIsLoading(true);
    try {
      const productId = Array.isArray(id) ? id[0] : id;
      await deleteProduct(productId);
      await deleteProductImage(productId);
      
      Alert.alert(
        "✅ Success", 
        "Product has been deleted.",
        [
          { 
            text: "OK", 
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      console.error("❌ Delete product error:", error);
      Alert.alert("❌ Error", "Failed to delete product. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedName(getNameFromParams());
    setEditedUnit(getUnitFromParams());
    setEditedCategory(getCategoryFromParams());
    setEditedDescription(getDescriptionFromParams());
    setIsEditing(false);
  };

  const getStockStatus = () => {
    if (quantity === 0) return { status: 'Out of Stock', color: '#ef4444', bgColor: '#fef2f2' };
    if (quantity <= 5) return { status: 'Very Low', color: '#f97316', bgColor: '#fff7ed' };
    if (quantity <= 15) return { status: 'Low Stock', color: '#f59e0b', bgColor: '#fffbeb' };
    return { status: 'In Stock', color: '#10b981', bgColor: '#f0fdf4' };
  };

  const stockStatus = getStockStatus();

  const styles = getStyles(isDarkMode);

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView 
        style={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header with Quick Actions */}
        <View style={styles.header}>
          <View style={styles.headerBackground} />
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{editedName}</Text>
            <Text style={styles.headerSubtitle}>Product Management</Text>
            
            {/* Quick Status Bar */}
            <View style={[styles.statusBar, { backgroundColor: stockStatus.bgColor }]}>
              <View style={[styles.statusDot, { backgroundColor: stockStatus.color }]} />
              <Text style={[styles.statusText, { color: stockStatus.color }]}>
                {stockStatus.status} • {quantity} {editedUnit}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Stock Operations */}
        <View style={styles.operationsCard}>
          <Text style={styles.cardTitle}>⚡ Quick Stock Operations</Text>
          
          {/* Operation Type Toggle */}
          <View style={styles.operationToggle}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                stockOperation === 'add' && styles.toggleButtonActive
              ]}
              onPress={() => setStockOperation('add')}
            >
              <Text style={[
                styles.toggleButtonText,
                stockOperation === 'add' && styles.toggleButtonTextActive
              ]}>
                📥 Add Stock
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                stockOperation === 'remove' && styles.toggleButtonActive
              ]}
              onPress={() => setStockOperation('remove')}
            >
              <Text style={[
                styles.toggleButtonText,
                stockOperation === 'remove' && styles.toggleButtonTextActive
              ]}>
                📤 Remove Stock
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quick Amount Buttons */}
          <View style={styles.quickAmountsContainer}>
            <Text style={styles.quickAmountsLabel}>Quick Amounts:</Text>
            <View style={styles.quickAmountsRow}>
              {quickAmounts.map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={styles.quickAmountButton}
                  onPress={() => handleQuickAmount(amount)}
                >
                  <Text style={styles.quickAmountText}>{amount}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Amount Input */}
          <View style={styles.amountInputContainer}>
            <TextInput
              style={styles.amountInput}
              placeholder={`Enter ${editedUnit} to ${stockOperation}`}
              placeholderTextColor={isDarkMode ? "#94a3b8" : "#9ca3af"}
              keyboardType="numeric"
              value={operationAmount}
              onChangeText={setOperationAmount}
            />
            <TouchableOpacity
              style={[
                styles.operationButton,
                stockOperation === 'add' ? styles.addButton : styles.removeButton,
                (!operationAmount || parseInt(operationAmount) <= 0) && styles.operationButtonDisabled
              ]}
              onPress={handleStockOperation}
              disabled={!operationAmount || parseInt(operationAmount) <= 0}
            >
              <Text style={styles.operationButtonText}>
                {stockOperation === 'add' ? 'Add' : 'Remove'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Product Information */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>📋 Product Details</Text>
            <TouchableOpacity
              style={styles.editToggle}
              onPress={() => setIsEditing(!isEditing)}
            >
              <Text style={styles.editToggleText}>
                {isEditing ? '✕ Cancel' : '✏️ Edit'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.detailsGrid}>
            {/* Name */}
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Product Name</Text>
              {isEditing ? (
                <TextInput
                  style={styles.detailInput}
                  value={editedName}
                  onChangeText={setEditedName}
                  placeholder="Product name"
                />
              ) : (
                <Text style={styles.detailValue}>{editedName}</Text>
              )}
            </View>

            {/* Current Stock */}
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Current Stock</Text>
              <Text style={[styles.detailValue, styles.stockValue]}>{quantity} {editedUnit}</Text>
            </View>

            {/* Unit */}
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Unit</Text>
              {isEditing ? (
                <View style={styles.unitSection}>
                  <TextInput
                    style={styles.detailInput}
                    value={editedUnit}
                    onChangeText={setEditedUnit}
                    placeholder="Unit"
                  />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitScroll}>
                    {unitOptions.map((unitOption) => (
                      <TouchableOpacity
                        key={unitOption}
                        style={[
                          styles.unitChip,
                          editedUnit === unitOption && styles.unitChipActive
                        ]}
                        onPress={() => setEditedUnit(unitOption)}
                      >
                        <Text style={[
                          styles.unitChipText,
                          editedUnit === unitOption && styles.unitChipTextActive
                        ]}>
                          {unitOption}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              ) : (
                <Text style={styles.detailValue}>{editedUnit}</Text>
              )}
            </View>

            {/* Category */}
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Category</Text>
              {isEditing ? (
                <TextInput
                  style={styles.detailInput}
                  value={editedCategory}
                  onChangeText={setEditedCategory}
                  placeholder="Category"
                />
              ) : (
                <Text style={styles.detailValue}>{editedCategory}</Text>
              )}
            </View>

            {/* Description */}
            <View style={[styles.detailItem, styles.fullWidth]}>
              <Text style={styles.detailLabel}>Description</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.detailInput, styles.textArea]}
                  value={editedDescription}
                  onChangeText={setEditedDescription}
                  placeholder="Description (optional)"
                  multiline
                  numberOfLines={3}
                />
              ) : (
                <Text style={[styles.detailValue, styles.descriptionText]}>
                  {editedDescription || "No description"}
                </Text>
              )}
            </View>
          </View>

          {/* Save Button when editing */}
          {isEditing && (
            <TouchableOpacity
              style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
              onPress={handleUpdate}
              disabled={isLoading}
            >
              <Text style={styles.saveButtonText}>
                {isLoading ? "💾 Saving..." : "💾 Save Changes"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Danger Zone */}
        <View style={styles.dangerCard}>
          <Text style={styles.dangerTitle}>⚠️ Danger Zone</Text>
          <Text style={styles.dangerDescription}>
            Once you delete a product, there is no going back. Please be certain.
          </Text>
          <TouchableOpacity
            style={[styles.deleteButton, isLoading && styles.deleteButtonDisabled]}
            onPress={handleDelete}
            disabled={isLoading}
          >
            <Text style={styles.deleteButtonText}>
              {isLoading ? "Deleting..." : "🗑️ Delete Product"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    paddingBottom: 24,
  },
  // Header Styles
  header: {
    position: 'relative',
    height: 180,
    marginBottom: 16,
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#6366f1',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 50,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    padding: 8,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
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
    marginBottom: 12,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Operations Card
  operationsCard: {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: isDarkMode ? 0.2 : 0.1,
    shadowRadius: 16,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 16,
  },
  operationToggle: {
    flexDirection: 'row',
    backgroundColor: isDarkMode ? "#334155" : "#f1f5f9",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: isDarkMode ? "#475569" : "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  toggleButtonTextActive: {
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
  },
  quickAmountsContainer: {
    marginBottom: 16,
  },
  quickAmountsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? "#94a3b8" : "#64748b",
    marginBottom: 8,
  },
  quickAmountsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickAmountButton: {
    backgroundColor: isDarkMode ? "#334155" : "#e2e8f0",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? "#f1f5f9" : "#475569",
  },
  amountInputContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  amountInput: {
    flex: 1,
    backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#cbd5e1",
    borderRadius: 12,
    padding: 16,
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    fontSize: 16,
  },
  operationButton: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  addButton: {
    backgroundColor: '#10b981',
  },
  removeButton: {
    backgroundColor: '#f59e0b',
  },
  operationButtonDisabled: {
    backgroundColor: isDarkMode ? "#374151" : "#9ca3af",
    opacity: 0.6,
  },
  operationButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Product Details Card
  card: {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: isDarkMode ? 0.2 : 0.1,
    shadowRadius: 16,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  editToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: isDarkMode ? "#334155" : "#f1f5f9",
  },
  editToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? "#f1f5f9" : "#475569",
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  detailItem: {
    width: '48%',
    marginBottom: 16,
  },
  fullWidth: {
    width: '100%',
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: isDarkMode ? "#94a3b8" : "#64748b",
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#e2e8f0",
  },
  stockValue: {
    color: '#6366f1',
    fontWeight: 'bold',
  },
  detailInput: {
    backgroundColor: isDarkMode ? "#334155" : "#ffffff",
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#cbd5e1",
    borderRadius: 8,
    padding: 12,
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  descriptionText: {
    fontStyle: 'italic',
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  unitSection: {
    gap: 8,
  },
  unitScroll: {
    maxHeight: 40,
  },
  unitChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: isDarkMode ? "#475569" : "#e2e8f0",
    marginRight: 8,
  },
  unitChipActive: {
    backgroundColor: '#6366f1',
  },
  unitChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  unitChipTextActive: {
    color: '#ffffff',
  },
  saveButton: {
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  saveButtonDisabled: {
    backgroundColor: isDarkMode ? "#374151" : "#9ca3af",
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Danger Zone
  dangerCard: {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#ef4444',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: isDarkMode ? 0.2 : 0.1,
    shadowRadius: 16,
    elevation: 5,
  },
  dangerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 8,
  },
  dangerDescription: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    marginBottom: 16,
    lineHeight: 20,
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonDisabled: {
    backgroundColor: isDarkMode ? "#374151" : "#9ca3af",
    opacity: 0.6,
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});