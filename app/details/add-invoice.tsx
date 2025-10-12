import { Stack, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { createConfirmedInvoice } from "../api";
import { useAppContext } from "../context/appContext";

type ProductItem = {
  name: string;
  quantity: number;
  unitPrice: number;
};

type DropdownItem = {
  id: string;
  name: string;
  phone?: string;
  price?: number;
  currentStock?: number;
};

type ProductError = {
  productName: string;
  type: 'validation' | 'error';
  message: string;
};

// Move getStyles function outside the component
const getStyles = (isDarkMode: boolean) => StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 16, 
    backgroundColor: isDarkMode ? "#121212" : "#f8fafc" 
  },
  loadingText: { 
    color: isDarkMode ? "#fff" : "#1e293b", 
    textAlign: "center", 
    marginTop: 20 
  },
  
  // Client Section with Warning
  clientSection: {
    marginBottom: 16,
  },
  
  // Warning styles
  dropdownButtonWarning: {
    borderColor: "#f59e0b",
    borderWidth: 2,
  },
  
  // Error Summary Banner
  errorSummaryBanner: {
    backgroundColor: "#dc2626",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  errorSummaryText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  dismissErrorText: {
    color: "#fecaca",
    fontSize: 12,
    fontWeight: "bold",
  },
  
  label: { 
    fontWeight: "bold", 
    marginTop: 12, 
    marginBottom: 8, 
    color: isDarkMode ? "#f1f5f9" : "#1e293b", 
    fontSize: 14 
  },
  subLabel: { 
    fontWeight: "600", 
    marginBottom: 6, 
    color: isDarkMode ? "#cbd5e1" : "#64748b", 
    fontSize: 12 
  },
  input: {
    borderWidth: 1, 
    borderColor: isDarkMode ? "#334155" : "#cbd5e1", 
    borderRadius: 8, 
    padding: 10,
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff", 
    color: isDarkMode ? "#f8fafc" : "#1e293b", 
    fontSize: 14,
  },
  inputError: { 
    borderColor: "#ef4444", 
    borderWidth: 2 
  },
  zeroPriceInput: { 
    borderColor: "#ef4444", 
    borderWidth: 2 
  },
  warningText: { 
    color: "#f59e0b", 
    fontSize: 12, 
    marginTop: 4,
    fontWeight: "600",
  },
  
  sectionHeader: {
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center",
    marginTop: 20, 
    marginBottom: 12,
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: "bold", 
    color: isDarkMode ? "#60a5fa" : "#3b82f6" 
  },
  section: { 
    marginTop: 20 
  },
  
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
  productCardError: { 
    borderLeftColor: "#ef4444", 
    backgroundColor: isDarkMode ? "#2a1e2b" : "#fef2f2" 
  },
  
  productHeader: {
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginBottom: 10,
  },
  productTitleContainer: { 
    flexDirection: "row", 
    alignItems: "center" 
  },
  productNumber: { 
    color: isDarkMode ? "#60a5fa" : "#3b82f6", 
    fontWeight: "bold", 
    fontSize: 14 
  },
  errorBadge: {
    backgroundColor: "#ef4444", 
    color: "#fff", 
    fontWeight: "bold",
    borderRadius: 10, 
    width: 18, 
    height: 18, 
    textAlign: "center", 
    marginLeft: 8,
  },
  
  removeBtn: {
    backgroundColor: "#ef4444", 
    width: 24, 
    height: 24, 
    borderRadius: 12,
    justifyContent: "center", 
    alignItems: "center",
  },
  removeBtnText: { 
    color: "#fff", 
    fontSize: 12, 
    fontWeight: "bold" 
  },
  
  row: { 
    flexDirection: "row", 
    gap: 10 
  },
  column: { 
    flex: 1 
  },
  lineTotal: { 
    backgroundColor: isDarkMode ? "#334155" : "#f1f5f9", 
    padding: 10, 
    borderRadius: 8, 
    alignItems: "center" 
  },
  lineTotalText: { 
    color: isDarkMode ? "#f8fafc" : "#1e293b", 
    fontWeight: "bold", 
    fontSize: 14 
  },
  
  // Add Product Button - Reduced height
  addProductBtn: { 
    backgroundColor: isDarkMode ? "#22d3ee" : "#06b6d4", 
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: isDarkMode ? "#06b6d4" : "#0891b2",
  },
  addProductBtnText: { 
    color: isDarkMode ? "#0f172a" : "#ffffff", 
    fontWeight: "bold", 
    fontSize: 14
  },
  
  // Dropdown Styles
  dropdownButton: {
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center",
    borderWidth: 1, 
    borderColor: isDarkMode ? "#334155" : "#cbd5e1", 
    borderRadius: 8, 
    padding: 12,
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff", 
    marginBottom: 12,
  },
  dropdownButtonError: { 
    borderColor: "#ef4444", 
    borderWidth: 2 
  },
  dropdownButtonText: { 
    color: isDarkMode ? "#f8fafc" : "#1e293b", 
    fontSize: 14 
  },
  dropdownButtonPlaceholder: { 
    color: isDarkMode ? "#94a3b8" : "#9ca3af", 
    fontSize: 14 
  },
  errorText: { 
    color: "#ef4444" 
  },
  dropdownArrow: { 
    color: isDarkMode ? "#60a5fa" : "#3b82f6", 
    fontSize: 12 
  },
  
  // Product selection content
  productSelectionContent: {
    flex: 1,
  },
  stockStatus: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  stockHint: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  
  modalOverlay: {
    flex: 1, 
    backgroundColor: "rgba(0, 0, 0, 0.7)", 
    justifyContent: "center",
    alignItems: "center", 
    padding: 20,
  },
  dropdownList: {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff", 
    borderRadius: 12, 
    padding: 16, 
    width: "90%",
    maxHeight: "70%", 
    borderWidth: 1, 
    borderColor: isDarkMode ? "#334155" : "#cbd5e1",
  },
  dropdownTitle: {
    color: isDarkMode ? "#60a5fa" : "#3b82f6", 
    fontSize: 16, 
    fontWeight: "bold", 
    marginBottom: 12, 
    textAlign: "center",
  },
  refreshHint: {
    color: isDarkMode ? "#94a3b8" : "#9ca3af",
    fontSize: 12,
    fontWeight: "normal",
  },
  dropdownFlatList: { 
    maxHeight: 300 
  },
  dropdownItem: { 
    padding: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: isDarkMode ? "#334155" : "#e2e8f0" 
  },
  dropdownItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownItemText: { 
    color: isDarkMode ? "#f8fafc" : "#1e293b", 
    fontSize: 14,
    flex: 1,
  },
  stockBadge: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 8,
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
  
  // Empty State Styles
  emptyState: {
    alignItems: "center",
    padding: 20,
  },
  emptyText: { 
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
  
  // Add New Button Styles
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
  
  // Error Styles
  errorBanner: {
    backgroundColor: "#ef4444", 
    padding: 8, 
    borderRadius: 6, 
    marginBottom: 8,
  },
  errorBannerText: { 
    color: "#fff", 
    fontSize: 12, 
    fontWeight: "bold", 
    textAlign: "center" 
  },
  
  summary: {
    marginTop: 20, 
    padding: 16, 
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff", 
    borderRadius: 12,
    borderLeftWidth: 4, 
    borderLeftColor: "#10b981",
    borderWidth: 1,
    borderColor: isDarkMode ? "#334155" : "#e2e8f0",
  },
  summaryTitle: { 
    fontSize: 16, 
    fontWeight: "bold", 
    color: isDarkMode ? "#60a5fa" : "#3b82f6", 
    marginBottom: 12, 
    textAlign: "center" 
  },
  summaryRow: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    marginBottom: 8, 
    paddingVertical: 4 
  },
  summaryLabel: { 
    color: isDarkMode ? "#cbd5e1" : "#64748b", 
    fontSize: 14 
  },
  summaryValue: { 
    color: isDarkMode ? "#f8fafc" : "#1e293b", 
    fontSize: 14, 
    fontWeight: "600" 
  },
  totalRow: { 
    borderTopWidth: 1, 
    borderTopColor: isDarkMode ? "#334155" : "#e2e8f0", 
    paddingTop: 8, 
    marginTop: 4 
  },
  totalLabel: { 
    color: isDarkMode ? "#f8fafc" : "#1e293b", 
    fontSize: 16, 
    fontWeight: "bold" 
  },
  totalValue: { 
    color: "#10b981", 
    fontSize: 16, 
    fontWeight: "bold" 
  },
  
  // Status row
  statusRow: {
    flexDirection: "row", 
    justifyContent: "space-between", 
    marginTop: 8,
    paddingTop: 8, 
    borderTopWidth: 1, 
    borderTopColor: isDarkMode ? "#334155" : "#e2e8f0",
  },
  statusLabel: { 
    color: isDarkMode ? "#cbd5e1" : "#64748b", 
    fontSize: 14, 
    fontWeight: "bold" 
  },
  statusValue: { 
    fontSize: 14, 
    fontWeight: "bold" 
  },
  paidStatus: { 
    color: "#10b981" 
  },
  pendingStatus: { 
    color: "#f59e0b" 
  },
  
  // Action Buttons
  actionButtons: { 
    marginTop: 24, 
    marginBottom: 30, 
    gap: 12 
  },
  saveBtn: { 
    backgroundColor: "#fc7c05ff", 
    padding: 16, 
    borderRadius: 12, 
    alignItems: "center" 
  },
  saveBtnDisabled: { 
    backgroundColor: "#9ca3af" 
  },
  saveBtnText: { 
    color: "#fff", 
    fontSize: 16, 
    fontWeight: "bold" 
  },
  cancelBtn: { 
    backgroundColor: "#6b7280", 
    padding: 16, 
    borderRadius: 12, 
    alignItems: "center" 
  },
  cancelBtnText: { 
    color: "#fff", 
    fontSize: 16, 
    fontWeight: "bold" 
  },
});

