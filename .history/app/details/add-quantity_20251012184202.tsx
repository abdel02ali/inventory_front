import { Stack, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Keyboard,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useColorScheme,
  View,
} from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import { addProductQuantities, removeProductQuantities } from "../api";
import { useAppContext } from "../context/appContext";

type ProductSelection = {
  productId: string | null;
  quantity: string;
  action: "add" | "remove";
};

// Recipient types for stock management
type RecipientType = {
  label: string;
  value: string;
};

export default function ManageStockScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { products, refreshProducts } = useAppContext();

  const [selections, setSelections] = useState<ProductSelection[]>([
    { productId: null, quantity: "", action: "add" },
  ]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<string>("");
  const [customRecipient, setCustomRecipient] = useState("");

  // Recipient options
  const recipientOptions: RecipientType[] = [
    { label: "☕ Coffee Bar", value: "coffee_bar" },
    { label: "👨‍🍳 Kitchen Staff", value: "kitchen_staff" },
    { label: "🍽️ Restaurant Staff", value: "restaurant_staff" },
    { label: "🧹 Cleaning Staff", value: "cleaning_staff" },
    { label: "📦 Storage/Inventory", value: "storage" },
    { label: "🏢 Management", value: "management" },
    { label: "🎯 Special Event", value: "special_event" },
    { label: "📋 Other (Specify)", value: "other" },
  ];

  // Refresh products when the screen comes into focus
  useEffect(() => {
    const refreshProductsList = async () => {
      setRefreshing(true);
      try {
        await refreshProducts();
      } catch (error) {
        console.error('Failed to refresh products:', error);
      } finally {
        setRefreshing(false);
      }
    };

    refreshProductsList();
  }, []);

  // Get the actual quantity from Firestore data (q, quantity, or stock)
  const getProductQuantity = useCallback((product: any) => {
    return product.q || product.quantity || product.stock || 0;
  }, []);

  // Get product name by ID
  const getProductName = useCallback((productId: string) => {
    const product = products.find(p => p.id === productId);
    return product ? product.name : "Unknown Product";
  }, [products]);

  // Get recipient display name
  const getRecipientDisplayName = useCallback(() => {
    if (selectedRecipient === "other") {
      return customRecipient || "Other";
    }
    const recipient = recipientOptions.find(r => r.value === selectedRecipient);
    return recipient ? recipient.label : "Not specified";
  }, [selectedRecipient, customRecipient]);

  // Check for duplicate products
  const duplicateProducts = useMemo(() => {
    const productIds = selections
      .filter(sel => sel.productId && sel.productId !== "add_new")
      .map(sel => sel.productId);
    
    const duplicates = productIds.filter((id, index) => productIds.indexOf(id) !== index);
    return [...new Set(duplicates)];
  }, [selections]);

  // Check for empty or invalid quantities
  const invalidQuantities = useMemo(() => {
    const invalid = [];
    for (let i = 0; i < selections.length; i++) {
      const sel = selections[i];
      if (sel.productId && sel.productId !== "add_new") {
        const quantity = Number(sel.quantity);
        if (!sel.quantity || quantity <= 0) {
          invalid.push(`Row ${i + 1}: Quantity must be greater than 0`);
        }
        if (sel.action === "remove") {
          const product = products.find(p => p.id === sel.productId);
          const currentStock = getProductQuantity(product);
          if (quantity > currentStock) {
            invalid.push(`Row ${i + 1}: Cannot remove ${quantity} from ${getProductName(sel.productId)} (only ${currentStock} available)`);
          }
        }
      }
    }
    return invalid;
  }, [selections, products, getProductQuantity, getProductName]);

  // Calculate totals for summary
  const totals = useMemo(() => {
    let totalAdd = 0;
    let totalRemove = 0;
    let productsAdd = 0;
    let productsRemove = 0;

    selections.forEach(sel => {
      if (sel.productId && sel.productId !== "add_new" && sel.quantity && Number(sel.quantity) > 0) {
        if (sel.action === "add") {
          totalAdd += Number(sel.quantity);
          productsAdd++;
        } else {
          totalRemove += Number(sel.quantity);
          productsRemove++;
        }
      }
    });

    return { totalAdd, totalRemove, productsAdd, productsRemove };
  }, [selections]);

  const dropdownData = useMemo(() => [
    ...products.map((p) => ({
      label: `${p.name} (Stock: ${getProductQuantity(p)})`,
      value: p.id,
    })),
    { label: "➕ Add New Product", value: "add_new" },
  ], [products, getProductQuantity]);

  // Filter dropdown to exclude already selected products (except current one)
  const getFilteredDropdownData = useCallback((currentIndex: number) => {
    const selectedProductIds = selections
      .filter((_, index) => index !== currentIndex)
      .map(sel => sel.productId)
      .filter(id => id && id !== "add_new");

    return dropdownData.filter(item => 
      !selectedProductIds.includes(item.value) || item.value === selections[currentIndex].productId
    );
  }, [selections, dropdownData]);

  // Set global action for all products
  const setGlobalAction = useCallback((action: "add" | "remove") => {
    const newSelections = selections.map(sel => ({
      ...sel,
      action: action,
      quantity: "" // Clear quantities when changing global action
    }));
    setSelections(newSelections);
  }, [selections]);

  const handleManageStock = async () => {
    Keyboard.dismiss();

    // Validation checks
    if (duplicateProducts.length > 0) {
      const duplicateNames = duplicateProducts.map(id => getProductName(id!)).join(', ');
      Alert.alert(
        "❌ Duplicate Products", 
        `Please remove duplicate products:\n${duplicateNames}\n\nEach product can only appear once.`
      );
      return;
    }

    if (invalidQuantities.length > 0) {
      Alert.alert(
        "❌ Invalid Quantities", 
        `Please fix the following issues:\n\n${invalidQuantities.join('\n')}`
      );
      return;
    }

    // Validate recipient for removal actions
    const hasRemoveActions = selections.some(sel => 
      sel.action === "remove" && sel.productId && sel.productId !== "add_new" && sel.quantity && Number(sel.quantity) > 0
    );

    if (hasRemoveActions && !selectedRecipient) {
      Alert.alert(
        "❌ Missing Information", 
        "Please select who is taking the products from stock when removing items."
      );
      return;
    }

    if (selectedRecipient === "other" && !customRecipient.trim()) {
      Alert.alert(
        "❌ Missing Information", 
        "Please specify the recipient for the products."
      );
      return;
    }

    // Filter out empty selections and "add_new" items
    const validSelections = selections.filter(sel => 
      sel.productId && sel.productId !== "add_new" && sel.quantity && Number(sel.quantity) > 0
    );

    if (validSelections.length === 0) {
      Alert.alert("⚠️ Missing Data", "Please select products and enter quantities to manage.");
      return;
    }

    setLoading(true);

    try {
      const productsToAdd = validSelections
        .filter(sel => sel.action === "add")
        .map(sel => ({
          productId: sel.productId!,
          quantityToAdd: Number(sel.quantity)
        }));

      const productsToRemove = validSelections
        .filter(sel => sel.action === "remove")
        .map(sel => ({
          productId: sel.productId!,
          quantityToRemove: Number(sel.quantity)
        }));

      console.log('📤 Managing product stock:', { 
        productsToAdd, 
        productsToRemove,
        recipient: getRecipientDisplayName()
      });
      
      // Execute both operations
      const promises = [];
      if (productsToAdd.length > 0) {
        promises.push(addProductQuantities(productsToAdd));
      }
      if (productsToRemove.length > 0) {
        promises.push(removeProductQuantities(productsToRemove));
      }

      const results = await Promise.all(promises);
      
      console.log('✅ Stock managed successfully:', results);
      
      // Refresh products to get updated quantities
      await refreshProducts();
      
      const { totalAdd, totalRemove, productsAdd, productsRemove } = totals;
      
      let successMessage = "Stock updated successfully!";
      if (productsToAdd.length > 0 && productsToRemove.length > 0) {
        successMessage = `✅ Added ${totalAdd} units to ${productsAdd} product(s)\n✅ Removed ${totalRemove} units from ${productsRemove} product(s)`;
        if (productsToRemove.length > 0) {
          successMessage += `\n👤 Taken by: ${getRecipientDisplayName()}`;
        }
      } else if (productsToAdd.length > 0) {
        successMessage = `✅ Added ${totalAdd} units to ${productsAdd} product(s)`;
      } else if (productsToRemove.length > 0) {
        successMessage = `✅ Removed ${totalRemove} units from ${productsRemove} product(s)\n👤 Taken by: ${getRecipientDisplayName()}`;
      }
      
      Alert.alert(
        "✅ Success", 
        successMessage,
        [
          { 
            text: "OK", 
            onPress: () => {
              setSelections([{ productId: null, quantity: "", action: "add" }]);
              setSelectedRecipient("");
              setCustomRecipient("");
              router.back();
            }
          }
        ]
      );
      
    } catch (error: any) {
      console.error('❌ Failed to manage stock:', error);
      
      let errorMessage = "Failed to manage product stock. Please try again.";
      
      if (error.message === 'Request timeout') {
        errorMessage = "Request timed out. Please check your server connection.";
      } else if (error.response?.status === 500) {
        errorMessage = "Server error. Please check your backend logs.";
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      Alert.alert("❌ Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateSelection = useCallback((index: number, field: keyof ProductSelection, value: string) => {
    const newSelections = [...selections];
    
    if (field === "productId" && value === "add_new") {
      router.push("/details/add-product");
      return;
    }
    
    // Handle different field types safely
    if (field === "action") {
      newSelections[index][field] = value as "add" | "remove";
      // Clear quantity when changing action for safety
      newSelections[index].quantity = "";
    } else if (field === "productId") {
      newSelections[index][field] = value as string | null;
    } else {
      newSelections[index][field] = value;
    }
    
    setSelections(newSelections);
  }, [selections, router]);

  const addAnotherSelection = useCallback(() => {
    const currentAction = selections.length > 0 ? selections[0].action : "add";
    setSelections([...selections, { productId: null, quantity: "", action: currentAction }]);
  }, [selections]);

  const removeSelection = useCallback((index: number) => {
    if (selections.length > 1) {
      const newSelections = selections.filter((_, i) => i !== index);
      setSelections(newSelections);
    }
  }, [selections]);

  // Manual refresh function
  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshProducts();
      Alert.alert("✅ Success", "Product list updated!");
    } catch (error) {
      Alert.alert("❌ Error", "Failed to refresh product list.");
    } finally {
      setRefreshing(false);
    }
  };

  // Navigate to add product
  const navigateToAddProduct = () => {
    router.push("/details/add-product");
  };

  // Check if any selection has "add_new" that wasn't handled
  const hasUnhandledAddNew = selections.some(sel => sel.productId === "add_new");

  const { totalAdd, totalRemove, productsAdd, productsRemove } = totals;
  const hasValidSelections = totalAdd > 0 || totalRemove > 0;
  const hasRemoveActions = selections.some(sel => sel.action === "remove");
  const allActionsSame = selections.every(sel => sel.action === selections[0].action);
  const globalAction = allActionsSame ? selections[0].action : "mixed";

  // Check if recipient is required and valid
  const isRecipientValid = !hasRemoveActions || (selectedRecipient && (selectedRecipient !== "other" || customRecipient.trim()));

  // Render Header Component
  const renderHeader = useCallback(() => (
    <View>
      <Text style={[styles.title, colorScheme === "dark" ? styles.titleDark : styles.titleLight]}>
        📦 Manage Stock
      </Text>
      <Text style={[styles.subtitle, colorScheme === "dark" && styles.subtitleDark]}>
        Select products and manage their stock quantities
      </Text>

      {/* Action Buttons Row */}
      <View style={styles.actionButtonsRow}>
        <TouchableOpacity
          style={[styles.actionButton, styles.refreshButton, colorScheme === "dark" && styles.refreshButtonDark]}
          onPress={handleManualRefresh}
          disabled={refreshing}
        >
          <Text style={styles.actionButtonText}>
            {refreshing ? "🔄 Refreshing..." : "🔄 Refresh List"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.addProductButton, colorScheme === "dark" && styles.addProductButtonDark]}
          onPress={navigateToAddProduct}
        >
          <Text style={styles.actionButtonText}>➕ New Product</Text>
        </TouchableOpacity>
      </View>

      {/* Action Selection Section */}
      <View style={[styles.actionSection, colorScheme === "dark" && styles.actionSectionDark]}>
        <Text style={[styles.sectionTitle, colorScheme === "dark" && styles.sectionTitleDark]}>
          Action for All Products
        </Text>
        
        <View style={[styles.actionSelector, colorScheme === "dark" && styles.actionSelectorDark]}>
          <TouchableOpacity
            style={[
              styles.globalActionButton,
              styles.globalActionButtonAdd,
              colorScheme === "dark" && styles.globalActionButtonAddDark,
              globalAction === "add" && styles.globalActionButtonAddActive,
              globalAction === "add" && colorScheme === "dark" && styles.globalActionButtonAddActiveDark,
            ]}
            onPress={() => setGlobalAction("add")}
          >
            <Text style={[
              styles.globalActionButtonText,
              colorScheme === "dark" && styles.globalActionButtonTextDark,
              globalAction === "add" && styles.globalActionButtonTextActive
            ]}>
              ➕ Add to Stock
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.globalActionButton,
              styles.globalActionButtonRemove,
              colorScheme === "dark" && styles.globalActionButtonRemoveDark,
              globalAction === "remove" && styles.globalActionButtonRemoveActive,
              globalAction === "remove" && colorScheme === "dark" && styles.globalActionButtonRemoveActiveDark,
            ]}
            onPress={() => setGlobalAction("remove")}
          >
            <Text style={[
              styles.globalActionButtonText,
              colorScheme === "dark" && styles.globalActionButtonTextDark,
              globalAction === "remove" && styles.globalActionButtonTextActive
            ]}>
              ➖ Remove from Stock
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.actionHelpText, colorScheme === "dark" && styles.actionHelpTextDark]}>
          {globalAction === "add" 
            ? "Quantities will be added to current stock"
            : globalAction === "remove"
            ? "Quantities will be removed from current stock"
            : "Mixed actions - use global action to set all to same type"
          }
        </Text>
      </View>

      {/* Recipient Selection Section - Only show when removing items */}
      {hasRemoveActions && (
        <View style={[styles.recipientSection, colorScheme === "dark" && styles.recipientSectionDark]}>
          <Text style={[styles.sectionTitle, colorScheme === "dark" && styles.sectionTitleDark]}>
            👤 Who is taking the products?
          </Text>
          
          <Dropdown
            style={[
              styles.recipientDropdown,
              colorScheme === "dark" && styles.recipientDropdownDark,
            ]}
            placeholderStyle={[styles.placeholderStyle, colorScheme === "dark" && styles.placeholderStyleDark]}
            selectedTextStyle={[
              styles.selectedTextStyle,
              colorScheme === "dark" && styles.selectedTextStyleDark,
            ]}
            data={recipientOptions}
            labelField="label"
            valueField="value"
            placeholder="Select recipient..."
            search
            searchPlaceholder="Search recipients..."
            value={selectedRecipient}
            onChange={(item) => {
              setSelectedRecipient(item.value);
              if (item.value !== "other") {
                setCustomRecipient("");
              }
            }}
          />

          {selectedRecipient === "other" && (
            <TextInput
              style={[
                styles.customRecipientInput,
                colorScheme === "dark" && styles.customRecipientInputDark,
              ]}
              placeholder="Specify recipient (e.g., Event Name, Department)"
              placeholderTextColor={colorScheme === "dark" ? "#94a3b8" : "#64748b"}
              value={customRecipient}
              onChangeText={setCustomRecipient}
            />
          )}

          <Text style={[styles.recipientHelpText, colorScheme === "dark" && styles.recipientHelpTextDark]}>
            This helps track where products are being used
          </Text>
        </View>
      )}

      <Text style={[styles.sectionTitle, colorScheme === "dark" && styles.sectionTitleDark]}>
        Products to Update ({selections.length})
      </Text>
    </View>
  ), [colorScheme, refreshing, globalAction, setGlobalAction, hasRemoveActions, selectedRecipient, customRecipient]);

  // Render Product Item
  const renderProductItem = useCallback(({ item, index }: { item: ProductSelection; index: number }) => {
    const isSelected = !!item.productId && item.productId !== "add_new";
    const selectedProduct = products.find(p => p.id === item.productId);
    const currentStock = selectedProduct ? getProductQuantity(selectedProduct) : 0;
    const isDuplicate = duplicateProducts.includes(item.productId);
    const hasInvalidQuantity = invalidQuantities.some(msg => msg.includes(`Row ${index + 1}`));

    return (
      <View style={styles.selectionContainer}>
        <View style={styles.rowHeader}>
          <Text style={[styles.rowNumber, colorScheme === "dark" && styles.textDark]}>
            Product {index + 1}
          </Text>
          {selections.length > 1 && (
            <TouchableOpacity 
              style={styles.removeButton}
              onPress={() => removeSelection(index)}
            >
              <Text style={styles.removeButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <View
          style={[
            styles.row,
            colorScheme === "dark" && styles.rowDark,
            isSelected &&
              (colorScheme === "dark"
                ? styles.rowSelectedDark
                : styles.rowSelectedLight),
            isDuplicate && styles.rowDuplicate,
            hasInvalidQuantity && styles.rowInvalid,
          ]}
        >
          {/* Product Dropdown */}
          <Dropdown
            style={[
              styles.dropdown,
              colorScheme === "dark" && styles.dropdownDark,
              isSelected &&
                (colorScheme === "dark"
                  ? styles.dropdownSelectedDark
                  : styles.dropdownSelectedLight),
              isDuplicate && styles.dropdownDuplicate,
            ]}
            placeholderStyle={[styles.placeholderStyle, colorScheme === "dark" && styles.placeholderStyleDark]}
            selectedTextStyle={[
              styles.selectedTextStyle,
              colorScheme === "dark" && styles.selectedTextStyleDark,
              isSelected && { fontWeight: "bold" },
              isDuplicate && { color: "#dc2626" },
            ]}
            data={getFilteredDropdownData(index)}
            labelField="label"
            valueField="value"
            placeholder={refreshing ? "Loading products..." : "Select product..."}
            search
            searchPlaceholder="Search products..."
            value={item.productId}
            onChange={(selectedItem) => updateSelection(index, "productId", selectedItem.value)}
            disable={refreshing}
            flatListProps={{
              initialNumToRender: 10,
              maxToRenderPerBatch: 10,
              windowSize: 5,
              removeClippedSubviews: true,
            }}
          />

          {/* Quantity Input */}
          {item.productId && item.productId !== "add_new" && (
            <View style={styles.quantityContainer}>
              <TextInput
                style={[
                  styles.input,
                  colorScheme === "dark" && styles.inputDark,
                  isSelected &&
                    (colorScheme === "dark"
                      ? styles.inputSelectedDark
                      : styles.inputSelectedLight),
                  hasInvalidQuantity && styles.inputInvalid,
                  item.action === "add" && styles.inputAdd,
                  item.action === "remove" && styles.inputRemove,
                ]}
                placeholder="Qty"
                placeholderTextColor={colorScheme === "dark" ? "#94a3b8" : "#64748b"}
                keyboardType="numeric"
                value={item.quantity}
                onChangeText={(val) => updateSelection(index, "quantity", val)}
              />
            </View>
          )}
        </View>

        {/* Error Messages */}
        {isDuplicate && (
          <Text style={styles.errorText}>❌ This product is already selected</Text>
        )}
        {hasInvalidQuantity && (
          <Text style={styles.errorText}>
            {invalidQuantities.find(msg => msg.includes(`Row ${index + 1}`))?.replace(`Row ${index + 1}: `, '')}
          </Text>
        )}
      </View>
    );
  }, [colorScheme, products, duplicateProducts, invalidQuantities, refreshing, getFilteredDropdownData, updateSelection, removeSelection, getProductQuantity]);

  // Render Footer Component
  const renderFooter = useCallback(() => (
    <View>
      {/* Add another row */}
      <TouchableOpacity
        style={[styles.addAnother, colorScheme === "dark" && styles.addAnotherDark]}
        onPress={addAnotherSelection}
        disabled={refreshing}
      >
        <Text style={[styles.addAnotherText, colorScheme === "dark" && styles.addAnotherTextDark]}>
          + Add Another Product
        </Text>
      </TouchableOpacity>

      {/* Validation Summary */}
      {(duplicateProducts.length > 0 || invalidQuantities.length > 0 || (hasRemoveActions && !isRecipientValid)) && (
        <View style={[styles.validationSummary, colorScheme === "dark" && styles.validationSummaryDark]}>
          <Text style={[styles.validationTitle, colorScheme === "dark" && styles.validationTitleDark]}>
            ⚠️ Please fix the following:
          </Text>
          {duplicateProducts.map((id, index) => (
            <Text key={index} style={[styles.validationItem, colorScheme === "dark" && styles.validationItemDark]}>
              • Remove duplicate: {getProductName(id!)}
            </Text>
          ))}
          {invalidQuantities.map((msg, index) => (
            <Text key={index} style={[styles.validationItem, colorScheme === "dark" && styles.validationItemDark]}>
              • {msg}
            </Text>
          ))}
          {hasRemoveActions && !isRecipientValid && (
            <Text style={[styles.validationItem, colorScheme === "dark" && styles.validationItemDark]}>
              • Select who is taking the products from stock
            </Text>
          )}
        </View>
      )}

      {/* Total Summary */}
      {(totalAdd > 0 || totalRemove > 0) && (
        <View style={styles.summaryContainer}>
          <Text style={[styles.summaryTitle, colorScheme === "dark" && styles.summaryTitleDark]}>
            Summary
          </Text>
          {totalAdd > 0 && (
            <View style={[styles.totalSummary, styles.totalSummaryAdd, colorScheme === "dark" && styles.totalSummaryAddDark]}>
              <Text style={[styles.totalTextAdd, colorScheme === "dark" && styles.totalTextAddDark]}>
                📥 To Add: {totalAdd} units
              </Text>
              <Text style={[styles.totalSubtextAdd, colorScheme === "dark" && styles.totalSubtextAddDark]}>
                across {productsAdd} product{productsAdd !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
          {totalRemove > 0 && (
            <View style={[styles.totalSummary, styles.totalSummaryRemove, colorScheme === "dark" && styles.totalSummaryRemoveDark]}>
              <Text style={[styles.totalTextRemove, colorScheme === "dark" && styles.totalTextRemoveDark]}>
                📤 To Remove: {totalRemove} units
              </Text>
              <Text style={[styles.totalSubtextRemove, colorScheme === "dark" && styles.totalSubtextRemoveDark]}>
                from {productsRemove} product{productsRemove !== 1 ? 's' : ''}
                {selectedRecipient && (
                  `\n👤 Taken by: ${getRecipientDisplayName()}`
                )}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Update Button */}
      <TouchableOpacity
        style={[
          styles.button, 
          (loading || refreshing || !hasValidSelections || duplicateProducts.length > 0 || invalidQuantities.length > 0 || (hasRemoveActions && !isRecipientValid)) && styles.buttonDisabled,
          colorScheme === "dark" && styles.buttonDark
        ]}
        onPress={handleManageStock}
        disabled={loading || refreshing || hasUnhandledAddNew || !hasValidSelections || duplicateProducts.length > 0 || invalidQuantities.length > 0 || (hasRemoveActions && !isRecipientValid)}
      >
        <Text style={styles.buttonText}>
          {loading ? "📤 Managing Stock..." : 
           refreshing ? "🔄 Loading Products..." :
           hasUnhandledAddNew ? "Refresh Product List First" : 
           duplicateProducts.length > 0 ? "Fix Duplicate Products" :
           invalidQuantities.length > 0 ? "Fix Quantity Errors" :
           hasRemoveActions && !isRecipientValid ? "Select Recipient" :
           !hasValidSelections ? "Enter Quantities to Manage" :
           `Update Stock (${totalAdd + totalRemove} units)`}
        </Text>
      </TouchableOpacity>
    </View>
  ), [colorScheme, refreshing, duplicateProducts, invalidQuantities, totalAdd, totalRemove, productsAdd, productsRemove, loading, hasUnhandledAddNew, hasValidSelections, hasRemoveActions, isRecipientValid, selectedRecipient, addAnotherSelection, getProductName, getRecipientDisplayName, handleManageStock]);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <SafeAreaView
        style={[styles.container, colorScheme === "dark" && styles.containerDark]}
      >
        <Stack.Screen 
          options={{ 
            title: "Manage Stock"
          }} 
        />
        
        <FlatList
          data={selections}
          keyExtractor={(item, index) => `product-${index}`}
          renderItem={renderProductItem}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.flatListContent}
          initialNumToRender={5}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={true}
          updateCellsBatchingPeriod={50}
        />
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fa" },
  containerDark: { backgroundColor: "#121212" },
  flatListContent: { padding: 16, paddingBottom: 40 },
  title: { 
    fontSize: 22, 
    fontWeight: "bold", 
    marginBottom: 8, 
    textAlign: "center" 
  },
  titleLight: { color: "#1e3a8a" },
  titleDark: { color: "#f0f0f0" },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
    color: "#666",
  },
  subtitleDark: {
    color: "#ccc",
  },
  textDark: {
    color: "#f0f0f0",
  },

  // Action Buttons Row
  actionButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  refreshButton: {
    backgroundColor: "#3b82f6",
  },
  refreshButtonDark: {
    backgroundColor: "#1d4ed8",
  },
  addProductButton: {
    backgroundColor: "#10b981",
  },
  addProductButtonDark: {
    backgroundColor: "#047857",
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
    textAlign: "center",
  },

  // Sections
  productsSection: {
    marginBottom: 20,
  },
  actionSection: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  actionSectionDark: {
    backgroundColor: "#1e293b",
    borderColor: "#475569",
  },
  // Recipient Section
  recipientSection: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  recipientSectionDark: {
    backgroundColor: "#1e293b",
    borderColor: "#475569",
  },
  recipientDropdown: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    marginBottom: 12,
  },
  recipientDropdownDark: { 
    backgroundColor: "#1e293b", 
    borderColor: "#475569" 
  },
  customRecipientInput: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    fontSize: 14,
    color: "#1e293b",
    marginBottom: 8,
  },
  customRecipientInputDark: {
    backgroundColor: "#1e293b",
    borderColor: "#475569",
    color: "#f1f5f9",
  },
  recipientHelpText: {
    fontSize: 12,
    color: "#6b7280",
    fontStyle: "italic",
  },
  recipientHelpTextDark: {
    color: "#94a3b8",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#1e293b",
  },
  sectionTitleDark: {
    color: "#f1f5f9",
  },

  selectionContainer: {
    marginBottom: 12,
  },
  rowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  rowNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  removeButton: {
    backgroundColor: "#ef4444",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  removeButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    padding: 12,
    gap: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  rowDark: {
    backgroundColor: "#1e293b",
    borderColor: "#475569",
  },
  rowSelectedLight: { 
    backgroundColor: "#f8fafc",
    borderColor: "#cbd5e1",
  },
  rowSelectedDark: { 
    backgroundColor: "#334155",
    borderColor: "#64748b",
  },
  rowDuplicate: {
    borderColor: "#dc2626",
    backgroundColor: "#fef2f2",
  },
  rowInvalid: {
    borderColor: "#dc2626",
  },

  dropdown: {
    flex: 2,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  dropdownDark: { 
    backgroundColor: "#1e293b", 
    borderColor: "#475569" 
  },
  dropdownSelectedLight: { 
    borderColor: "#3b82f6", 
  },
  dropdownSelectedDark: { 
    borderColor: "#60a5fa", 
  },
  dropdownDuplicate: {
    borderColor: "#dc2626",
    backgroundColor: "#fef2f2",
  },

  placeholderStyle: { color: "#64748b", fontSize: 14 },
  placeholderStyleDark: { color: "#94a3b8" },
  selectedTextStyle: { color: "#1e293b", fontSize: 14 },
  selectedTextStyleDark: { color: "#f1f5f9" },

  quantityContainer: {
    flex: 1,
    alignItems: "center",
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    padding: 10,
    textAlign: "center",
    backgroundColor: "#fff",
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
  },
  inputDark: { 
    backgroundColor: "#1e293b", 
    borderColor: "#475569", 
    color: "#f1f5f9" 
  },
  inputSelectedLight: { 
    borderColor: "#3b82f6", 
  },
  inputSelectedDark: { 
    borderColor: "#60a5fa", 
  },
  inputInvalid: {
    borderColor: "#dc2626",
    backgroundColor: "#fef2f2",
  },
  inputAdd: {
    borderColor: "#10b981",
    backgroundColor: "#f0fdf4",
  },
  inputRemove: {
    borderColor: "#ef4444",
    backgroundColor: "#fef2f2",
  },
  stockInfo: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 4,
  },
  stockInfoDark: {
    color: "#94a3b8",
  },

  errorText: {
    fontSize: 12,
    color: "#dc2626",
    marginTop: 4,
    marginLeft: 4,
  },

  addAnother: {
    padding: 14,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderStyle: "dashed",
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  addAnotherDark: { 
    borderColor: "#475569", 
    backgroundColor: "#1e293b" 
  },
  addAnotherText: { 
    color: "#6b7280", 
    fontWeight: "600",
    fontSize: 14,
  },
  addAnotherTextDark: {
    color: "#94a3b8",
  },

  // Global Action Selector
  actionSelector: {
    flexDirection: "row",
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    marginBottom: 8,
  },
  actionSelectorDark: {
    backgroundColor: "#334155",
    borderColor: "#475569",
  },
  globalActionButton: {
    flex: 1,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  globalActionButtonAdd: {
    backgroundColor: "#f8fafc",
  },
  globalActionButtonAddDark: {
    backgroundColor: "#1e293b",
  },
  globalActionButtonRemove: {
    backgroundColor: "#f8fafc",
  },
  globalActionButtonRemoveDark: {
    backgroundColor: "#1e293b",
  },
  globalActionButtonAddActive: {
    backgroundColor: "#10b981",
  },
  globalActionButtonAddActiveDark: {
    backgroundColor: "#047857",
  },
  globalActionButtonRemoveActive: {
    backgroundColor: "#ef4444",
  },
  globalActionButtonRemoveActiveDark: {
    backgroundColor: "#b91c1c",
  },
  globalActionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
  globalActionButtonTextDark: {
    color: "#94a3b8",
  },
  globalActionButtonTextActive: {
    color: "#fff",
    fontWeight: "bold",
  },
  actionHelpText: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    fontStyle: "italic",
  },
  actionHelpTextDark: {
    color: "#94a3b8",
  },

  // Validation Summary
  validationSummary: {
    backgroundColor: "#fef2f2",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fecaca",
    marginBottom: 16,
  },
  validationSummaryDark: {
    backgroundColor: "#7f1d1d",
    borderColor: "#dc2626",
  },
  validationTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#dc2626",
    marginBottom: 6,
  },
  validationTitleDark: {
    color: "#fecaca",
  },
  validationItem: {
    fontSize: 12,
    color: "#b91c1c",
    marginLeft: 8,
    marginBottom: 2,
  },
  validationItemDark: {
    color: "#fca5a5",
  },

  // Summary Container
  summaryContainer: {
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#1e293b",
  },
  summaryTitleDark: {
    color: "#f1f5f9",
  },

  // Total Summary
  totalSummary: {
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 8,
  },
  totalSummaryAdd: {
    backgroundColor: "#d1fae5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  totalSummaryAddDark: {
    backgroundColor: "#064e3b",
    borderColor: "#047857",
  },
  totalSummaryRemove: {
    backgroundColor: "#fecaca",
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  totalSummaryRemoveDark: {
    backgroundColor: "#7f1d1d",
    borderColor: "#dc2626",
  },
  totalTextAdd: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#065f46",
    textAlign: "center",
  },
  totalTextAddDark: {
    color: "#a7f3d0",
  },
  totalTextRemove: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#991b1b",
    textAlign: "center",
  },
  totalTextRemoveDark: {
    color: "#fca5a5",
  },
  totalSubtextAdd: {
    fontSize: 12,
    color: "#047857",
    textAlign: "center",
    marginTop: 2,
  },
  totalSubtextAddDark: {
    color: "#86efac",
  },
  totalSubtextRemove: {
    fontSize: 12,
    color: "#dc2626",
    textAlign: "center",
    marginTop: 2,
  },
  totalSubtextRemoveDark: {
    color: "#f87171",
  },

  button: {
    backgroundColor: "#10b981",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 30,
  },
  buttonDisabled: {
    backgroundColor: "#9ca3af",
  },
  buttonDark: { backgroundColor: "#047857" },
  buttonText: { 
    color: "#fff", 
    fontWeight: "bold", 
    fontSize: 16,
    textAlign: "center",
  },
});