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

// Types for stock history
type StockHistoryItem = {
  id: string;
  type: 'in' | 'out';
  quantity: number;
  date: string;
  reason?: string;
  user?: string;
};

export default function ProductDetailScreen() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const router = useRouter();
  const { id, name, quantity: q, unitPrice, price } = useLocalSearchParams();

  // Helper functions
  const getQuantityFromParams = () => {
    const quantityParam = Array.isArray(q) ? q[0] : q;
    return Number(quantityParam) || 0;
  };

  const getPriceFromParams = () => {
    const priceParam = Array.isArray(price) ? price[0] : price;
    const unitPriceParam = Array.isArray(unitPrice) ? unitPrice[0] : unitPrice;
    return Number(priceParam || unitPriceParam) || 0;
  };

  const getNameFromParams = () => {
    const nameParam = Array.isArray(name) ? name[0] : name;
    return String(nameParam || "Unknown Product");
  };

  // State
  const [quantity, setQuantity] = useState(getQuantityFromParams());
  const [addAmount, setAddAmount] = useState("");
  const [removeAmount, setRemoveAmount] = useState("");
  const [removeReason, setRemoveReason] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(getNameFromParams());
  const [editedPrice, setEditedPrice] = useState(String(getPriceFromParams()));
  const [isLoading, setIsLoading] = useState(false);
  const [productImage, setProductImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [stockHistory, setStockHistory] = useState<StockHistoryItem[]>([]);
  const [showRemoveForm, setShowRemoveForm] = useState(false);

  // Mock stock history data - replace with actual API calls
  const mockStockHistory: StockHistoryItem[] = [
    { id: '1', type: 'in', quantity: 50, date: '2024-01-15T10:30:00Z', reason: 'Initial stock', user: 'Admin' },
    { id: '2', type: 'out', quantity: 5, date: '2024-01-16T14:20:00Z', reason: 'Sale', user: 'Cashier' },
    { id: '3', type: 'out', quantity: 3, date: '2024-01-17T09:15:00Z', reason: 'Damaged', user: 'Manager' },
    { id: '4', type: 'in', quantity: 20, date: '2024-01-18T11:00:00Z', reason: 'Restock', user: 'Admin' },
    { id: '5', type: 'out', quantity: 8, date: '2024-01-19T16:45:00Z', reason: 'Sale', user: 'Cashier' },
  ];

  // Load product image and history
  useEffect(() => {
    loadProductImage();
    loadStockHistory();
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

  const loadStockHistory = () => {
    // In a real app, you would fetch this from your API
    setStockHistory(mockStockHistory);
  };

  // Add stock
  const handleAddToStock = () => {
    const amount = parseInt(addAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Invalid Input", "Please enter a positive number.");
      return;
    }

    const newQuantity = quantity + amount;
    setQuantity(newQuantity);
    
    // Add to history
    const newHistoryItem: StockHistoryItem = {
      id: Date.now().toString(),
      type: 'in',
      quantity: amount,
      date: new Date().toISOString(),
      reason: 'Manual restock',
      user: 'Current User' // Replace with actual user
    };
    
    setStockHistory(prev => [newHistoryItem, ...prev]);
    setAddAmount("");
    Alert.alert("Success", `${amount} items added to stock!`);
  };

  // Remove stock
  const handleRemoveFromStock = () => {
    const amount = parseInt(removeAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Invalid Input", "Please enter a positive number.");
      return;
    }

    if (amount > quantity) {
      Alert.alert("Insufficient Stock", `Cannot remove ${amount} items. Only ${quantity} available.`);
      return;
    }

    if (!removeReason.trim()) {
      Alert.alert("Reason Required", "Please provide a reason for removing stock.");
      return;
    }

    const newQuantity = quantity - amount;
    setQuantity(newQuantity);
    
    // Add to history
    const newHistoryItem: StockHistoryItem = {
      id: Date.now().toString(),
      type: 'out',
      quantity: amount,
      date: new Date().toISOString(),
      reason: removeReason,
      user: 'Current User' // Replace with actual user
    };
    
    setStockHistory(prev => [newHistoryItem, ...prev]);
    setRemoveAmount("");
    setRemoveReason("");
    setShowRemoveForm(false);
    Alert.alert("Success", `${amount} items removed from stock!`);
  };

  // Update product
  const handleUpdate = async () => {
    if (!editedName.trim() || isNaN(Number(editedPrice)) || Number(editedPrice) < 0) {
      Alert.alert("Error", "Please enter valid values for name and price.");
      return;
    }

    setIsLoading(true);
    try {
      const productId = Array.isArray(id) ? id[0] : id;
      const updateData = {
        name: editedName.trim(),
        price: Number(editedPrice),
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
    setEditedPrice(String(getPriceFromParams()));
    setIsEditing(false);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

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
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerBackground} />
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Product Details</Text>
            <Text style={styles.headerSubtitle}>Manage your product information</Text>
          </View>
        </View>

        {/* Product Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>📦 Product Information</Text>
            <View style={[styles.statusBadge, 
              quantity === 0 ? styles.statusError : 
              quantity <= 10 ? styles.statusWarning : styles.statusSuccess
            ]}>
              <Text style={styles.statusText}>
                {quantity === 0 ? 'Out of Stock' : 
                 quantity <= 10 ? 'Low Stock' : 'In Stock'}
              </Text>
            </View>
          </View>

          <View style={styles.fieldsContainer}>
            {/* ID Field */}
            <View style={styles.fieldRow}>
              <View style={styles.fieldIcon}>
                <Text>🆔</Text>
              </View>
              <View style={styles.fieldContent}>
                <Text style={styles.fieldLabel}>Product ID</Text>
                <Text style={styles.fieldValue}>{Array.isArray(id) ? id[0] : id}</Text>
              </View>
            </View>

            {/* Name Field */}
            <View style={styles.fieldRow}>
              <View style={styles.fieldIcon}>
                <Text>🏷️</Text>
              </View>
              <View style={styles.fieldContent}>
                <Text style={styles.fieldLabel}>Product Name</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.textInput}
                    value={editedName}
                    onChangeText={setEditedName}
                    placeholder="Enter product name"
                    placeholderTextColor={isDarkMode ? "#94a3b8" : "#9ca3af"}
                  />
                ) : (
                  <Text style={styles.fieldValue}>{editedName}</Text>
                )}
              </View>
            </View>

            {/* Quantity Field */}
            <View style={styles.fieldRow}>
              <View style={styles.fieldIcon}>
                <Text>📊</Text>
              </View>
              <View style={styles.fieldContent}>
                <Text style={styles.fieldLabel}>Current Stock</Text>
                <View style={styles.quantityRow}>
                  <Text style={[styles.fieldValue, styles.quantityValue]}>{quantity}</Text>
                  <Text style={styles.quantityUnit}>units</Text>
                </View>
              </View>
            </View>

            {/* Price Field */}
            <View style={styles.fieldRow}>
              <View style={styles.fieldIcon}>
                <Text>💰</Text>
              </View>
              <View style={styles.fieldContent}>
                <Text style={styles.fieldLabel}>Unit Price</Text>
                {isEditing ? (
                  <View style={styles.priceInputWrapper}>
                    <TextInput
                      style={[styles.textInput, styles.priceInput]}
                      value={editedPrice}
                      onChangeText={setEditedPrice}
                      keyboardType="numeric"
                      placeholder="0.00"
                      placeholderTextColor={isDarkMode ? "#94a3b8" : "#9ca3af"}
                    />
                    <Text style={styles.currency}>MAD</Text>
                  </View>
                ) : (
                  <Text style={[styles.fieldValue, styles.priceValue]}>
                    {Number(getPriceFromParams()).toFixed(2)} MAD
                  </Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Stock Management Card */}
        {!isEditing && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>📈 Stock Management</Text>
            </View>
            <View style={styles.stockContent}>
              {/* Add Stock Section */}
              <View style={styles.stockSection}>
                <Text style={styles.stockTitle}>➕ Add Stock</Text>
                <Text style={styles.stockDescription}>
                  Increase your current stock quantity
                </Text>
                
                <View style={styles.stockInputContainer}>
                  <TextInput
                    style={styles.stockTextInput}
                    placeholder="Enter quantity to add"
                    placeholderTextColor={isDarkMode ? "#94a3b8" : "#9ca3af"}
                    keyboardType="numeric"
                    value={addAmount}
                    onChangeText={setAddAmount}
                  />
                  <TouchableOpacity
                    style={[
                      styles.stockButton,
                      styles.addButton,
                      (!addAmount || parseInt(addAmount) <= 0) && styles.stockButtonDisabled
                    ]}
                    onPress={handleAddToStock}
                    disabled={!addAmount || parseInt(addAmount) <= 0}
                  >
                    <Text style={styles.stockButtonText}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Remove Stock Section */}
              <View style={styles.stockSection}>
                <View style={styles.removeHeader}>
                  <Text style={styles.stockTitle}>➖ Remove Stock</Text>
                  <TouchableOpacity
                    style={styles.toggleButton}
                    onPress={() => setShowRemoveForm(!showRemoveForm)}
                  >
                    <Text style={styles.toggleButtonText}>
                      {showRemoveForm ? '▲' : '▼'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {showRemoveForm && (
                  <View style={styles.removeForm}>
                    <Text style={styles.stockDescription}>
                      Remove items from current stock
                    </Text>
                    
                    <TextInput
                      style={styles.stockTextInput}
                      placeholder="Quantity to remove"
                      placeholderTextColor={isDarkMode ? "#94a3b8" : "#9ca3af"}
                      keyboardType="numeric"
                      value={removeAmount}
                      onChangeText={setRemoveAmount}
                    />
                    
                    <TextInput
                      style={[styles.stockTextInput, styles.reasonInput]}
                      placeholder="Reason for removal (sale, damaged, etc.)"
                      placeholderTextColor={isDarkMode ? "#94a3b8" : "#9ca3af"}
                      value={removeReason}
                      onChangeText={setRemoveReason}
                      multiline
                    />
                    
                    <TouchableOpacity
                      style={[
                        styles.stockButton,
                        styles.removeButton,
                        (!removeAmount || parseInt(removeAmount) <= 0 || !removeReason.trim() || parseInt(removeAmount) > quantity) && 
                        styles.stockButtonDisabled
                      ]}
                      onPress={handleRemoveFromStock}
                      disabled={!removeAmount || parseInt(removeAmount) <= 0 || !removeReason.trim() || parseInt(removeAmount) > quantity}
                    >
                      <Text style={styles.stockButtonText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Stock History Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>📋 Stock History</Text>
            <Text style={styles.historyCount}>{stockHistory.length} records</Text>
          </View>
          
          <View style={styles.historyContainer}>
            {stockHistory.length === 0 ? (
              <Text style={styles.noHistoryText}>No stock history available</Text>
            ) : (
              stockHistory.map((item) => (
                <View key={item.id} style={styles.historyItem}>
                  <View style={[
                    styles.historyIcon,
                    item.type === 'in' ? styles.historyIn : styles.historyOut
                  ]}>
                    <Text style={styles.historyIconText}>
                      {item.type === 'in' ? '⬆️' : '⬇️'}
                    </Text>
                  </View>
                  
                  <View style={styles.historyContent}>
                    <View style={styles.historyHeader}>
                      <Text style={styles.historyQuantity}>
                        {item.type === 'in' ? '+' : '-'}{item.quantity} units
                      </Text>
                      <Text style={[
                        styles.historyType,
                        item.type === 'in' ? styles.typeIn : styles.typeOut
                      ]}>
                        {item.type === 'in' ? 'Stock In' : 'Stock Out'}
                      </Text>
                    </View>
                    
                    <Text style={styles.historyReason}>{item.reason}</Text>
                    <Text style={styles.historyMeta}>
                      {formatDate(item.date)} • {item.user}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {isEditing ? (
            <View style={styles.editButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancelEdit}
                disabled={isLoading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleUpdate}
                disabled={isLoading}
              >
                <Text style={styles.saveButtonText}>
                  {isLoading ? "Saving..." : "Save Changes"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.viewButtons}>
              <TouchableOpacity
                style={[styles.button, styles.editButton]}
                onPress={() => setIsEditing(true)}
                disabled={isLoading}
              >
                <Text style={styles.editButtonText}>✏️ Edit Product</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.deleteButton]}
                onPress={handleDelete}
                disabled={isLoading}
              >
                <Text style={styles.deleteButtonText}>
                  {isLoading ? "Deleting..." : "🗑️ Delete Product"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
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
    height: 140,
    marginBottom: 20,
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
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#e0e7ff',
    opacity: 0.9,
  },
  // Card Styles
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
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "#334155" : "#f1f5f9",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
  },
  // Status Badge
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusSuccess: {
    backgroundColor: '#dcfce7',
  },
  statusWarning: {
    backgroundColor: '#fef3c7',
  },
  statusError: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: isDarkMode ? "#1e293b" : "#1e293b",
  },
  // Fields
  fieldsContainer: {
    gap: 16,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#e2e8f0",
  },
  fieldIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: isDarkMode ? "#475569" : "#e2e8f0",
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fieldContent: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: isDarkMode ? "#94a3b8" : "#64748b",
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldValue: {
    fontSize: 16,
    fontWeight: '500',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6366f1',
    marginRight: 8,
  },
  quantityUnit: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  priceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10b981',
  },
  // Input Styles
  textInput: {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#cbd5e1",
    borderRadius: 12,
    padding: 12,
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    fontSize: 16,
  },
  priceInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceInput: {
    flex: 1,
    marginRight: 8,
  },
  currency: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  // Stock Management
  stockContent: {
    gap: 20,
  },
  stockSection: {
    gap: 12,
  },
  stockTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
  },
  stockDescription: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  stockInputContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  stockTextInput: {
    flex: 1,
    backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#cbd5e1",
    borderRadius: 12,
    padding: 16,
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    fontSize: 16,
  },
  reasonInput: {
    height: 60,
    textAlignVertical: 'top',
  },
  stockButton: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  addButton: {
    backgroundColor: '#10b981',
  },
  removeButton: {
    backgroundColor: '#ef4444',
  },
  stockButtonDisabled: {
    backgroundColor: isDarkMode ? "#374151" : "#9ca3af",
    opacity: 0.6,
  },
  stockButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Remove Stock Section
  removeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleButton: {
    padding: 8,
  },
  toggleButtonText: {
    fontSize: 16,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontWeight: 'bold',
  },
  removeForm: {
    gap: 12,
  },
  // Stock History
  historyCount: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontWeight: '600',
  },
  historyContainer: {
    gap: 12,
  },
  noHistoryText: {
    textAlign: 'center',
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontSize: 16,
    padding: 20,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#e2e8f0",
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyIn: {
    backgroundColor: '#dcfce7',
  },
  historyOut: {
    backgroundColor: '#fee2e2',
  },
  historyIconText: {
    fontSize: 16,
  },
  historyContent: {
    flex: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyQuantity: {
    fontSize: 16,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
  },
  historyType: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeIn: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  typeOut: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  historyReason: {
    fontSize: 14,
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 2,
  },
  historyMeta: {
    fontSize: 12,
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  // Action Buttons
  actionsContainer: {
    marginHorizontal: 16,
    marginTop: 8,
  },
  editButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  viewButtons: {
    gap: 12,
  },
  button: {
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  editButton: {
    backgroundColor: '#f59e0b',
  },
  editButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: isDarkMode ? "#374151" : "#6b7280",
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    backgroundColor: '#10b981',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});