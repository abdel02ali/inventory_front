import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { generateInvoicePDFExpo, shareInvoiceAsText, showInvoiceAsText } from "../../utils/pdfGenerator";
import { deleteInvoice, updateInvoice, updateInvoiceStatus } from "../api";

type ProductItem = {
  name: string;
  quantity: number;
  price: number;
  unitPrice?: number;
  productId?: string;
};

export default function InvoiceDetailScreen() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const router = useRouter();
  const params = useLocalSearchParams();

  // Parse parameters safely and ensure ID is string
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const stringId = id ? id.toString() : "";
  
  const clientId = Array.isArray(params.clientId) ? params.clientId[0] : params.clientId;
  const clientName = Array.isArray(params.clientName) ? params.clientName[0] : params.clientName;
  const date = Array.isArray(params.date) ? params.date[0] : params.date;
  
  const total = Array.isArray(params.total)
    ? parseFloat(params.total[0] || "0")
    : parseFloat(params.total || "0");
  
  const status = Array.isArray(params.status) ? params.status[0] : params.status;
  
  const rest = Array.isArray(params.rest)
    ? parseFloat(params.rest[0] || "0")
    : parseFloat(params.rest || "0");
  
  const advance = Array.isArray(params.advance)
    ? parseFloat(params.advance[0] || "0")
    : parseFloat(params.advance || "0");
  
  const remise = Array.isArray(params.remise)
    ? parseFloat(params.remise[0] || "0")
    : parseFloat(params.remise || "0");

  // Parse products safely
  let initialProductList: ProductItem[] = [];
  try {
    const productsParam = Array.isArray(params.products) ? params.products[0] : params.products;
    initialProductList = productsParam ? JSON.parse(productsParam) : [];
  } catch (error) {
    console.error("Error parsing products:", error);
    initialProductList = [];
  }

  // State for editing
  const [isEditing, setIsEditing] = useState(false);
  const [editProducts, setEditProducts] = useState<ProductItem[]>(initialProductList);
  const [editRemise, setEditRemise] = useState(remise);
  const [editAdvance, setEditAdvance] = useState(advance);
  const [loading, setLoading] = useState(false);

  // Calculate totals based on edited values
  const editTotal = editProducts.reduce((sum, product) => 
    sum + product.quantity * (product.unitPrice || product.price), 0
  );
  const editTotalAfterDiscount = editTotal - editRemise;
  const editRest = Math.max(0, editTotalAfterDiscount - editAdvance);

  // Mark as Paid function
  const handleMarkPaid = async () => {
    if (!stringId) {
      Alert.alert("Error", "Invoice ID not found");
      return;
    }

    Alert.alert(
      "Mark as Paid",
      "Are you sure you want to mark this invoice as paid? This will set the amount due to 0 MAD.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Mark Paid", 
          onPress: async () => {
            try {
              await updateInvoiceStatus(stringId, "paid");
              Alert.alert("Success", "Invoice marked as paid successfully! Amount due set to 0 MAD.");
              router.back();
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to mark invoice as paid");
            }
          }
        }
      ]
    );
  };

  // Mark as Not Paid function
  const handleMarkNotPaid = async () => {
    if (!stringId) {
      Alert.alert("Error", "Invoice ID not found");
      return;
    }

    Alert.alert(
      "Mark as Not Paid",
      "Are you sure you want to mark this invoice as not paid?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Mark Not Paid", 
          onPress: async () => {
            try {
              await updateInvoiceStatus(stringId, "not paid");
              Alert.alert("Success", "Invoice marked as not paid!");
              router.back();
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to update invoice status");
            }
          }
        }
      ]
    );
  };

  // Modify function - Toggle edit mode
  const handleModify = () => {
    setIsEditing(true);
    // Reset edit values to current values
    setEditProducts([...initialProductList]);
    setEditRemise(remise);
    setEditAdvance(advance);
  };

  // Save modifications
  const handleSave = async () => {
    if (!stringId) {
      Alert.alert("Error", "Invoice ID not found");
      return;
    }

    console.log('🔄 Starting invoice update...');
    console.log('📝 Invoice ID:', stringId);
    
    // Validate products
    const validationError = validateProducts(editProducts);
    if (validationError) {
      Alert.alert("Validation Error", validationError);
      return;
    }

    setLoading(true);
    try {
      const updateData = {
        products: editProducts.map(p => ({
          name: p.name,
          quantity: p.quantity,
          unitPrice: p.unitPrice || p.price || 0,
          price: p.unitPrice || p.price || 0,
          productId: p.productId || ''
        })),
        remise: editRemise,
        advance: editAdvance,
        total: editTotal,
        totalAfterDiscount: editTotalAfterDiscount,
        rest: editRest,
        updatedAt: new Date().toISOString(),
      };

      console.log('📤 Calling updateInvoice API with products:', updateData.products);
      
      const result = await updateInvoice(stringId, updateData);
      
      console.log('✅ Update successful:', result);
      
      Alert.alert("Success", "Invoice updated successfully! Stock quantities have been adjusted.", [
        { 
          text: "OK", 
          onPress: () => {
            setIsEditing(false);
            router.back();
          }
        }
      ]);
    } catch (error: any) {
      console.error('❌ Update failed:', error);
      Alert.alert("Error", error.message || "Failed to update invoice");
    } finally {
      setLoading(false);
    }
  };

  // Add the validation function
  const validateProducts = (products: ProductItem[]): string | null => {
    for (const product of products) {
      if (!product.name?.trim()) {
        return "All products must have a name";
      }
      if (product.quantity <= 0) {
        return "All products must have a quantity greater than 0";
      }
      if ((product.unitPrice || product.price) <= 0) {
        return "All products must have a price greater than 0";
      }
    }
    return null;
  };

  const handleExportPDF = async () => {
    try {
      // Prepare invoice data for PDF
      const invoiceData = {
        id: stringId,
        invoiceId: stringId,
        clientId: clientId,
        clientName: clientName,
        date: date,
        products: currentProducts,
        total: currentTotal,
        remise: currentRemise,
        advance: currentAdvance,
        rest: currentRest,
        paid: status?.toLowerCase() === 'paid',
        status: status
      };

      Alert.alert(
        "Export Invoice",
        "Choose export option:",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "PDF Document", 
            onPress: async () => {
              try {
                await generateInvoicePDFExpo(invoiceData);
                console.log('PDF exported successfully');
              } catch (error: any) {
                Alert.alert("Error", "Failed to export PDF: " + error.message);
              }
            }
          },
          { 
            text: "Text File", 
            onPress: async () => {
              try {
                await shareInvoiceAsText(invoiceData);
              } catch (error: any) {
                Alert.alert("Error", "Failed to share invoice: " + error.message);
              }
            }
          },
          { 
            text: "View Text", 
            onPress: () => {
              const textContent = showInvoiceAsText(invoiceData);
              Alert.alert(
                "Invoice Summary",
                textContent,
                [
                  { text: "Close", style: "cancel" },
                  { 
                    text: "Copy", 
                    onPress: () => {
                      // You can add clipboard copying here if needed
                    }
                  }
                ]
              );
            }
          }
        ]
      );
    } catch (error: any) {
      Alert.alert("Error", "Failed to prepare export: " + error.message);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditProducts([...initialProductList]);
    setEditRemise(remise);
    setEditAdvance(advance);
  };

  // Update product field in edit mode
  const updateEditProduct = (index: number, field: keyof ProductItem, value: string | number) => {
    const updated = [...editProducts];
    
    if (field === "quantity" || field === "price" || field === "unitPrice") {
      updated[index][field] = typeof value === "string" ? parseFloat(value) || 0 : value;
    } else {
      updated[index][field] = value as string;
    }
    
    setEditProducts(updated);
  };

  // Add new product in edit mode
  const addEditProduct = () => {
    setEditProducts([...editProducts, { name: "", quantity: 1, price: 0 }]);
  };

  // Remove product in edit mode
  const removeEditProduct = (index: number) => {
    if (editProducts.length > 1) {
      const updated = editProducts.filter((_, i) => i !== index);
      setEditProducts(updated);
    }
  };

  // Delete function
  const handleDelete = async () => {
    if (!stringId) {
      Alert.alert("Error", "Invoice ID not found");
      return;
    }

    Alert.alert(
      "Delete Invoice",
      "Are you sure you want to delete this invoice? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              await deleteInvoice(stringId);
              Alert.alert("Success", "Invoice deleted successfully!");
              router.back();
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to delete invoice");
            }
          }
        }
      ]
    );
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "paid": return "#10b981";
      case "not paid": return "#ef4444";
      default: return "#6b7280";
    }
  };

  // Get status display text
  const getStatusText = (status: string) => {
    switch (status?.toLowerCase()) {
      case "paid": return "Paid";
      case "not paid": return "Not Paid";
      default: return status || "Unknown";
    }
  };

  // Current values (based on edit mode or original)
  const currentProducts = isEditing ? editProducts : initialProductList;
  const currentRemise = isEditing ? editRemise : remise;
  const currentAdvance = isEditing ? editAdvance : advance;
  const currentTotal = isEditing ? editTotal : total;
  const currentTotalAfterDiscount = isEditing ? editTotalAfterDiscount : (total - remise);
  const currentRest = isEditing ? editRest : rest;

  const styles = getStyles(isDarkMode);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: isEditing ? "Edit Invoice" : "Invoice Details",
          headerStyle: {
            backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
          },
          headerTintColor: isDarkMode ? "#f1f5f9" : "#1e293b",
          headerTitleStyle: {
            color: isDarkMode ? "#f1f5f9" : "#1e293b",
          }
        }}
      />
      
      {/* Edit Mode Banner */}
      {isEditing && (
        <View style={styles.editBanner}>
          <Text style={styles.editBannerText}>✏️ Editing Mode</Text>
          <Text style={styles.editBannerSubtext}>Modify invoice details below</Text>
        </View>
      )}

      <FlatList
        data={currentProducts}
        keyExtractor={(_, index) => index.toString()}
        showsVerticalScrollIndicator={true}
        ListHeaderComponent={
          <>
            {/* Header Card */}
            <View style={styles.headerCard}>
              <View style={styles.invoiceHeader}>
                <Text style={styles.invoiceTitle}>
                  Invoice #{stringId}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
                  <Text style={styles.statusText}>{getStatusText(status)}</Text>
                </View>
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Client</Text>
                  <Text style={styles.infoValue}>{clientName || clientId}</Text>
                </View>
                
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Date</Text>
                  <Text style={styles.infoValue}>{date}</Text>
                </View>
                
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Total Amount</Text>
                  <Text style={styles.totalAmount}>
                    {currentTotal.toFixed(2)} MAD
                  </Text>
                </View>
              </View>
            </View>

            {/* Products Section */}
            <View style={styles.productsSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <Text style={styles.sectionTitle}>
                    Products & Services
                  </Text>
                  <Text style={styles.productCount}>
                    {currentProducts.length} items
                  </Text>
                </View>
                {isEditing && (
                  <TouchableOpacity style={styles.addProductBtn} onPress={addEditProduct}>
                    <Text style={styles.addProductBtnText}>+ Add Item</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { flex: 3 }]}>Item</Text>
                <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Qty</Text>
                <Text style={[styles.tableHeaderText, { flex: 2, textAlign: 'right' }]}>Unit Price</Text>
                <Text style={[styles.tableHeaderText, { flex: 2, textAlign: 'right' }]}>Total</Text>
                {isEditing && (
                  <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Actions</Text>
                )}
              </View>
            </View>
          </>
        }
        renderItem={({ item, index }) => (
          <View style={styles.tableRow}>
            {isEditing ? (
              <>
                <TextInput
                  style={[styles.editInput, { flex: 3 }]}
                  value={item.name}
                  onChangeText={(value) => updateEditProduct(index, "name", value)}
                  placeholder="Item name"
                  placeholderTextColor={isDarkMode ? "#94a3b8" : "#9ca3af"}
                />
                <TextInput
                  style={[styles.editInput, { flex: 1, textAlign: 'center' }]}
                  value={item.quantity.toString()}
                  onChangeText={(value) => updateEditProduct(index, "quantity", value)}
                  keyboardType="numeric"
                  placeholder="1"
                  placeholderTextColor={isDarkMode ? "#94a3b8" : "#9ca3af"}
                />
                <TextInput
                  style={[styles.editInput, { flex: 2, textAlign: 'right' }]}
                  value={(item.unitPrice || item.price).toString()}
                  onChangeText={(value) => updateEditProduct(index, "unitPrice", value)}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor={isDarkMode ? "#94a3b8" : "#9ca3af"}
                />
                <Text style={[styles.tableCell, { flex: 2, textAlign: 'right' }]}>
                  {((item.unitPrice || item.price) * item.quantity).toFixed(2)} MAD
                </Text>
                <View style={[styles.actionCell, { flex: 1 }]}>
                  <TouchableOpacity 
                    style={[styles.removeBtn, editProducts.length === 1 && styles.removeBtnDisabled]}
                    onPress={() => removeEditProduct(index)}
                    disabled={editProducts.length === 1}
                  >
                    <Text style={styles.removeBtnText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={[styles.tableCell, { flex: 3 }]}>
                  {item.name || "Unnamed Item"}
                </Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>
                  {item.quantity}
                </Text>
                <Text style={[styles.tableCell, { flex: 2, textAlign: 'right' }]}>
                  {(item.unitPrice || item.price).toFixed(2)} MAD
                </Text>
                <Text style={[styles.tableCell, { flex: 2, textAlign: 'right' }]}>
                  {((item.unitPrice || item.price) * item.quantity).toFixed(2)} MAD
                </Text>
              </>
            )}
          </View>
        )}
        ListFooterComponent={
          <>
            {/* Payment Summary */}
            <View style={styles.paymentCard}>
              <Text style={styles.paymentTitle}>
                Payment Summary
              </Text>
              
              <View style={styles.paymentSummary}>
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Subtotal</Text>
                  <Text style={styles.paymentValue}>
                    {currentTotal.toFixed(2)} MAD
                  </Text>
                </View>
                
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>
                    Discount {isEditing ? "" : `(-${currentRemise.toFixed(2)} MAD)`}
                  </Text>
                  {isEditing ? (
                    <View style={styles.discountInputContainer}>
                      <Text style={styles.currencySymbol}>MAD</Text>
                      <TextInput
                        style={[styles.editInput, styles.discountInput]}
                        value={currentRemise.toString()}
                        onChangeText={(value) => setEditRemise(parseFloat(value) || 0)}
                        keyboardType="numeric"
                        placeholder="0.00"
                        placeholderTextColor={isDarkMode ? "#94a3b8" : "#9ca3af"}
                      />
                    </View>
                  ) : (
                    <Text style={[styles.paymentValue, styles.discountValue]}>
                      {(currentTotal - currentRemise).toFixed(2)} MAD
                    </Text>
                  )}
                </View>

                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>
                    Advance Paid {isEditing ? "" : `(-${currentAdvance.toFixed(2)} MAD)`}
                  </Text>
                  {isEditing ? (
                    <View style={styles.discountInputContainer}>
                      <Text style={styles.currencySymbol}>MAD</Text>
                      <TextInput
                        style={[styles.editInput, styles.advanceInput]}
                        value={currentAdvance.toString()}
                        onChangeText={(value) => setEditAdvance(parseFloat(value) || 0)}
                        keyboardType="numeric"
                        placeholder="0.00"
                        placeholderTextColor={isDarkMode ? "#94a3b8" : "#9ca3af"}
                      />
                    </View>
                  ) : (
                    <Text style={[styles.paymentValue, styles.advanceValue]}>
                      {(currentTotal - currentRemise - currentAdvance).toFixed(2)} MAD
                    </Text>
                  )}
                </View>

                <View style={[styles.paymentRow, styles.finalAmountRow]}>
                  <Text style={styles.finalAmountLabel}>Amount Due</Text>
                  <Text style={[
                    styles.finalAmountValue,
                    currentRest === 0 && styles.zeroAmount
                  ]}>
                    {currentRest.toFixed(2)} MAD
                  </Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              {!isEditing ? (
                // View Mode Buttons
                <>
                  <View style={styles.buttonRow}>
                    {status === "not paid" && currentRest > 0 && (
                      <TouchableOpacity 
                        style={[styles.actionButton, styles.paidButton]} 
                        onPress={handleMarkPaid}
                      >
                        <Text style={styles.buttonText}>💰 Mark as Paid</Text>
                      </TouchableOpacity>
                    )}
                    
                    {status === "paid" && (
                      <TouchableOpacity 
                        style={[styles.actionButton, styles.notPaidButton]} 
                        onPress={handleMarkNotPaid}
                      >
                        <Text style={styles.buttonText}>↩️ Mark as Not Paid</Text>
                      </TouchableOpacity>
                    )}
                    
                    {/* Export button in the same row */}
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.exportButton]} 
                      onPress={handleExportPDF}
                    >
                      <Text style={styles.buttonText}>📄 Export</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.buttonRow}>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.modifyButton]} 
                      onPress={handleModify}
                    >
                      <Text style={styles.buttonText}>✏️ Edit Invoice</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.deleteButton]} 
                      onPress={handleDelete}
                    >
                      <Text style={styles.buttonText}>🗑️ Delete</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                // Edit Mode Buttons
                <View style={styles.buttonRow}>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.cancelButton]} 
                    onPress={handleCancelEdit}
                    disabled={loading}
                  >
                    <Text style={styles.buttonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.saveButton, loading && styles.saveButtonDisabled]} 
                    onPress={handleSave}
                    disabled={loading}
                  >
                    <Text style={styles.buttonText}>
                      {loading ? "Saving..." : "Save Changes"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No items in this invoice
            </Text>
            {isEditing && (
              <TouchableOpacity style={styles.addProductBtn} onPress={addEditProduct}>
                <Text style={styles.addProductBtnText}>+ Add First Item</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const getStyles = (isDarkMode: boolean) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: isDarkMode ? "#121212" : "#fafafa" 
  },
  
  listContent: { 
    padding: 16, 
    paddingBottom: 32 
  },

  // Edit Banner
  editBanner: {
    backgroundColor: isDarkMode ? "#451a03" : "#fef3c7",
    padding: 16,
    borderRadius: 12,
    marginBottom: 0,
    borderLeftWidth: 4,
    borderLeftColor: "#f59e0b",
  },
  editBannerText: {
    color: isDarkMode ? "#fef3c7" : "#92400e",
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 2,
  },
  editBannerSubtext: {
    color: isDarkMode ? "#fde68a" : "#92400e",
    fontSize: 14,
    opacity: 0.8,
  },

  // Header Card
  headerCard: {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderRadius: 16,
    padding: 24,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkMode ? 0.3 : 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: isDarkMode ? "#334155" : "#f1f5f9",
  },

  invoiceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    flex: 1,
  },

  divider: {
    height: 1,
    backgroundColor: isDarkMode ? "#334155" : "#f1f5f9",
    marginVertical: 16,
  },

  // Info Grid
  infoGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  infoItem: {
    flex: 1,
    alignItems: "flex-start",
  },
  infoLabel: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    marginBottom: 6,
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 16,
    color: isDarkMode ? "#e2e8f0" : "#1e293b",
    fontWeight: "600",
  },
  totalAmount: {
    fontSize: 18,
    color: isDarkMode ? "#e2e8f0" : "#1e293b",
    fontWeight: "bold",
  },

  // Status Badge
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 12,
  },
  statusText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "bold",
  },

  // Products Section
  productsSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitleContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 4,
  },
  productCount: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  addProductBtn: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  addProductBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },

  // Table Styles
  tableHeader: {
    flexDirection: "row",
    backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#e2e8f0",
  },
  tableHeaderText: {
    fontSize: 14,
    fontWeight: "600",
    color: isDarkMode ? "#f1f5f9" : "#374151",
  },
  
  tableRow: { 
    flexDirection: "row", 
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    minHeight: 56,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: isDarkMode ? "#334155" : "#f1f5f9",
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
  },
  tableCell: { 
    fontSize: 15,
    fontWeight: "500",
    color: isDarkMode ? "#e2e8f0" : "#374151",
  },

  // Edit Inputs
  editInput: {
    backgroundColor: isDarkMode ? "#334155" : "#ffffff",
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#e2e8f0",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginHorizontal: 2,
  },
  discountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    color: isDarkMode ? "#94a3b8" : "#64748b",
    marginRight: 6,
    fontWeight: '500',
  },
  discountInput: { 
    width: 90, 
    textAlign: 'right',
  },
  advanceInput: { 
    width: 90, 
    textAlign: 'right',
  },

  // Remove Button
  removeBtn: {
    backgroundColor: isDarkMode ? "#7f1d1d" : "#fef2f2",
    padding: 6,
    borderRadius: 6,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: isDarkMode ? "#991b1b" : "#fecaca",
  },
  removeBtnDisabled: {
    backgroundColor: isDarkMode ? "#374151" : "#f3f4f6",
    borderColor: isDarkMode ? "#4b5563" : "#d1d5db",
    opacity: 0.5,
  },
  removeBtnText: {
    fontSize: 12,
    color: isDarkMode ? "#fecaca" : "#000",
  },
  actionCell: {
    alignItems: "center",
    justifyContent: "center",
  },

  // Payment Card
  paymentCard: {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    marginTop: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkMode ? 0.3 : 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: isDarkMode ? "#334155" : "#f1f5f9",
  },
  paymentTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 16,
  },

  // Payment Summary
  paymentSummary: {
    gap: 8,
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  paymentLabel: {
    fontSize: 15,
    color: isDarkMode ? "#cbd5e1" : "#64748b",
    fontWeight: "500",
  },
  paymentValue: {
    fontSize: 15,
    color: isDarkMode ? "#e2e8f0" : "#1e293b",
    fontWeight: "600",
  },
  discountValue: {
    color: "#10b981",
    fontWeight: "600",
  },
  advanceValue: {
    color: "#3b82f6",
    fontWeight: "600",
  },
  finalAmountRow: {
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: isDarkMode ? "#334155" : "#f1f5f9",
    marginTop: 8,
  },
  finalAmountLabel: {
    fontSize: 17,
    fontWeight: "bold",
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
  },
  finalAmountValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: isDarkMode ? "#60a5fa" : "#1e40af",
  },
  zeroAmount: {
    color: "#10b981",
  },

  // Empty State
  emptyState: {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    padding: 40,
    borderRadius: 16,
    alignItems: "center",
    marginVertical: 20,
    borderWidth: 1,
    borderColor: isDarkMode ? "#334155" : "#f1f5f9",
  },
  emptyText: { 
    textAlign: "center", 
    color: isDarkMode ? "#cbd5e1" : "#64748b", 
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 16,
  },

  // Action Buttons
  buttonContainer: {
    gap: 12,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkMode ? 0.4 : 0.08,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 54,
    justifyContent: "center",
  },
  paidButton: {
    backgroundColor: "#10b981",
  },
  notPaidButton: {
    backgroundColor: "#f59e0b",
  },
  modifyButton: {
    backgroundColor: "#3b82f6",
  },
  deleteButton: {
    backgroundColor: "#ef4444",
  },
  saveButton: {
    backgroundColor: "#10b981",
  },
  saveButtonDisabled: {
    backgroundColor: "#9ca3af",
    opacity: 0.6,
  },
  cancelButton: {
    backgroundColor: "#6b7280",
  },
  exportButton: {
    backgroundColor: '#8b5cf6',
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
    textAlign: "center",
  },
});