export default function AddInvoiceScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  
  const [selectedClient, setSelectedClient] = useState<DropdownItem | null>(null);
  const [productItems, setProductItems] = useState<ProductItem[]>([
    { name: "", quantity: 1, unitPrice: 0 },
  ]);
  const [remise, setRemise] = useState(0);
  const [advance, setAdvance] = useState(0);
  const [total, setTotal] = useState(0);
  const [rest, setRest] = useState(0);
  const [loading, setLoading] = useState(false);
  const [productErrors, setProductErrors] = useState<ProductError[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  
  // Dropdown states
  const [clientDropdownVisible, setClientDropdownVisible] = useState(false);
  const [productDropdownVisible, setProductDropdownVisible] = useState<number | null>(null);
  
  // Search states
  const [clientSearch, setClientSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  
  const { 
    products: availableProducts, 
    clients, 
    loading: contextLoading,
    refreshProducts,
    refreshClients 
  } = useAppContext();

  // Initialize styles at the top of component
  const styles = getStyles(isDarkMode);

  // Filter clients based on search
  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    (client.phone && client.phone.includes(clientSearch))
  );

  // Filter products based on search
  const filteredProducts = availableProducts.filter(product =>
    product.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  // 🔹 Refresh data function
  const refreshData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshClients(),
        refreshProducts()
      ]);
      console.log('✅ Data refreshed successfully');
    } catch (error) {
      console.error('❌ Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // 🔹 Refresh data when dropdowns open
  useEffect(() => {
    if (clientDropdownVisible) {
      refreshClients();
    }
  }, [clientDropdownVisible]);

  useEffect(() => {
    if (productDropdownVisible !== null) {
      refreshProducts();
    }
  }, [productDropdownVisible]);

  // Debug logging
  useEffect(() => {
    console.log('📊 Available products:', availableProducts.length);
    console.log('👥 Available clients:', clients.length);
  }, [availableProducts, clients]);

  // 🔹 Auto-calc totals
  useEffect(() => {
    const calcTotal = productItems.reduce(
      (sum, p) => sum + p.quantity * p.unitPrice,
      0
    );
    setTotal(calcTotal);

    const calcRest = calcTotal - advance - remise;
    setRest(calcRest >= 0 ? calcRest : 0);
  }, [productItems, remise, advance]);

  // 🔹 Add new product row
  const addProduct = () => {
    setProductItems([...productItems, { name: "", quantity: 1, unitPrice: 0 }]);
  };

  // 🔹 Remove product row
  const removeProduct = (index: number) => {
    if (productItems.length > 1) {
      const updated = productItems.filter((_, i) => i !== index);
      setProductItems(updated);
      // Remove any errors for this product
      const productName = productItems[index].name;
      if (productName) {
        setProductErrors(prev => prev.filter(error => error.productName !== productName));
      }
    }
  };

  // 🔹 Select client from dropdown
  const selectClient = (client: DropdownItem) => {
    setSelectedClient(client);
    setClientDropdownVisible(false);
    setClientSearch(""); // Reset search when client is selected
  };

  // 🔹 Select product from dropdown
  const selectProduct = (index: number, product: DropdownItem) => {
    console.log('🔄 Selecting product:', product);
    
    const updated = [...productItems];
    updated[index].name = product.name;
    updated[index].unitPrice = product.price || 0;
    updated[index].quantity = 1;
    
    setProductItems(updated);
    setProductDropdownVisible(null);
    setProductSearch(""); // Reset search when product is selected
    // Clear error for this product when a new product is selected
    setProductErrors(prev => prev.filter(error => error.productName !== product.name));
  };

  // 🔹 Update product field
  const updateProduct = (index: number, field: keyof ProductItem, value: string | number) => {
    const updated = [...productItems];
    
    if (field === "quantity" || field === "unitPrice") {
      updated[index][field] = typeof value === "string" ? parseFloat(value) || 0 : value;
    } else {
      updated[index][field] = value as string;
    }
    
    setProductItems(updated);
    // Clear error for this product when quantity is updated
    if (field === "quantity") {
      const productName = productItems[index].name;
      if (productName) {
        setProductErrors(prev => prev.filter(error => error.productName !== productName));
      }
    }
  };

  // 🔹 Navigate to add client screen with callback
  const navigateToAddClient = () => {
    setClientDropdownVisible(false);
    // Navigate with callback to refresh when returning
    router.push({
      pathname: "/details/add-client",
      params: { shouldRefresh: "true" }
    });
  };

  // 🔹 Navigate to add product screen with callback
  const navigateToAddProduct = () => {
    setProductDropdownVisible(null);
    // Navigate with callback to refresh when returning
    router.push({
      pathname: "/details/add-product",
      params: { shouldRefresh: "true" }
    });
  };

  // 🔹 Get current stock for a product
  const getProductStock = (productName: string): number => {
    const product = availableProducts.find(p => p.name === productName);
    return product?.q || 0;
  };

  // 🔹 Get stock status color and text
  const getStockStatus = (productName: string, quantity: number) => {
    const stock = getProductStock(productName);
    
    if (stock === 0) return { color: '#ef4444', text: 'Out of Stock' };
    if (quantity > stock) return { color: '#f59e0b', text: `Insufficient: ${stock} available` };
    if (stock <= 10) return { color: '#f59e0b', text: `Low Stock: ${stock} left` };
    return { color: '#10b981', text: `In Stock: ${stock} available` };
  };

  // 🔹 Handle create invoice (single step - creates as confirmed)
  const handleCreateInvoice = async () => {
    // VALIDATION DU CLIENT - AJOUTÉE
    if (!selectedClient) {
      Alert.alert("Validation Error", "Please select a client before creating the invoice");
      return;
    }

    // Validate products have prices
    const productsWithZeroPrice = productItems.filter(item => item.unitPrice === 0);
    if (productsWithZeroPrice.length > 0) {
      Alert.alert("Validation Error", "Some products have 0 MAD price. Please check product prices.");
      return;
    }

    if (productItems.some(item => !item.name || item.quantity <= 0)) {
      Alert.alert("Validation Error", "Please fill all product fields with valid data");
      return;
    }

    setLoading(true);

    try {
      // Prepare products with productId
      const productsWithIds = productItems.map(productItem => {
        const foundProduct = availableProducts.find(prod => prod.name === productItem.name);
        
        if (!foundProduct) {
          throw new Error(`Product "${productItem.name}" not found in database`);
        }

        return {
          productId: foundProduct.id,
          name: productItem.name,
          quantity: productItem.quantity,
          unitPrice: productItem.unitPrice
        };
      });

      const invoiceData = {
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        products: productsWithIds,
        remise,
        advance,
        total,
        rest,
        paid: rest === 0,
        date: new Date().toISOString(),
      };

      console.log('📤 Creating confirmed invoice:', invoiceData);
      
      // Use the single-step endpoint
      const response = await createConfirmedInvoice(invoiceData);
      
      console.log('✅ Invoice created and confirmed successfully');
      
      Alert.alert(
        "Success", 
        "Invoice created and confirmed successfully! Stock has been updated.",
        [
          { 
            text: "OK", 
            onPress: () => {
              resetForm();
            }
          }
        ]
      );
    } catch (err: any) {
      console.error("Failed to create invoice:", err);
      
      // Handle stock validation errors from backend
      if (err.response?.data?.errors) {
        const backendErrors = err.response.data.errors;
        const newErrors: ProductError[] = [];
        
        backendErrors.forEach((errorMessage: string) => {
          // Extract product name from error message
          let productName = "Unknown Product";
          productItems.forEach(product => {
            if (errorMessage.toLowerCase().includes(product.name.toLowerCase())) {
              productName = product.name;
            }
          });
          
          newErrors.push({
            productName: productName,
            type: 'validation',
            message: errorMessage
          });
        });
        
        if (newErrors.length > 0) {
          setProductErrors(newErrors);
          showOperationalAlert(newErrors);
          return;
        }
      }
      
      // Handle other API errors
      if (err.response?.data?.message) {
        Alert.alert("Error", err.response.data.message);
      } else {
        Alert.alert("Error", err.message || "Failed to create invoice. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Show operational alert that directs user to highlighted products
  const showOperationalAlert = (errors: ProductError[]) => {
    let alertMessage = "Cannot create invoice due to the following issues:\n\n";
    
    errors.forEach((error, index) => {
      alertMessage += `• ${error.productName}: ${error.message}\n`;
    });
    
    alertMessage += "\n⚠️ Please fix these issues before creating the invoice.";

    Alert.alert(
      "Product Issues Detected",
      alertMessage,
      [
        { 
          text: "Show Me", 
          onPress: () => {
            // Scroll to first error if possible
            if (errors.length > 0) {
              const firstErrorProductName = errors[0].productName;
              const firstErrorIndex = productItems.findIndex(item => item.name === firstErrorProductName);
              if (firstErrorIndex !== -1) {
                setProductDropdownVisible(firstErrorIndex);
              }
            }
          }
        }
      ]
    );
  };

  // 🔹 Check if a product has an error
  const getProductError = (productName: string): ProductError | undefined => {
    return productErrors.find(error => error.productName === productName);
  };

  // 🔹 Get error message for a specific product
  const getProductErrorMessage = (productName: string): string => {
    const error = getProductError(productName);
    return error?.message || '';
  };

  // 🔹 Reset form
  const resetForm = () => {
    setSelectedClient(null);
    setProductItems([{ name: "", quantity: 1, unitPrice: 0 }]);
    setRemise(0);
    setAdvance(0);
    setProductErrors([]);
    setClientSearch("");
    setProductSearch("");
  };

  // 🔹 Handle cancel
  const handleCancel = () => {
    Alert.alert(
      "Cancel Invoice",
      "Are you sure you want to cancel? This will reset the form.",
      [
        { text: "No", style: "cancel" },
        { text: "Yes", style: "destructive", onPress: resetForm }
      ]
    );
  };

  // Calculate line total for a product
  const getLineTotal = (item: ProductItem) => {
    return item.quantity * item.unitPrice;
  };

  // Render dropdown item with price and stock display
  const renderDropdownItem = (item: DropdownItem, type: 'client' | 'product') => (
    <TouchableOpacity
      style={styles.dropdownItem}
      onPress={() => type === 'client' ? selectClient(item) : selectProduct(productDropdownVisible!, item)}
    >
      <View style={styles.dropdownItemContent}>
        <Text style={styles.dropdownItemText}>
          {item.name}
          {type === 'client' && item.phone && ` (${item.phone})`}
          {type === 'product' && ` - ${item.price || 0} MAD`}
        </Text>
        {type === 'product' && item.currentStock !== undefined && (
          <Text style={[
            styles.stockBadge,
            { 
              color: item.currentStock === 0 ? '#ef4444' : 
                     item.currentStock <= 10 ? '#f59e0b' : '#10b981'
            }
          ]}>
            Stock: {item.currentStock}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  // Add refresh control to ScrollView
  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={refreshData}
      colors={["#fc7c05ff"]}
      tintColor="#fc7c05ff"
    />
  );

  if (contextLoading && !refreshing) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading data...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ 
        title: "Create Invoice",
        headerStyle: {
          backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
        },
        headerTintColor: isDarkMode ? "#f1f5f9" : "#1e293b",
        headerTitleStyle: {
          color: isDarkMode ? "#f1f5f9" : "#1e293b",
        }
      }} />

      {/* Error Summary Banner */}
      {productErrors.length > 0 && (
        <View style={styles.errorSummaryBanner}>
          <Text style={styles.errorSummaryText}>
            ⚠️ {productErrors.length} product(s) need attention
          </Text>
          <TouchableOpacity onPress={() => setProductErrors([])}>
            <Text style={styles.dismissErrorText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Client Selection with Warning */}
      <View style={styles.clientSection}>
        <Text style={styles.label}>Select Client *</Text>
        {!selectedClient && (
          <Text style={styles.warningText}>⚠️ Client selection is required</Text>
        )}
        <TouchableOpacity
          style={[
            styles.dropdownButton, 
            !selectedClient && styles.dropdownButtonWarning
          ]}
          onPress={() => setClientDropdownVisible(true)}
        >
          <Text style={selectedClient ? styles.dropdownButtonText : styles.dropdownButtonPlaceholder}>
            {selectedClient ? `${selectedClient.name} ${selectedClient.phone ? `(${selectedClient.phone})` : ''}` : "Choose a client..."}
          </Text>
          <Text style={styles.dropdownArrow}>▼</Text>
        </TouchableOpacity>
      </View>

      {/* Client Dropdown Modal */}
      <Modal visible={clientDropdownVisible} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={() => setClientDropdownVisible(false)}
        >
          <View style={styles.dropdownList}>
            <Text style={styles.dropdownTitle}>
              Select Client ({filteredClients.length})
              <Text style={styles.refreshHint}> - Pull to refresh</Text>
            </Text>
            
            {/* Client Search Bar */}
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search clients..."
                placeholderTextColor={isDarkMode ? "#94a3b8" : "#9ca3af"}
                value={clientSearch}
                onChangeText={setClientSearch}
              />
            </View>

            {filteredClients.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  {clientSearch ? "No clients found" : "No clients available"}
                </Text>
                <Text style={styles.emptySubText}>
                  {clientSearch ? "Try a different search term" : "Add a new client to get started"}
                </Text>
              </View>
            ) : (
              <FlatList 
                data={filteredClients} 
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => renderDropdownItem(item, 'client')} 
                style={styles.dropdownFlatList}
              />
            )}
            
            {/* Add Client Link */}
            <TouchableOpacity 
              style={styles.addNewButton}
              onPress={navigateToAddClient}
            >
              <Text style={styles.addNewButtonText}>+ Add New Client</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.dropdownClose} 
              onPress={() => setClientDropdownVisible(false)}
            >
              <Text style={styles.dropdownCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Products Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Products</Text>
      </View>

      {productItems.map((product, index) => {
        const error = getProductError(product.name);
        const hasError = !!error;
        const stockInfo = product.name ? getStockStatus(product.name, product.quantity) : null;
        
        return (
          <View key={index} style={[
            styles.productCard,
            hasError && styles.productCardError
          ]}>
            <View style={styles.productHeader}>
              <View style={styles.productTitleContainer}>
                <Text style={styles.productNumber}>Product {index + 1}</Text>
                {hasError && <Text style={styles.errorBadge}>!</Text>}
              </View>
              {productItems.length > 1 && (
                <TouchableOpacity 
                  style={styles.removeBtn} 
                  onPress={() => removeProduct(index)}
                >
                  <Text style={styles.removeBtnText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {/* Error message banner */}
            {hasError && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>
                  {getProductErrorMessage(product.name)}
                </Text>
              </View>
            )}
            
            <Text style={styles.subLabel}>Product Name</Text>
            <TouchableOpacity
              style={[styles.dropdownButton, hasError && styles.dropdownButtonError]}
              onPress={() => setProductDropdownVisible(index)}
            >
              <View style={styles.productSelectionContent}>
                <Text style={[
                  product.name ? styles.dropdownButtonText : styles.dropdownButtonPlaceholder,
                  hasError && styles.errorText
                ]}>
                  {product.name || "Select a product..."}
                  {product.name && product.unitPrice > 0 && ` (${product.unitPrice}MAD)`}
                </Text>
                {product.name && stockInfo && (
                  <Text style={[styles.stockStatus, { color: stockInfo.color }]}>
                    {stockInfo.text}
                  </Text>
                )}
              </View>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>

            {/* Product Dropdown Modal */}
            <Modal visible={productDropdownVisible === index} transparent animationType="fade">
              <TouchableOpacity 
                style={styles.modalOverlay} 
                activeOpacity={1}
                onPress={() => setProductDropdownVisible(null)}
              >
                <View style={styles.dropdownList}>
                  <Text style={styles.dropdownTitle}>
                    Select Product ({filteredProducts.length})
                    <Text style={styles.refreshHint}> - Pull to refresh</Text>
                  </Text>
                  
                  {/* Product Search Bar */}
                  <View style={styles.searchContainer}>
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search products..."
                      placeholderTextColor={isDarkMode ? "#94a3b8" : "#9ca3af"}
                      value={productSearch}
                      onChangeText={setProductSearch}
                    />
                  </View>

                  {filteredProducts.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyText}>
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
                      renderItem={({ item }) => renderDropdownItem(item, 'product')} 
                      style={styles.dropdownFlatList}
                    />
                  )}
                  
                  {/* Add Product Link */}
                  <TouchableOpacity 
                    style={styles.addNewButton}
                    onPress={navigateToAddProduct}
                  >
                    <Text style={styles.addNewButtonText}>+ Add New Product</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.dropdownClose} 
                    onPress={() => setProductDropdownVisible(null)}
                  >
                    <Text style={styles.dropdownCloseText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </Modal>

            <View style={styles.row}>
              <View style={styles.column}>
                <Text style={styles.subLabel}>Quantity</Text>
                <TextInput
                  style={[styles.input, hasError && styles.inputError]}
                  placeholder="Qty"
                  placeholderTextColor={isDarkMode ? "#94a3b8" : "#9ca3af"}
                  keyboardType="numeric"
                  value={product.quantity.toString()}
                  onChangeText={(val) => updateProduct(index, "quantity", val)}
                />
                {product.name && stockInfo && (
                  <Text style={[styles.stockHint, { color: stockInfo.color }]}>
                    {stockInfo.text}
                  </Text>
                )}
              </View>
              
              <View style={styles.column}>
                <Text style={styles.subLabel}>Unit Price</Text>
                <TextInput
                  style={[
                    styles.input,
                    product.unitPrice === 0 && styles.zeroPriceInput,
                    hasError && styles.inputError
                  ]}
                  placeholder="Price"
                  placeholderTextColor={isDarkMode ? "#94a3b8" : "#9ca3af"}
                  keyboardType="numeric"
                  value={product.unitPrice.toString()}
                  onChangeText={(val) => updateProduct(index, "unitPrice", parseFloat(val) || 0)}
                />
                {product.unitPrice === 0 && product.name && (
                  <Text style={styles.warningText}>Price is 0 MAD!</Text>
                )}
              </View>
              
              <View style={styles.column}>
                <Text style={styles.subLabel}>Total</Text>
                <View style={styles.lineTotal}>
                  <Text style={styles.lineTotalText}>
                    ${getLineTotal(product).toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        );
      })}

      {/* Add Product Button - Reduced height */}
      <TouchableOpacity style={styles.addProductBtn} onPress={addProduct}>
        <Text style={styles.addProductBtnText}>+ Add Another Product</Text>
      </TouchableOpacity>

      {/* Payment Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Details</Text>
        <View style={styles.row}>
          <View style={styles.column}>
            <Text style={styles.label}>Remise (Discount)</Text>
            <TextInput 
              style={styles.input} 
              placeholder="0" 
              placeholderTextColor={isDarkMode ? "#94a3b8" : "#9ca3af"}
              keyboardType="numeric" 
              value={remise.toString()}
              onChangeText={(val) => setRemise(parseFloat(val) || 0)} 
            />
          </View>
          <View style={styles.column}>
            <Text style={styles.label}>Advance Payment</Text>
            <TextInput 
              style={styles.input} 
              placeholder="0" 
              placeholderTextColor={isDarkMode ? "#94a3b8" : "#9ca3af"}
              keyboardType="numeric" 
              value={advance.toString()}
              onChangeText={(val) => setAdvance(parseFloat(val) || 0)} 
            />
          </View>
        </View>
      </View>

      {/* Totals Summary */}
      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>Invoice Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal:</Text>
          <Text style={styles.summaryValue}>{total.toFixed(2)} MAD</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Discount:</Text>
          <Text style={styles.summaryValue}>-{remise.toFixed(2)} MAD</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Advance:</Text>
          <Text style={styles.summaryValue}>-{advance.toFixed(2)} MAD</Text>
        </View>
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Amount Due:</Text>
          <Text style={styles.totalValue}>{rest.toFixed(2)} MAD</Text>
        </View>
        
        {/* Payment Status */}
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Payment Status:</Text>
          <Text style={[
            styles.statusValue,
            rest === 0 ? styles.paidStatus : styles.pendingStatus
          ]}>
            {rest === 0 ? 'Paid' : rest === total ? 'Pending' : 'Partial'}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.saveBtn, loading && styles.saveBtnDisabled]} 
          onPress={handleCreateInvoice} 
          disabled={loading}
        >
          <Text style={styles.saveBtnText}>
            {loading ? "Creating Invoice..." : "Create Invoice"}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}