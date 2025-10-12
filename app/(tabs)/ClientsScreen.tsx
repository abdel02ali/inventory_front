import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  ListRenderItem,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getClients } from "../api";
import { Client } from "../types/model";

export default function ClientsScreen() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const router = useRouter();

  const [searchText, setSearchText] = useState("");
  const [searchType, setSearchType] = useState<"name" | "phone">("name");
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  const fetchClients = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const res = await getClients();
      console.log("📞 Clients loaded:", res.data?.length || 0);
      setClients(res.data || []);    
      setInitialLoad(false);
    } catch (err: any) {
      console.error("❌ Failed to fetch clients:", err);
      Alert.alert(
        "Error", 
        "Failed to load clients. Please check your server connection."
      );
      setClients([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 🔄 AUTO-REFRESH: Fetch clients when screen is focused, but only show loading in FlatList
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 ClientsScreen focused - refreshing data...');
      if (!initialLoad) {
        // For subsequent focuses, refresh without showing full screen loader
        setRefreshing(true);
        fetchClients(true);
      }
    }, [initialLoad])
  );

  // Initial load on component mount
  useEffect(() => {
    console.log('🚀 ClientsScreen mounted - initial load');
    fetchClients();
  }, []);

  const onRefresh = () => {
    console.log('🔄 Manual refresh triggered');
    setRefreshing(true);
    fetchClients(true);
  };

  const handleAddClient = () => {
    router.push("/details/add-client");
  };

  // Filter clients based on search
  const filteredClients = clients.filter((client) => {
    const text = searchText.toLowerCase();
    if (searchType === "name") {
      return client.name.toLowerCase().includes(text);
    } else {
      return client.phone?.toLowerCase().includes(text) || false;
    }
  });

  const renderItem: ListRenderItem<Client> = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.productCard,
        isDarkMode && styles.productCardDark,
      ]}
      onPress={() =>
        router.push({
          pathname: "/details/client",
          params: { 
            id: item.id, 
            name: item.name, 
            phone: item.phone || "-",
            location: item.location || "" 
          },
        })
      }
      activeOpacity={0.7}
    >
      <Text
        style={[styles.cell, styles.idCell, isDarkMode ? styles.textDark : styles.textLight]}
      >
        {item.id.substring(0, 8)}...
      </Text>
      <Text
        style={[styles.cell, styles.nameCell, isDarkMode ? styles.textDark : styles.textLight]}
      >
        {item.name}
      </Text>
      <Text
        style={[styles.cell, styles.phoneCell, isDarkMode ? styles.textDark : styles.textLight]}
      >
        {item.phone || "-"}
      </Text>
      <View style={styles.invoiceCell}>
        <Text style={[
          styles.invoiceCount,
          isDarkMode ? styles.textDark : styles.textLight,
          (item.invoices?.length || 0) > 0 && styles.hasInvoices
        ]}>
          {item.invoices?.length || 0}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const styles = getStyles(isDarkMode);

  // Only show full screen loading on initial load
  if (loading && initialLoad) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>
            Loading clients...
          </Text>
          <Text style={styles.loadingSubtext}>
            Please wait while we fetch your clients
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "left", "right"]}
    >
      {/* Debug Header */}
      <View style={styles.debugHeader}>
        <Text style={styles.debugText}>
          Clients: {clients.length} | Filtered: {filteredClients.length} | Search: {searchType}
          {initialLoad ? " | ⏳ Initial Loading..." : " | ✅ Data Loaded"}
        </Text>
      </View>

      <View style={styles.titleBanner}>
        <Text style={styles.titleBannerText}>Customers</Text>
        <Text style={styles.subtitleText}>
          {clients.length} client{clients.length !== 1 ? 's' : ''} total
        </Text>
      </View>

      {/* Search Row */}
      <View style={styles.searchRow}>
        {/* Search Type Buttons */}
        <View style={{ flexDirection: "row", marginRight: 8 }}>
          <TouchableOpacity
            style={[
              styles.searchTypeButton,
              searchType === "name" && styles.searchTypeButtonActive,
            ]}
            onPress={() => setSearchType("name")}
          >
            <Text style={[
              styles.searchTypeText,
              searchType === "name" && styles.searchTypeTextActive,
            ]}>
              Name
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.searchTypeButton,
              searchType === "phone" && styles.searchTypeButtonActive,
            ]}
            onPress={() => setSearchType("phone")}
          >
            <Text style={[
              styles.searchTypeText,
              searchType === "phone" && styles.searchTypeTextActive,
            ]}>
              Phone
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <TextInput
          style={[
            styles.searchInput,
            { flex: 1 },
          ]}
          placeholder={`Search by ${searchType}`}
          placeholderTextColor={isDarkMode ? "#94a3b8" : "#64748b"}
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {/* Active Filters Info */}
      {searchText && (
        <View style={styles.filterInfo}>
          <Text style={styles.filterInfoText}>
            Search: {searchText} ({searchType})
          </Text>
          <TouchableOpacity 
            onPress={() => setSearchText("")}
          >
            <Text style={styles.clearFiltersText}>
              Clear
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Add Client Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={handleAddClient}
      >
        <Text style={styles.addButtonText}>+ Add Client</Text>
      </TouchableOpacity>

      {/* Table Header */}
      <View
        style={[styles.row, styles.headerRow]}
      >
        <Text style={[styles.cell, styles.idCell, styles.headerText]}>ID</Text>
        <Text style={[styles.cell, styles.nameCell, styles.headerText]}>Name</Text>
        <Text style={[styles.cell, styles.phoneCell, styles.headerText]}>Phone</Text>
        <Text style={[styles.cell, styles.invoiceCell, styles.headerText]}>Invoices</Text>
      </View>

      {/* Clients List with RefreshControl */}
      <FlatList
        data={filteredClients}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[isDarkMode ? "#3b82f6" : "#2563eb"]}
            tintColor={isDarkMode ? "#3b82f6" : "#2563eb"}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {searchText ? "No clients match your search" : "No clients found"}
            </Text>
            <Text style={styles.emptySubtext}>
              {!searchText && "Create your first client to get started"}
              {searchText && "Try adjusting your search"}
            </Text>
            {searchText && (
              <TouchableOpacity 
                style={styles.clearFiltersButton}
                onPress={() => setSearchText("")}
              >
                <Text style={styles.clearFiltersButtonText}>Clear Search</Text>
              </TouchableOpacity>
            )}
            {!searchText && (
              <TouchableOpacity 
                style={[styles.addButton, styles.emptyButton]}
                onPress={handleAddClient}
              >
                <Text style={styles.addButtonText}>Create First Client</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        style={{ marginTop: 5, width: "100%" }}
      />
    </SafeAreaView>
  );
}

const getStyles = (isDarkMode: boolean) => StyleSheet.create({
  container: { 
    flex: 1, 
    paddingHorizontal: 16, 
    backgroundColor: isDarkMode ? "#121212" : "#f5f7fa" 
  },
  debugHeader: {
    backgroundColor: isDarkMode ? "#334155" : "#e2e8f0",
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  debugText: {
    color: isDarkMode ? "#60a5fa" : "#2563eb",
    fontSize: 12,
    textAlign: "center",
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDarkMode ? "#cbd5e1" : "#666",
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#888",
    textAlign: 'center',
  },
  titleBanner: {
    backgroundColor: isDarkMode ? "#1e293b" : "#1e293b",
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 20,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: isDarkMode ? "#60a5fa" : "#3b82f6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDarkMode ? 0.3 : 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  titleBannerText: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    color: "#f1f5f9",
    letterSpacing: 0.3,
  },
  subtitleText: {
    fontSize: 14,
    textAlign: "center",
    color: "#cbd5e1",
    marginTop: 4,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  searchTypeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: isDarkMode ? "#374151" : "#cbd5e1",
    marginRight: 8,
    borderWidth: 1,
    borderColor: isDarkMode ? "#4b5563" : "#cbd5e1",
  },
  searchTypeButtonActive: {
    backgroundColor: isDarkMode ? "#2563eb" : "#2563eb",
    borderColor: isDarkMode ? "#2563eb" : "#2563eb",
  },
  searchTypeText: {
    color: isDarkMode ? "#d1d5db" : "#4b5563",
    fontWeight: "600",
    fontSize: 14,
  },
  searchTypeTextActive: {
    color: "#fff",
    fontWeight: "bold",
  },
  searchInput: {
    borderWidth: 1,
    borderColor: isDarkMode ? "#444" : "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: isDarkMode ? "#1e1e1e" : "#fff",
    color: isDarkMode ? "#fff" : "#000",
    fontSize: 14,
  },
  filterInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  filterInfoText: {
    fontSize: 12,
    color: isDarkMode ? '#94a3b8' : '#666',
    fontStyle: 'italic',
  },
  clearFiltersText: {
    fontSize: 12,
    color: isDarkMode ? '#3b82f6' : '#2563eb',
    fontWeight: 'bold',
  },
  addButton: { 
    backgroundColor: isDarkMode ? "#3b82f6" : "#2563eb", 
    padding: 14, 
    borderRadius: 12, 
    alignItems: "center", 
    marginBottom: 16 
  },
  addButtonText: { 
    color: "#fff", 
    fontWeight: "bold", 
    fontSize: 16 
  },
  emptyButton: {
    marginTop: 16,
  },
  clearFiltersButton: {
    backgroundColor: isDarkMode ? "#4b5563" : "#6b7280",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  clearFiltersButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  row: { 
    flexDirection: "row", 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: isDarkMode ? "#334155" : "#e2e8f0" 
  },
  headerRow: { 
    backgroundColor: isDarkMode ? "#1f2937" : "#e0f2fe", 
    borderBottomWidth: 2, 
    borderBottomColor: isDarkMode ? "#3b82f6" : "#38bdf8", 
    marginBottom: 6 
  },
  cell: { 
    paddingHorizontal: 8, 
    fontSize: 14,
    textAlign: 'center',
    justifyContent: 'center',
  },
  idCell: { flex: 1 },
  nameCell: { flex: 2 },
  phoneCell: { flex: 2 },
  invoiceCell: { 
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invoiceCount: {
    fontSize: 14,
    textAlign: 'center',
  },
  hasInvoices: {
    fontWeight: 'bold',
    color: isDarkMode ? "#3b82f6" : "#2563eb",
  },
  headerText: { 
    fontWeight: "bold", 
    color: isDarkMode ? "#f0f0f0" : "#1e40af",
    textAlign: 'center',
  },
  textDark: { 
    color: "#f0f0f0" 
  },
  textLight: { 
    color: "#1e293b" 
  },
  productCard: { 
    flexDirection: "row", 
    paddingVertical: 14, 
    paddingHorizontal: 8, 
    backgroundColor: isDarkMode ? "#1e1e1e" : "#fff", 
    borderRadius: 10, 
    marginBottom: 8, 
    shadowColor: "#000", 
    shadowOpacity: isDarkMode ? 0.1 : 0.05, 
    shadowRadius: 5, 
    shadowOffset: { width: 0, height: 2 },
    alignItems: 'center',
  },
  productCardDark: { 
    backgroundColor: "#1e1e1e", 
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    color: isDarkMode ? "#cbd5e1" : "#666",
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#888",
    textAlign: "center",
  },
});