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
import DropDownPicker from "react-native-dropdown-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { getInvoices } from "../api";
import { useAppContext } from "../context/appContext";
import { Invoice } from "../types/model";

export default function InvoicesScreen() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const router = useRouter();
  
  const [searchText, setSearchText] = useState("");
  const [searchType, setSearchType] = useState("id");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [openSearchType, setOpenSearchType] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  
  const { clients } = useAppContext();

  const searchTypeItems = [
    { label: "Invoice ID", value: "id" },
    { label: "Client", value: "client" },
    { label: "Date", value: "date" },
  ];

  // Boutons de filtre de statut
  const statusFilters = [
    { label: "All Invoices", value: "all" },
    { label: "Paid", value: "paid" },
    { label: "Not Paid", value: "not paid" },
  ];

  // Fetch invoices from database
  const fetchInvoices = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      console.log('🔄 Starting to fetch invoices...');
      
      const response = await getInvoices();
      
      console.log('🔍 API Response structure:', {
        success: response?.data?.success,
        dataExists: !!response?.data?.data,
        dataType: typeof response?.data?.data,
        isArray: Array.isArray(response?.data?.data),
        dataLength: Array.isArray(response?.data?.data) ? response.data.data.length : 'N/A'
      });

      let invoicesData: Invoice[] = [];
      
      if (response && response.data) {
        if (response.data.success && Array.isArray(response.data.data)) {
          invoicesData = response.data.data;
          console.log(`✅ Loaded ${invoicesData.length} invoices from success.data structure`);
        } 
        else if (Array.isArray(response.data)) {
          invoicesData = response.data;
          console.log(`✅ Loaded ${invoicesData.length} invoices from direct array`);
        }
        else if (typeof response.data === 'object') {
          invoicesData = [response.data];
          console.log('✅ Loaded single invoice object');
        } else {
          console.warn('❌ Unexpected data structure:', response.data);
        }
      } else {
        console.warn('❌ No valid response received');
      }
      
      console.log('📊 Final invoices data:', {
        count: invoicesData.length,
        firstInvoice: invoicesData[0]
      });
      
      setInvoices(invoicesData);
      setInitialLoad(false);
      
    } catch (error: any) {
      console.error("❌ Failed to fetch invoices:", error);
      
      if (error.response) {
        console.error('Error details:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      
      Alert.alert(
        "Error", 
        error.response?.data?.message || error.message || "Failed to load invoices."
      );
      setInvoices([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 🔄 AUTO-REFRESH: Fetch invoices when screen is focused, but only show loading in FlatList
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 InvoicesScreen focused - refreshing data...');
      if (!initialLoad) {
        // For subsequent focuses, refresh without showing full screen loader
        setRefreshing(true);
        fetchInvoices(true);
      }
    }, [initialLoad])
  );

  // Initial load on component mount
  useEffect(() => {
    console.log('🚀 InvoicesScreen mounted - initial load');
    fetchInvoices();
  }, []);

  const onRefresh = () => {
    console.log('🔄 Manual refresh triggered');
    setRefreshing(true);
    fetchInvoices(true);
  };

  const handleAddInvoice = () => {
    router.push("/details/add-invoice");
  };

  // Get client name by ID
  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : "Unknown Client";
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "No date";

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
      return dateString;
    }

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return "Invalid date";
    }
  };

  // Get status display text
  const getStatusDisplay = (invoice: Invoice) => {
    return invoice.status || "not paid";
  };

  // Get status style
  const getStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return isDarkMode ? styles.statusPaidDark : styles.statusPaid;
      case 'not paid':
      default:
        return isDarkMode ? styles.statusNotPaidDark : styles.statusNotPaid;
    }
  };

  // Safe filtered invoices with fallback
  const filteredInvoices = invoices.filter((inv) => {
    if (!inv) return false;
    
    const text = searchText.toLowerCase();
    const status = getStatusDisplay(inv).toLowerCase();
    
    // Apply status filter first
    if (statusFilter !== "all" && status !== statusFilter.toLowerCase()) {
      return false;
    }
    
    // Then apply search filter
    switch (searchType) {
      case "id":
        return inv.id?.toLowerCase().includes(text) || false;
      case "client":
        const clientName = (inv.clientName || getClientName(inv.clientId)).toLowerCase();
        return clientName.includes(text);
      case "date":
        return inv.date?.toLowerCase().includes(text) || false;
      default:
        return true;
    }
  });

  const styles = getStyles(isDarkMode);

  const renderItem: ListRenderItem<Invoice> = ({ item, index }) => {
    if (!item) {
      console.log('❌ Invalid invoice item at index:', index);
      return null;
    }
    
    const status = getStatusDisplay(item);
    const statusStyle = getStatusStyle(status);
    
    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() =>
          router.push({
            pathname: "/details/invoice",
            params: {
              id: item.id,
              clientId: item.clientId,
              clientName: item.clientName || getClientName(item.clientId),
              date: item.date,
              total: (item.total || 0).toString(),
              status: status,
              rest: (item.rest || 0).toString(),
              advance: (item.advance || 0).toString(),
              remise: (item.remise || 0).toString(),
              products: JSON.stringify((item.products || []).map(p => ({
                name: p.name,
                quantity: p.quantity,
                price: p.unitPrice || p.price || 0
              }))),
            },
          })
        }
        activeOpacity={0.7}
      >
        <Text style={[styles.cell, styles.idCell, styles.text]}>
          {item.id || "No ID"}
        </Text>
        <Text style={[styles.cell, styles.clientCell, styles.text]}>
          {item.clientName || getClientName(item.clientId) || "Unknown Client"}
        </Text>
        <Text style={[styles.cell, styles.dateCell, styles.text]}>
          {formatDate(item.date)}
        </Text>
        <Text style={[styles.cell, styles.totalCell, styles.text]}>
          {(item.total || 0).toFixed(2)} MAD
        </Text>
        <View style={styles.statusCell}>
          <Text style={[styles.statusText, statusStyle]}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Only show full screen loading on initial load
  if (loading && initialLoad) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>
            Loading invoices...
          </Text>
          <Text style={styles.loadingSubtext}>
            Please wait while we fetch your invoices
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
          Invoices: {invoices.length} | Filtered: {filteredInvoices.length} | Clients: {clients.length}
          {initialLoad ? " | ⏳ Initial Loading..." : " | ✅ Data Loaded"}
        </Text>
      </View>

      <View style={styles.titleBanner}>
        <Text style={styles.titleBannerText}>Invoices</Text>
        <Text style={styles.subtitleText}>
          {invoices.length} invoice{invoices.length !== 1 ? 's' : ''} total
        </Text>
      </View>

      {/* Search Row */}
      <View style={styles.searchRow}>
        <DropDownPicker
          open={openSearchType}
          value={searchType}
          items={searchTypeItems}
          setOpen={setOpenSearchType}
          setValue={setSearchType}
          setItems={() => {}}
          placeholder="Search by"
          containerStyle={styles.dropdownContainer}
          style={styles.dropdown}
          dropDownContainerStyle={styles.dropDownList}
          textStyle={styles.dropdownText}
          selectedItemContainerStyle={{ backgroundColor: isDarkMode ? "#334155" : "#e0f2fe" }}
          selectedItemLabelStyle={{ fontWeight: "bold" }}
          zIndex={2000}
        />

        <TextInput
          style={[styles.searchInputInline, { flex: 1 }]}
          placeholder="Search invoices..."
          placeholderTextColor={isDarkMode ? "#94a3b8" : "#64748b"}
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {/* Status Filter Buttons - HORIZONTAL */}
      <View style={styles.statusFilterContainer}>
        {statusFilters.map((filter) => (
          <TouchableOpacity
            key={filter.value}
            style={[
              styles.statusFilterButton,
              statusFilter === filter.value && styles.statusFilterButtonActive,
            ]}
            onPress={() => setStatusFilter(filter.value)}
          >
            <Text style={[
              styles.statusFilterButtonText,
              statusFilter === filter.value && styles.statusFilterButtonTextActive,
            ]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Active Filters Info */}
      {(searchText || statusFilter !== "all") && (
        <View style={styles.filterInfo}>
          <Text style={styles.filterInfoText}>
            {statusFilter !== "all" && `Status: ${statusFilter}`}
            {statusFilter !== "all" && searchText && " • "}
            {searchText && `Search: ${searchText}`}
          </Text>
          <TouchableOpacity 
            onPress={() => {
              setSearchText("");
              setStatusFilter("all");
            }}
          >
            <Text style={styles.clearFiltersText}>
              Clear
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Add Invoice Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={handleAddInvoice}
      >
        <Text style={styles.addButtonText}>+ Add Invoice</Text>
      </TouchableOpacity>

      {/* Table Header */}
      <View style={[styles.row, styles.headerRow]}>
        <Text style={[styles.cell, styles.idCell, styles.headerText]}>ID</Text>
        <Text style={[styles.cell, styles.clientCell, styles.headerText]}>Client</Text>
        <Text style={[styles.cell, styles.dateCell, styles.headerText]}>Date</Text>
        <Text style={[styles.cell, styles.totalCell, styles.headerText]}>Total</Text>
        <Text style={[styles.cell, styles.statusCell, styles.headerText]}>Status</Text>
      </View>

      {/* Invoices List with RefreshControl */}
      <FlatList
        data={filteredInvoices}
        keyExtractor={(item, index) => item?.id || `invoice-${index}`}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[isDarkMode ? "#fc7c05ff" : "#ea580c"]}
            tintColor={isDarkMode ? "#fc7c05ff" : "#ea580c"}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {searchText || statusFilter !== "all" ? "No invoices match your filters" : "No invoices found"}
            </Text>
            <Text style={styles.emptySubtext}>
              {!searchText && statusFilter === "all" && "Create your first invoice to get started"}
              {(searchText || statusFilter !== "all") && "Try adjusting your search or filters"}
            </Text>
            {(searchText || statusFilter !== "all") && (
              <TouchableOpacity 
                style={styles.clearFiltersButton}
                onPress={() => {
                  setSearchText("");
                  setStatusFilter("all");
                }}
              >
                <Text style={styles.clearFiltersButtonText}>Clear All Filters</Text>
              </TouchableOpacity>
            )}
            {!searchText && statusFilter === "all" && (
              <TouchableOpacity 
                style={[styles.addButton, styles.emptyButton]}
                onPress={handleAddInvoice}
              >
                <Text style={styles.addButtonText}>Create First Invoice</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        style={{ marginTop: 5, width: "100%" }}
      />
    </SafeAreaView>
  );
}

// ... keep your existing getStyles function unchanged ...
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
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  dropdownContainer: {
    width: 120,
    marginRight: 8,
  },
  dropdown: {
    backgroundColor: isDarkMode ? "#1e1e1e" : "#fff",
    borderRadius: 12,
    height: 40,
    borderColor: isDarkMode ? "#444" : "#cbd5e1",
    borderWidth: 1,
  },
  dropdownText: {
    color: isDarkMode ? "#fff" : "#000",
    fontSize: 14,
  },
  dropDownList: {
    backgroundColor: isDarkMode ? "#1e1e1e" : "#fff",
    borderColor: isDarkMode ? "#444" : "#cbd5e1",
    borderRadius: 12,
  },
  searchInputInline: {
    borderWidth: 1,
    borderColor: isDarkMode ? "#444" : "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 40,
    backgroundColor: isDarkMode ? "#1e1e1e" : "#fff",
    color: isDarkMode ? "#fff" : "#000",
  },
  // Status Filter Buttons Styles
  statusFilterContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 8,
  },
  statusFilterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: isDarkMode ? "#1e1e1e" : "#fff",
    borderWidth: 1,
    borderColor: isDarkMode ? "#444" : "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
  },
  statusFilterButtonActive: {
    backgroundColor: isDarkMode ? "#fc7c05ff" : "#fc7c05ff",
    borderColor: isDarkMode ? "#fc7c05ff" : "#fc7c05ff",
  },
  statusFilterButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: isDarkMode ? "#d1d5db" : "#666",
  },
  statusFilterButtonTextActive: {
    color: "#fff",
    fontWeight: "bold",
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
    color: isDarkMode ? '#fc7c05ff' : '#fc7c05ff',
    fontWeight: 'bold',
  },
  addButton: { 
    backgroundColor: isDarkMode ? "#fc7c05ff" : "#fc7c05ff", 
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
    borderBottomColor: isDarkMode ? "#fc7c05ff" : "#fc7c05ff", 
    marginBottom: 6 
  },
  cell: { 
    paddingHorizontal: 8, 
    fontSize: 14,
    textAlign: 'center',
  },
  idCell: { flex: 1 },
  clientCell: { flex: 2 },
  dateCell: { flex: 1.5 },
  totalCell: { flex: 1 },
  statusCell: { 
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { 
    fontWeight: "bold", 
    color: isDarkMode ? "#f0f0f0" : "#1e293b",
    textAlign: 'center',
  },
  text: { 
    color: isDarkMode ? "#f0f0f0" : "#1e293b" 
  },
  productCard: { 
    flexDirection: "row", 
    paddingVertical: 14, 
    paddingHorizontal: 8, 
    backgroundColor: isDarkMode ? "#1e1e1e" : "#fff", 
    borderRadius: 10, 
    marginBottom: 8,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  statusPaid: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  statusPaidDark: {
    backgroundColor: '#14532d',
    color: '#bbf7d0',
  },
  statusNotPaid: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  statusNotPaidDark: {
    backgroundColor: '#78350f',
    color: '#fde68a',
  },
  titleBanner: {
    backgroundColor: isDarkMode ? "#1e293b" : "#1e293b",
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 20,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: isDarkMode ? "#fc7c05ff" : "#fc7c05ff",
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