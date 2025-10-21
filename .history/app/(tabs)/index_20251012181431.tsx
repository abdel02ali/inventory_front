import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme
} from "react-native";
import { getDashboardStats, getOutOfStockProducts, getRecentInvoices } from "../api";
import "../config/firebase"; // Ensure Firebase is initialized

interface StatItem {
  label: string;
  value: number | string;
  color: string;
  icon: string;
}

interface DashboardInvoice {
  id: string;
  clientName: string;
  total: number;
  date: string;
  status: string;
  paid: boolean;
  products: any[];
}

interface DashboardProduct {
  id: string;
  name: string;
  currentStock: number;
  alertLevel: string;
}

export default function Dashboard() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalProducts: 0,
    outOfStock: 0
  });
  const [recentInvoices, setRecentInvoices] = useState<DashboardInvoice[]>([]);
  const [outOfStockProducts, setOutOfStockProducts] = useState<DashboardProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayDate, setTodayDate] = useState('');

  // Get today's date in dd/mm/yyyy format
  const getTodayDate = () => {
    const today = new Date();
    const day = today.getDate().toString().padStart(2, '0');
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const year = today.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Load all dashboard data
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading dashboard data...');
      
      // Set today's date
      setTodayDate(getTodayDate());
      
      // Load all data in parallel
      const [statsResponse, invoicesResponse, productsResponse] = await Promise.all([
        getDashboardStats('daily'),
        getRecentInvoices(5),
        getOutOfStockProducts()
      ]);
      
      setStats(statsResponse.data);
      setRecentInvoices(invoicesResponse.data);
      setOutOfStockProducts(productsResponse.data);
      
      console.log('✅ Dashboard data loaded successfully');
      
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  // Load data when component mounts
  useEffect(() => {
    loadDashboardData();
  }, []);

  const statItems: StatItem[] = [
    { 
      label: "Total Products", 
      value: stats.totalProducts, 
      color: isDarkMode ? "#4ade80" : "#16a34a", 
      icon: "📦" 
    },
    { 
      label: "Out of Stock", 
      value: stats.outOfStock, 
      color: isDarkMode ? "#f87171" : "#dc2626", 
      icon: "⚠️" 
    }
  ];

  // Get correct status display - use paid field to determine status
  const getStatusDisplay = (invoice: DashboardInvoice) => {
    return invoice.paid ? "Paid" : "Not Paid";
  };

  const renderInvoiceItem = ({ item }: { item: DashboardInvoice }) => {
    const status = getStatusDisplay(item);
    
    // Format date as dd/mm/yyyy
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };

    return (
      <TouchableOpacity 
        style={[styles.tableRow, isDarkMode ? styles.tableRowDark : styles.tableRowLight]}
        onPress={() => router.push({
          pathname: "/details/invoice" as any,
          params: { 
            id: item.id,
            clientName: item.clientName,
            total: item.total.toString(),
            date: item.date,
            status: status,
            products: JSON.stringify(item.products)
          }
        })}
      >
        <Text style={[styles.tableCell, styles.idCell, isDarkMode ? styles.textDark : styles.textLight]}>
          {item.id}
        </Text>
        <Text style={[styles.tableCell, styles.clientCell, isDarkMode ? styles.textDark : styles.textLight]} numberOfLines={1}>
          {item.clientName}
        </Text>
        <Text style={[styles.tableCell, styles.amountCell, isDarkMode ? styles.textDark : styles.textLight]}>
          {item.total.toFixed(2)} MAD
        </Text>
        <Text style={[styles.tableCell, styles.dateCell, isDarkMode ? styles.textDark : styles.textLight]}>
          {formatDate(item.date)}
        </Text>
        <Text style={[
          styles.tableCell, 
          styles.statusCell, 
          { 
            color: status === 'Paid' ? 
              (isDarkMode ? '#4ade80' : '#16a34a') : 
              (isDarkMode ? '#f87171' : '#dc2626'),
            fontWeight: '600'
          }
        ]}>
          {status}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderOutOfStockItem = ({ item }: { item: DashboardProduct }) => (
    <TouchableOpacity 
      style={[styles.tableRow, isDarkMode ? styles.tableRowDark : styles.tableRowLight]}
      onPress={() => router.push({
        pathname: "/details/product" as any,
        params: { id: item.id }
      })}
    >
      <Text style={[styles.tableCell, styles.idCell, isDarkMode ? styles.textDark : styles.textLight]}>{item.id}</Text>
      <Text style={[styles.tableCell, styles.nameCell, isDarkMode ? styles.textDark : styles.textLight]} numberOfLines={1}>
        {item.name}
      </Text>
      <Text style={[styles.tableCell, styles.dashCell, isDarkMode ? styles.textDark : styles.textLight]}>-</Text>
      <Text style={[styles.tableCell, styles.stockCell, isDarkMode ? styles.textDark : styles.textLight]}>{item.currentStock}</Text>
      <Text style={[
        styles.tableCell, 
        styles.statusCell,
        { 
          color: isDarkMode ? '#f87171' : '#dc2626',
          fontWeight: '600'
        }
      ]}>
        Out of Stock
      </Text>
    </TouchableOpacity>
  );

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'addProduct':
        router.push('/details/add-product' as any);
        break;
      case 'createInvoice':
        router.push('/details/add-invoice' as any);
        break;
      case 'viewReport':
       router.push('/details/add-client' as any);
        break;
      case 'manageStock':
        router.push('/details/add-quantity' as any);
        break;
    }
  };

  const styles = getStyles(isDarkMode);

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[isDarkMode ? "#fc7c05ff" : "#ea580c"]}
          tintColor={isDarkMode ? "#fc7c05ff" : "#ea580c"}
        />
      }
    >
      <View style={styles.titleMinimal}>
        <Text style={styles.titleMinimalText}>Dashboard Overview</Text>
        <View style={styles.titleLine} />
      </View>

      {/* Today's Date Label */}
      <View style={styles.dateContainer}>
        <Text style={styles.dateLabel}>Today's Date:</Text>
        <Text style={styles.dateValue}>{todayDate}</Text>
      </View>

      {/* Loading State */}
      {loading && !refreshing && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading dashboard data...</Text>
        </View>
      )}

      {/* Statistic Cards */}
      <View style={styles.horizontalCardsContainer}>
        {statItems.map((item) => (
          <View key={item.label} style={styles.horizontalCard}>
            <Text style={styles.cardIcon}>{item.icon}</Text>
            <Text style={[styles.cardValue, { color: item.color }]}>
              {item.value}
            </Text>
            <Text style={styles.cardTitle}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Recent Invoices Table */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Invoices</Text>
          <TouchableOpacity onPress={() => router.push('/InvoicesScreen' as any)}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.idCell]}>ID</Text>
            <Text style={[styles.tableHeaderCell, styles.clientCell]}>Customer</Text>
            <Text style={[styles.tableHeaderCell, styles.amountCell]}>Amount</Text>
            <Text style={[styles.tableHeaderCell, styles.dateCell]}>Date</Text>
            <Text style={[styles.tableHeaderCell, styles.statusCell]}>Status</Text>
          </View>
          {recentInvoices.length > 0 ? (
            <FlatList
              data={recentInvoices}
              renderItem={renderInvoiceItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No invoices found for today</Text>
              <TouchableOpacity 
                style={styles.createInvoiceButton}
                onPress={() => router.push('/details/add-invoice' as any)}
              >
                <Text style={styles.createInvoiceButtonText}>Create First Invoice</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Out of Stock Products Table */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Out of Stock Products</Text>
          <TouchableOpacity onPress={() => router.push('/ProductsScreen' as any)}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.idCell]}>ID</Text>
            <Text style={[styles.tableHeaderCell, styles.nameCell]}>Product Name</Text>
            <Text style={[styles.tableHeaderCell, styles.dashCell]}>-</Text>
            <Text style={[styles.tableHeaderCell, styles.stockCell]}>Stock</Text>
            <Text style={[styles.tableHeaderCell, styles.statusCell]}>Status</Text>
          </View>
          {outOfStockProducts.length > 0 ? (
            <FlatList
              data={outOfStockProducts}
              renderItem={renderOutOfStockItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>All products in stock</Text>
            </View>
          )}
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleQuickAction('addProduct')}
          >
            <Text style={styles.actionIcon}>➕</Text>
            <Text style={styles.actionText}>Add Product</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleQuickAction('createInvoice')}
          >
            <Text style={styles.actionIcon}>🧾</Text>
            <Text style={styles.actionText}>Create Invoice</Text>
          </TouchableOpacity>
         
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleQuickAction('manageStock')}
          >
            <Text style={styles.actionIcon}>📦</Text>
            <Text style={styles.actionText}>Manage Stock</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const getStyles = (isDarkMode: boolean) => StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 16, 
    backgroundColor: isDarkMode ? "#121212" : "#f8fafc" 
  },
  titleMinimal: {
    alignItems: "center",
    marginBottom: 16,
    marginTop: 30,
  },
  titleMinimalText: {
    fontSize: 26,
    fontWeight: "600",
    textAlign: "center",
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  titleLine: {
    width: 60,
    height: 3,
    backgroundColor: isDarkMode ? "#60a5fa" : "#3b82f6",
    borderRadius: 2,
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkMode ? 0.3 : 0.1,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: isDarkMode ? "#334155" : "#e2e8f0",
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: isDarkMode ? "#94a3b8" : "#64748b",
    marginRight: 8,
  },
  dateValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: isDarkMode ? "#60a5fa" : "#3b82f6",
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: isDarkMode ? '#94a3b8' : '#64748b',
    fontSize: 14,
  },
  horizontalCardsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    flexWrap: "wrap",
  },
  horizontalCard: {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDarkMode ? 0.3 : 0.1,
    shadowRadius: 8,
    elevation: 6,
    alignItems: "center",
    flex: 1,
    minWidth: 160,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: isDarkMode ? "#334155" : "#e2e8f0",
  },
  cardIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
    textAlign: "center",
  },
  cardTitle: {
    fontSize: 12,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontWeight: "600",
    textAlign: "center",
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom:10,
  },
  viewAllText: {
    color: isDarkMode ? '#60a5fa' : '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
  tableContainer: {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkMode ? 0.3 : 0.1,
    shadowRadius: 6,
    elevation: 4,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: isDarkMode ? "#334155" : "#e2e8f0",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: isDarkMode ? "#334155" : "#f1f5f9",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "#475569" : "#e2e8f0",
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: "bold",
    color: isDarkMode ? "#e2e8f0" : "#475569",
    textAlign: "center",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  tableRowDark: {
    borderBottomColor: "#334155",
    backgroundColor: "#1e293b",
  },
  tableRowLight: {
    borderBottomColor: "#f1f5f9",
    backgroundColor: "#ffffff",
  },
  tableCell: {
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 4,
  },
  // Column width styles for better spacing
  idCell: { 
    flex: 1.2,
    textAlign: 'left',
  },
  clientCell: { 
    flex: 1.8,
    textAlign: 'left',
  },
  amountCell: { 
    flex: 1.2,
    fontWeight: '600',
  },
  dateCell: { 
    flex: 1.2,
  },
  statusCell: { 
    flex: 1.1,
  },
  nameCell: { 
    flex: 1.8,
    textAlign: 'left',
  },
  dashCell: { 
    flex: 0.6,
  },
  stockCell: { 
    flex: 0.8,
  },
  textDark: {
    color: "#cbd5e1",
  },
  textLight: {
    color: "#475569",
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: isDarkMode ? '#64748b' : '#94a3b8',
    fontSize: 14,
    marginBottom: 12,
  },
  createInvoiceButton: {
    backgroundColor: isDarkMode ? '#60a5fa' : '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  createInvoiceButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  actionButton: {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    flex: 1,
    minWidth: 80,
    marginHorizontal: 4,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkMode ? 0.3 : 0.1,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: isDarkMode ? "#334155" : "#e2e8f0",
  },
  actionIcon: {
    fontSize: 20,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    color: isDarkMode ? "#e2e8f0" : "#475569",
    fontWeight: "600",
    textAlign: "center",
  },
});