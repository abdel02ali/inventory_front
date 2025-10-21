import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    Alert,
    FlatList,
    Keyboard,
    Modal,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View,
} from "react-native";
import { useAppContext } from "../context/AppContext";
import { stockMovementService } from "../services/stockMovementService";

export default function StockMovementScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  const styles = getStyles(isDarkMode);

  const { products, refreshProducts } = useAppContext();

  const [type, setType] = useState<"stock_in" | "distribution">("stock_in");
  const [supplier, setSupplier] = useState("");
  const [department, setDepartment] = useState("");
  const [productsList, setProductsList] = useState([{ productId: "", name: "", quantity: 1, stock: 0 }]);
  const [note, setNote] = useState("");
  const [productDropdownVisible, setProductDropdownVisible] = useState(false);
  const [departmentDropdownVisible, setDepartmentDropdownVisible] = useState(false);
  const [selectedProductIndex, setSelectedProductIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const departments = ["Pâtisserie", "Vente", "Stock", "Comptabilité", "Nettoyage"];

  // 🧮 Total quantity calculation
  const totalQuantity = productsList.reduce((sum, p) => sum + Number(p.quantity || 0), 0);

  // 🔁 Only refresh when opening dropdown
  const openProductDropdown = async (index: number) => {
    setSelectedProductIndex(index);
    await refreshProducts();
    setProductDropdownVisible(true);
  };

  const handleAddProductField = () => {
    setProductsList([...productsList, { productId: "", name: "", quantity: 1, stock: 0 }]);
  };

  const handleProductSelect = (product: any) => {
    if (selectedProductIndex === null) return;
    const updated = [...productsList];
    updated[selectedProductIndex] = {
      ...updated[selectedProductIndex],
      productId: product.id,
      name: product.name,
      stock: product.stock || 0,
    };
    setProductsList(updated);
    setProductDropdownVisible(false);
  };

  const handleQuantityChange = (index: number, value: string) => {
    const qty = parseInt(value) || 0;
    const updated = [...productsList];
    updated[index].quantity = qty;
    setProductsList(updated);
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();

    if (type === "stock_in" && !supplier.trim()) {
      return Alert.alert("⚠️ Missing Supplier", "Please enter the supplier name.");
    }
    if (type === "distribution" && !department.trim()) {
      return Alert.alert("⚠️ Missing Department", "Please select a department.");
    }

    if (productsList.some((p) => !p.productId || p.quantity <= 0)) {
      return Alert.alert("⚠️ Invalid Products", "Please select valid products and quantities.");
    }

    try {
      const payload = {
        type,
        supplier: supplier.trim(),
        department: department.trim(),
        products: productsList.map((p) => ({
          productId: p.productId,
          quantity: p.quantity,
        })),
        note,
      };

      await stockMovementService.createMovement(payload);
      Alert.alert("✅ Success", "Stock movement recorded successfully!");
      setProductsList([{ productId: "", name: "", quantity: 1, stock: 0 }]);
      setSupplier("");
      setDepartment("");
      setNote("");
      await refreshProducts();
      router.back();
    } catch (err) {
      console.error("❌ Error creating movement:", err);
      Alert.alert("Error", "Could not create stock movement. Please try again.");
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        isDarkMode && styles.containerDark,
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Stock Movement</Text>

      {/* Type Selection */}
      <View style={styles.typeContainer}>
        {["stock_in", "distribution"].map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.typeButton, type === t && styles.typeButtonActive]}
            onPress={() => setType(t as any)}
          >
            <Text
              style={[
                styles.typeButtonText,
                type === t && styles.typeButtonTextActive,
              ]}
            >
              {t === "stock_in" ? "Stock In" : "Distribution"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Supplier / Department */}
      {type === "stock_in" ? (
        <TextInput
          placeholder="Supplier Name"
          value={supplier}
          onChangeText={setSupplier}
          style={[styles.input, isDarkMode && styles.inputDark]}
          placeholderTextColor={isDarkMode ? "#999" : "#666"}
        />
      ) : (
        <TouchableOpacity
          style={[styles.dropdownButton, isDarkMode && styles.inputDark]}
          onPress={() => setDepartmentDropdownVisible(true)}
        >
          <Text style={styles.dropdownButtonText}>
            {department || "Select Department"}
          </Text>
        </TouchableOpacity>
      )}

      {/* Product List */}
      {productsList.map((p, index) => (
        <View key={index} style={styles.productContainer}>
          <TouchableOpacity
            style={[styles.dropdownButton, { flex: 1 }]}
            onPress={() => openProductDropdown(index)}
          >
            <Text style={styles.dropdownButtonText}>
              {p.name || "Select Product"}
            </Text>
          </TouchableOpacity>
          <TextInput
            placeholder="Qty"
            keyboardType="numeric"
            value={String(p.quantity)}
            onChangeText={(v) => handleQuantityChange(index, v)}
            style={[styles.input, { flex: 0.4 }, isDarkMode && styles.inputDark]}
          />
        </View>
      ))}

      {/* Add Product */}
      <TouchableOpacity style={styles.addButton} onPress={handleAddProductField}>
        <Text style={styles.addButtonText}>+ Add Product</Text>
      </TouchableOpacity>

      {/* Total Summary */}
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryText}>🧮 Total Quantity: {totalQuantity}</Text>
      </View>

      {/* Note */}
      <TextInput
        placeholder="Add a note (optional)"
        value={note}
        onChangeText={setNote}
        style={[styles.input, isDarkMode && styles.inputDark]}
        placeholderTextColor={isDarkMode ? "#999" : "#666"}
      />

      {/* Submit */}
      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>Submit Movement</Text>
      </TouchableOpacity>

      {/* Product Dropdown Modal */}
      <Modal visible={productDropdownVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TextInput
              placeholder="Search product..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={[styles.input, isDarkMode && styles.inputDark]}
              placeholderTextColor={isDarkMode ? "#999" : "#666"}
            />
            <FlatList
              data={filteredProducts}
              keyExtractor={(item) => item.id}
              initialNumToRender={10}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => handleProductSelect(item)}
                >
                  <Text style={styles.modalItemText}>
                    {item.name} ({item.stock})
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              onPress={() => setProductDropdownVisible(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Department Dropdown Modal */}
      <Modal
        visible={departmentDropdownVisible}
        animationType="slide"
        transparent
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <FlatList
              data={departments}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setDepartment(item);
                    setDepartmentDropdownVisible(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              onPress={() => setDepartmentDropdownVisible(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// 💅 Styles
const getStyles = (isDarkMode: boolean) => ({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: "#f9f9f9",
  },
  containerDark: {
    backgroundColor: "#121212",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 20,
    color: isDarkMode ? "#fff" : "#000",
  },
  typeContainer: { flexDirection: "row", justifyContent: "center", marginBottom: 20 },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 6,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: "center",
  },
  typeButtonActive: { borderColor: "#63f17b", backgroundColor: "#e0ffe0" },
  typeButtonText: { fontSize: 16, color: "#555" },
  typeButtonTextActive: { color: "#000", fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  inputDark: { backgroundColor: "#1e1e1e", borderColor: "#444", color: "#fff" },
  dropdownButton: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  dropdownButtonText: { color: "#555", fontSize: 16 },
  productContainer: { flexDirection: "row", alignItems: "center", gap: 10 },
  addButton: {
    backgroundColor: "#63a3f1",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 10,
  },
  addButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  summaryContainer: {
    backgroundColor: "#e8f5e9",
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: "center",
  },
  summaryText: { fontSize: 16, fontWeight: "600", color: "#2e7d32" },
  submitButton: {
    backgroundColor: "#4caf50",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  submitButtonText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalContent: {
    margin: 20,
    padding: 20,
    borderRadius: 15,
    backgroundColor: "#fff",
    maxHeight: "80%",
  },
  modalItem: { paddingVertical: 10, borderBottomWidth: 1, borderColor: "#ddd" },
  modalItemText: { fontSize: 16, color: "#333" },
  closeButton: {
    marginTop: 15,
    backgroundColor: "#f16363",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  closeButtonText: { color: "#fff", fontWeight: "600" },
});
