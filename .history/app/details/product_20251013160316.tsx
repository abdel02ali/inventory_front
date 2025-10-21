import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme
} from "react-native";
import { deleteProductImage } from "../../utils/productImageStorage";
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

  // Common unit options
  const unitOptions = ['kg', 'g', 'L', 'mL', 'box', 'piece', 'pack', 'bottle', 'can', 'bag'];
  const quickAmounts = [1, 5, 10, 25, 50, 100];

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
      
      Alert.alert("✅ Success", `Product updated successfully!`);
      setIsEditing(false);
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
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: handleConfirmDelete }
      ]
    );
  };

  const handleConfirmDelete = async () => {
    setIsLoading(true);
    try {
      const productId = Array.isArray(id) ? id[0] : id;
      await deleteProduct(productId);
      await deleteProductImage(productId);
      Alert.alert("✅ Success", "Product has been deleted.");
      router.back();
    } catch (error) {
      console.error("❌ Delete product error:", error);
      Alert.alert("❌ Error", "Failed to delete product. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const getStockStatus = () => {
    if (quantity === 0) return { status: 'Out of Stock', color: '#ef4444', icon: '🔴' };
    if (quantity <= 5) return { status: 'Very Low', color: '#f97316', icon: '🟠' };
    if (quantity <= 15) return { status: 'Low Stock', color: '#f59e0b', icon: '🟡' };
    return { status: 'In Stock', color: '#10b981', icon: '🟢' };
  };

  const stockStatus = getStockStatus();

  const styles = getStyles(isDarkMode);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Product Details</Text>
          <TouchableOpacity 
            style={[styles.editButton, isEditing && styles.editButtonActive]}
            onPress={() => setIsEditing(!isEditing)}
          >
            <Text style={styles.editButtonText}>{isEditing ? 'Done' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.productHeader}>
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{editedName}</Text>
            <View style={styles.productMeta}>
              <Text style={styles.productId}>ID: {Array.isArray(id) ? id[0] : id}</Text>
              <Text style={styles.productCategory}>{editedCategory}</Text>
            </View>
          </View>
          <View style={[styles.stockBadge, { backgroundColor: stockStatus.color + '20' }]}>
            <Text style={[styles.stockStatus, { color: stockStatus.color }]}>
              {stockStatus.icon} {quantity} {editedUnit}
            </Text>
            <Text style={[styles.stockLabel, { color: stockStatus.color }]}>
              {stockStatus.status}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Quick Actions */}
        <View style={styles.quickActionsCard}>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          
          <View style={styles.operationSection}>
            <View style={styles.operationButtons}>
              <TouchableOpacity
                style={[styles.operationButton, stockOperation === 'add' && styles.operationButtonActive]}
                onPress={() => setStockOperation('add')}
              >
                <Text style={[styles.operationButtonText, stockOperation === 'add' && styles.operationButtonTextActive]}>
                  ➕ Add
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.operationButton, stockOperation === 'remove' && styles.operationButtonActive]}
                onPress={() => setStockOperation('remove')}
              >
                <Text style={[styles.operationButtonText, stockOperation === 'remove' && styles.operationButtonTextActive]}>
                  ➖ Remove
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.amountSection}>
              <Text style={styles.amountLabel}>Amount ({editedUnit})</Text>
              <View style={styles.quickAmountGrid}>
                {quickAmounts.map((amount) => (
                  <TouchableOpacity
                    key={amount}
                    style={[styles.quickAmount, operationAmount === amount.toString() && styles.quickAmountActive]}
                    onPress={() => handleQuickAmount(amount)}
                  >
                    <Text style={[styles.quickAmountText, operationAmount === amount.toString() && styles.quickAmountTextActive]}>
                      {amount}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <View style={styles.customAmount}>
                <TextInput
                  style={styles.customAmountInput}
                  placeholder="Custom amount"
                  placeholderTextColor={isDarkMode ? "#94a3b8" : "#9ca3af"}
                  keyboardType="numeric"
                  value={operationAmount}
                  onChangeText={setOperationAmount}
                />
                <TouchableOpacity
                  style={[styles.applyButton, (!operationAmount || parseInt(operationAmount) <= 0) && styles.applyButtonDisabled]}
                  onPress={handleStockOperation}
                  disabled={!operationAmount || parseInt(operationAmount) <= 0}
                >
                  <Text style={styles.applyButtonText}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Product Information */}
        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>Product Information</Text>
          
          <View style={styles.detailsGrid}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Product Name</Text>
              {isEditing ? (
                <TextInput
                  style={styles.textInput}
                  value={editedName}
                  onChangeText={setEditedName}
                  placeholder="Product name"
                />
              ) : (
                <Text style={styles.detailValue}>{editedName}</Text>
              )}
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Unit</Text>
              {isEditing ? (
                <View style={styles.unitContainer}>
                  <TextInput
                    style={styles.textInput}
                    value={editedUnit}
                    onChangeText={setEditedUnit}
                    placeholder="Unit"
                  />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitChips}>
                    {unitOptions.map((unitOption) => (
                      <TouchableOpacity
                        key={unitOption}
                        style={[styles.unitChip, editedUnit === unitOption && styles.unitChipActive]}
                        onPress={() => setEditedUnit(unitOption)}
                      >
                        <Text style={[styles.unitChipText, editedUnit === unitOption && styles.unitChipTextActive]}>
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

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Category</Text>
              {isEditing ? (
                <TextInput
                  style={styles.textInput}
                  value={editedCategory}
                  onChangeText={setEditedCategory}
                  placeholder="Category"
                />
              ) : (
                <Text style={styles.detailValue}>{editedCategory}</Text>
              )}
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Description</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={editedDescription}
                  onChangeText={setEditedDescription}
                  placeholder="Description"
                  multiline
                  numberOfLines={3}
                />
              ) : (
                <Text style={[styles.detailValue, !editedDescription && styles.placeholderText]}>
                  {editedDescription || "No description provided"}
                </Text>
              )}
            </View>
          </View>

          {isEditing && (
            <TouchableOpacity
              style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
              onPress={handleUpdate}
              disabled={isLoading}
            >
              <Text style={styles.saveButtonText}>
                {isLoading ? "Saving Changes..." : "💾 Save Changes"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Stock History & Analytics */}
        <View style={styles.analyticsCard}>
          <Text style={styles.cardTitle}>Stock Analytics</Text>
          <View style={styles.analyticsGrid}>
            <View style={styles.analyticItem}>
              <Text style={styles.analyticValue}>{quantity}</Text>
              <Text style={styles.analyticLabel}>Current Stock</Text>
            </View>
            <View style={styles.analyticItem}>
              <Text style={styles.analyticValue}>{editedUnit}</Text>
              <Text style={styles.analyticLabel}>Unit</Text>
            </View>
            <View style={styles.analyticItem}>
              <Text style={[styles.analyticValue, { color: stockStatus.color }]}>
                {stockStatus.status}
              </Text>
              <Text style={styles.analyticLabel}>Status</Text>
            </View>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.dangerCard}>
          <View style={styles.dangerHeader}>
            <Text style={styles.dangerIcon}>⚠️</Text>
            <Text style={styles.dangerTitle}>Danger Zone</Text>
          </View>
          <Text style={styles.dangerDescription}>
            Once deleted, this product cannot be recovered. All stock data will be permanently lost.
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
    </View>
  );
}

const getStyles = (isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDarkMode ? "#0f172a" : "#f8fafc",
  },
  // Header
  header: {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "#334155" : "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: isDarkMode ? "#334155" : "#f1f5f9",
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 20,
    color: isDarkMode ? "#f1f5f9" : "#475569",
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: isDarkMode ? "#334155" : "#f1f5f9",
  },
  editButtonActive: {
    backgroundColor: '#3b82f6',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? "#f1f5f9" : "#475569",
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 4,
  },
  productMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  productId: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  productCategory: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  stockBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  stockStatus: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  stockLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Content
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  // Cards
  quickActionsCard: {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDarkMode ? 0.2 : 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  detailsCard: {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDarkMode ? 0.2 : 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  analyticsCard: {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDarkMode ? 0.2 : 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  dangerCard: {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#ef4444',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDarkMode ? 0.2 : 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 16,
  },
  // Quick Actions
  operationSection: {
    gap: 16,
  },
  operationButtons: {
    flexDirection: 'row',
    backgroundColor: isDarkMode ? "#334155" : "#f1f5f9",
    borderRadius: 12,
    padding: 4,
  },
  operationButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  operationButtonActive: {
    backgroundColor: isDarkMode ? "#475569" : "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  operationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  operationButtonTextActive: {
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
  },
  amountSection: {
    gap: 12,
  },
  amountLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  quickAmountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickAmount: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: isDarkMode ? "#334155" : "#f1f5f9",
  },
  quickAmountActive: {
    backgroundColor: '#3b82f6',
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? "#f1f5f9" : "#475569",
  },
  quickAmountTextActive: {
    color: '#ffffff',
  },
  customAmount: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  customAmountInput: {
    flex: 1,
    backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#cbd5e1",
    borderRadius: 12,
    padding: 16,
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    fontSize: 16,
  },
  applyButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonDisabled: {
    backgroundColor: isDarkMode ? "#374151" : "#9ca3af",
    opacity: 0.6,
  },
  applyButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Details
  detailsGrid: {
    gap: 16,
  },
  detailRow: {
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? "#94a3b8" : "#64748b",
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 16,
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#e2e8f0",
  },
  placeholderText: {
    color: isDarkMode ? "#64748b" : "#94a3b8",
    fontStyle: 'italic',
  },
  textInput: {
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
  unitContainer: {
    gap: 8,
  },
  unitChips: {
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
    backgroundColor: '#3b82f6',
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
  // Analytics
  analyticsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  analyticItem: {
    alignItems: 'center',
    flex: 1,
  },
  analyticValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 4,
  },
  analyticLabel: {
    fontSize: 12,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    textAlign: 'center',
  },
  // Danger Zone
  dangerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  dangerIcon: {
    fontSize: 16,
  },
  dangerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ef4444',
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