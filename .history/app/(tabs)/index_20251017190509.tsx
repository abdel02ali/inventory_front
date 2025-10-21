import { Ionicons } from '@expo/vector-icons';
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme
} from "react-native";
import { departmentService } from '../../services/departmentService';
import { getDashboardStats, getOutOfStockProducts } from "../api";
import "../config/firebase";
import { Department } from "../types/department";

interface StatItem {
  label: string;
  value: number | string;
  color: string;
  icon: string;
  trend?: string;
}

interface DashboardProduct {
  id: string;
  name: string;
  currentStock: number;
  alertLevel: string;
  unit?: string;
}

const { width: screenWidth } = Dimensions.get('window');

export default function Dashboard() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalProducts: 0,
    outOfStock: 0,
    totalDepartments: 0
  });
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allDepartments, setAllDepartments] = useState<Department[]>([]);
  const [outOfStockProducts, setOutOfStockProducts] = useState<DashboardProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayDate, setTodayDate] = useState('');
  const [showDepartmentsModal, setShowDepartmentsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const getTodayDate = () => {
    const today = new Date();
    const day = today.getDate().toString().padStart(2, '0');
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const year = today.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading dashboard data...');
      
      setTodayDate(getTodayDate());
      
      const [statsResponse, productsResponse] = await Promise.all([
        getDashboardStats('daily'),
        getOutOfStockProducts()
      ]);
      
      setStats(statsResponse.data);
      setOutOfStockProducts(productsResponse.data);
      
      try {
        const departmentsResponse = await departmentService.getDepartments();
        setDepartments(departmentsResponse.slice(0, 3));
        setAllDepartments(departmentsResponse);
        setStats(prev => ({
          ...prev,
          totalDepartments: departmentsResponse.length
        }));
      } catch (deptError) {
        console.error('❌ Error loading departments:', deptError);
      }
      
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const filteredDepartments = allDepartments.filter(dept =>
    dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dept.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statItems: StatItem[] = [
    { 
      label: "Total Products", 
      value: stats.totalProducts, 
      color: "#10b981", 
      icon: "📦",
      trend: "↑"
    },
    { 
      label: "Out of Stock", 
      value: stats.outOfStock, 
      color: "#ef4444", 
      icon: "⚠️",
      trend: stats.outOfStock > 0 ? "↑" : "↓"
    },
    { 
      label: "Departments", 
      value: stats.totalDepartments, 
      color: "#3b82f6", 
      icon: "🏢",
      trend: "→"
    }
  ];

  const StatCard = ({ item }: { item: StatItem }) => (
    <View style={[styles.statCard, { backgroundColor: isDarkMode ? "#1f2937" : "#ffffff" }]}>
      <View style={styles.statIconContainer}>
        <Text style={styles.statIcon}>{item.icon}</Text>
      </View>
      <View style={styles.statContent}>
        <Text style={[styles.statValue, { color: item.color }]}>{item.value}</Text>
        <Text style={styles.statLabel}>{item.label}</Text>
      </View>
      <View style={[styles.trendBadge, { backgroundColor: item.color + '20' }]}>
        <Text style={[styles.trendText, { color: item.color }]}>{item.trend}</Text>
      </View>
    </View>
  );

  const DepartmentPill = ({ department }: { department: Department }) => (
    <TouchableOpacity 
      style={[styles.departmentPill, { backgroundColor: department.color + '20' }]}
      onPress={() => router.push({
        pathname: "/departments/department-details" as any,
        params: { 
          id: department.id,
          name: department.name,
          description: department.description,
          icon: department.icon,
          color: department.color
        }
      })}
    >
      <Text style={styles.departmentPillIcon}>{department.icon}</Text>
      <Text style={styles.departmentPillName}>{department.name}</Text>
    </TouchableOpacity>
  );

  const QuickActionCard = ({ icon, label, description, onPress, color }: { 
    icon: string; 
    label: string; 
    description: string;
    onPress: () => void;
    color: string;
  }) => (
    <TouchableOpacity 
      style={[styles.quickActionCard, { backgroundColor: isDarkMode ? "#1f2937" : "#ffffff" }]}
      onPress={onPress}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: color + '20' }]}>
        <Text style={[styles.quickActionIconText, { color }]}>{icon}</Text>
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
      <Text style={styles.quickActionDescription}>{description}</Text>
    </TouchableOpacity>
  );

  const ProductRow = ({ product }: { product: DashboardProduct }) => (
    <TouchableOpacity 
      style={[styles.productRow, { backgroundColor: isDarkMode ? "#1f2937" : "#ffffff" }]}
      onPress={() => router.push({
        pathname: "/details/product" as any,
        params: { id: product.id }
      })}
    >
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
        <Text style={styles.productId}>ID: {product.id}</Text>
      </View>
      <View style={styles.productStock}>
        <View style={[styles.stockBadge, { backgroundColor: "#ef4444" }]}>
          <Text style={styles.stockText}>{product.currentStock}</Text>
        </View>
        <Text style={styles.stockLabel}>In Stock</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={isDarkMode ? "#6b7280" : "#9ca3af"} />
    </TouchableOpacity>
  );

  const DepartmentsModal = () => (
    <Modal
      visible={showDepartmentsModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowDepartmentsModal(false)}
    >
      <View style={[styles.modalContainer, { backgroundColor: isDarkMode ? "#111827" : "#f9fafb" }]}>
        <View style={styles.modalHeader}>
          <View>
            <Text style={styles.modalTitle}>All Departments</Text>
            <Text style={styles.modalSubtitle}>{allDepartments.length} departments</Text>
          </View>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setShowDepartmentsModal(false)}
          >
            <Ionicons name="close" size={24} color={isDarkMode ? "#9ca3af" : "#6b7280"} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={isDarkMode ? "#6b7280" : "#9ca3af"} />
          <TextInput
            style={[styles.searchInput, { color: isDarkMode ? "#f9fafb" : "#111827" }]}
            placeholder="Search departments..."
            placeholderTextColor={isDarkMode ? "#6b7280" : "#9ca3af"}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <FlatList
          data={filteredDepartments}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.modalDepartmentCard, { backgroundColor: isDarkMode ? "#1f2937" : "#ffffff" }]}
              onPress={() => {
                setShowDepartmentsModal(false);
                router.push({
                  pathname: "/departments/department-details" as any,
                  params: { 
                    id: item.id,
                    name: item.name,
                    description: item.description,
                    icon: item.icon,
                    color: item.color
                  }
                });
              }}
            >
              <View style={[styles.modalDepartmentIcon, { backgroundColor: item.color }]}>
                <Text style={styles.modalIconText}>{item.icon}</Text>
              </View>
              <View style={styles.modalDepartmentContent}>
                <Text style={[styles.modalDepartmentName, { color: isDarkMode ? "#f9fafb" : "#111827" }]}>
                  {item.name}
                </Text>
                <Text style={[styles.modalDepartmentDescription, { color: isDarkMode ? "#9ca3af" : "#6b7280" }]}>
                  {item.description || 'No description available'}
                </Text>
              </View>
              <View style={styles.modalDepartmentArrow}>
                <Ionicons name="chevron-forward" size={20} color={isDarkMode ? "#4b5563" : "#d1d5db"} />
              </View>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.modalListContent}
        />
      </View>
    </Modal>
  );

  const styles = getStyles(isDarkMode);

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[isDarkMode ? "#3b82f6" : "#2563eb"]}
            tintColor={isDarkMode ? "#3b82f6" : "#2563eb"}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Dashboard</Text>
            <Text style={styles.headerDate}>{todayDate}</Text>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={24} color={isDarkMode ? "#d1d5db" : "#4b5563"} />
          </TouchableOpacity>
        </View>

        {/* Stats Overview */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
            <View style={styles.statsContainer}>
              {statItems.map((item, index) => (
                <StatCard key={item.label} item={item} />
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <QuickActionCard 
              icon="📦"
              label="Add Product"
              description="Add new product to inventory"
              onPress={() => router.push('/details/add-product' as any)}
              color="#10b981"
            />
            <QuickActionCard 
              icon="🧾"
              label="Create Invoice"
              description="Generate new invoice"
              onPress={() => router.push('/details/add-invoice' as any)}
              color="#3b82f6"
            />
            <QuickActionCard 
              icon="🏢"
              label="Add Department"
              description="Create new department"
              onPress={() => router.push('/departments/create-department' as any)}
              color="#8b5cf6"
            />
            <QuickActionCard 
              icon="📊"
              label="Stock Movement"
              description="Manage stock levels"
              onPress={() => router.push('/details/add-quantity' as any)}
              color="#f59e0b"
            />
          </View>
        </View>

        {/* Departments */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Departments</Text>
            <TouchableOpacity 
              style={styles.seeAllButton}
              onPress={() => setShowDepartmentsModal(true)}
            >
              <Text style={styles.seeAllText}>View All</Text>
              <Ionicons name="arrow-forward" size={16} color={isDarkMode ? "#3b82f6" : "#2563eb"} />
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.departmentsScroll}>
            <View style={styles.departmentsContainer}>
              {departments.length > 0 ? (
                departments.map((department) => (
                  <DepartmentPill key={department.id} department={department} />
                ))
              ) : (
                <View style={styles.emptyDepartments}>
                  <Text style={styles.emptyText}>No departments yet</Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>

        {/* Out of Stock Products Table */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Out of Stock Products</Text>
            <TouchableOpacity onPress={() => router.push('/ProductsScreen' as any)}>
              <Text style={styles.seeAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          <View style={[styles.productsTable, { backgroundColor: isDarkMode ? "#1f2937" : "#ffffff" }]}>
            {outOfStockProducts.length > 0 ? (
              <>
                <View style={styles.tableHeader}>
                  <Text style={styles.tableHeaderText}>PRODUCT</Text>
                  <Text style={styles.tableHeaderText}>STOCK</Text>
                  <Text style={styles.tableHeaderText}></Text>
                </View>
                {outOfStockProducts.slice(0, 5).map((product) => (
                  <ProductRow key={product.id} product={product} />
                ))}
              </>
            ) : (
              <View style={styles.emptyTable}>
                <Ionicons name="checkmark-circle" size={48} color={isDarkMode ? "#10b981" : "#059669"} />
                <Text style={styles.emptyTableTitle}>All Products in Stock</Text>
                <Text style={styles.emptyTableDescription}>
                  Great job! All your products are properly stocked.
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <DepartmentsModal />
    </View>
  );
}

const getStyles = (isDarkMode: boolean) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: isDarkMode ? "#111827" : "#f9fafb" 
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: isDarkMode ? "#f9fafb" : "#111827",
    letterSpacing: -0.5,
  },
  headerDate: {
    fontSize: 14,
    color: isDarkMode ? "#9ca3af" : "#6b7280",
    fontWeight: '500',
    marginTop: 4,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: isDarkMode ? "#1f2937" : "#ffffff",
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: isDarkMode ? "#374151" : "#e5e7eb",
  },
  statsSection: {
    marginBottom: 24,
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
    fontSize: 20,
    fontWeight: '700',
    color: isDarkMode ? "#f9fafb" : "#111827",
    letterSpacing: -0.5,
  },
  statsScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingRight: 16,
  },
  statCard: {
    width: 160,
    padding: 20,
    borderRadius: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? "#374151" : "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconContainer: {
    marginBottom: 16,
  },
  statIcon: {
    fontSize: 24,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? "#9ca3af" : "#6b7280",
  },
  trendBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendText: {
    fontSize: 12,
    fontWeight: '800',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  quickActionCard: {
    width: (screenWidth - 64) / 2,
    padding: 20,
    borderRadius: 16,
    margin: 8,
    borderWidth: 1,
    borderColor: isDarkMode ? "#374151" : "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickActionIconText: {
    fontSize: 20,
    fontWeight: '600',
  },
  quickActionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: isDarkMode ? "#f9fafb" : "#111827",
    marginBottom: 4,
  },
  quickActionDescription: {
    fontSize: 12,
    color: isDarkMode ? "#9ca3af" : "#6b7280",
    lineHeight: 16,
  },
  departmentsScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  departmentsContainer: {
    flexDirection: 'row',
    paddingRight: 16,
  },
  departmentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: isDarkMode ? "#374151" : "#e5e7eb",
  },
  departmentPillIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  departmentPillName: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? "#f9fafb" : "#111827",
  },
  emptyDepartments: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: isDarkMode ? "#6b7280" : "#9ca3af",
    fontSize: 14,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? "#3b82f6" : "#2563eb",
    marginRight: 4,
  },
  productsTable: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: isDarkMode ? "#374151" : "#e5e7eb",
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: isDarkMode ? "#374151" : "#f3f4f6",
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "#4b5563" : "#e5e7eb",
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: isDarkMode ? "#9ca3af" : "#6b7280",
    letterSpacing: 0.5,
    flex: 1,
  },
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "#374151" : "#f3f4f6",
  },
  productInfo: {
    flex: 2,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? "#f9fafb" : "#111827",
    marginBottom: 4,
  },
  productId: {
    fontSize: 12,
    color: isDarkMode ? "#9ca3af" : "#6b7280",
  },
  productStock: {
    flex: 1,
    alignItems: 'center',
  },
  stockBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 4,
  },
  stockText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  stockLabel: {
    fontSize: 10,
    color: isDarkMode ? "#9ca3af" : "#6b7280",
    fontWeight: '500',
  },
  emptyTable: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTableTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: isDarkMode ? "#f9fafb" : "#111827",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyTableDescription: {
    fontSize: 14,
    color: isDarkMode ? "#9ca3af" : "#6b7280",
    textAlign: 'center',
    lineHeight: 20,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    paddingTop: 60,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "#374151" : "#e5e7eb",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: isDarkMode ? "#f9fafb" : "#111827",
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    fontSize: 14,
    color: isDarkMode ? "#9ca3af" : "#6b7280",
    marginTop: 4,
  },
  closeButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 20,
    padding: 16,
    backgroundColor: isDarkMode ? "#1f2937" : "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? "#374151" : "#e5e7eb",
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  modalListContent: {
    padding: 20,
  },
  modalDepartmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? "#374151" : "#e5e7eb",
  },
  modalDepartmentIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  modalIconText: {
    fontSize: 20,
    color: '#ffffff',
  },
  modalDepartmentContent: {
    flex: 1,
  },
  modalDepartmentName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalDepartmentDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  modalDepartmentArrow: {
    marginLeft: 8,
  },
});