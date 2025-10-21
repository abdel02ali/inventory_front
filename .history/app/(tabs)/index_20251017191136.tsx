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
  change?: string;
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
  const [activeTab, setActiveTab] = useState('overview');

  const getTodayDate = () => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    };
    return today.toLocaleDateString('en-US', options);
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setTodayDate(getTodayDate());
      
      const [statsResponse, productsResponse] = await Promise.all([
        getDashboardStats('daily'),
        getOutOfStockProducts()
      ]);
      
      setStats(statsResponse.data);
      setOutOfStockProducts(productsResponse.data);
      
      try {
        const departmentsResponse = await departmentService.getDepartments();
        setDepartments(departmentsResponse.slice(0, 4));
        setAllDepartments(departmentsResponse);
        setStats(prev => ({
          ...prev,
          totalDepartments: departmentsResponse.length
        }));
      } catch (deptError) {
        console.error('Error loading departments:', deptError);
      }
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
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
      label: "Products", 
      value: stats.totalProducts, 
      color: "#00D4AA", 
      icon: "package",
      change: "+12%"
    },
    { 
      label: "Out of Stock", 
      value: stats.outOfStock, 
      color: "#FF6B6B", 
      icon: "alert-circle",
      change: stats.outOfStock > 0 ? "+5%" : "-2%"
    },
    { 
      label: "Departments", 
      value: stats.totalDepartments, 
      color: "#4D8AFF", 
      icon: "layers",
      change: "+3%"
    }
  ];

  const StatCard = ({ item }: { item: StatItem }) => (
    <View style={[styles.statCard, { backgroundColor: isDarkMode ? "#1A1D21" : "#FFFFFF" }]}>
      <View style={styles.statHeader}>
        <View style={[styles.statIconContainer, { backgroundColor: item.color + '20' }]}>
          <Ionicons name={item.icon as any} size={20} color={item.color} />
        </View>
        <Text style={[styles.changeText, { color: item.change?.includes('+') ? '#00D4AA' : '#FF6B6B' }]}>
          {item.change}
        </Text>
      </View>
      <Text style={[styles.statValue, { color: isDarkMode ? "#FFFFFF" : "#1A1D21" }]}>
        {item.value}
      </Text>
      <Text style={styles.statLabel}>{item.label}</Text>
    </View>
  );

  const DepartmentCard = ({ department }: { department: Department }) => (
    <TouchableOpacity 
      style={[styles.departmentCard, { backgroundColor: isDarkMode ? "#1A1D21" : "#FFFFFF" }]}
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
      <View style={[styles.departmentIcon, { backgroundColor: department.color }]}>
        <Text style={styles.departmentEmoji}>{department.icon}</Text>
      </View>
      <View style={styles.departmentInfo}>
        <Text style={[styles.departmentName, { color: isDarkMode ? "#FFFFFF" : "#1A1D21" }]}>
          {department.name}
        </Text>
        <Text style={styles.departmentDescription} numberOfLines={2}>
          {department.description || 'No description'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={isDarkMode ? "#666A70" : "#A0A4A8"} />
    </TouchableOpacity>
  );

  const QuickAction = ({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) => (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <View style={[styles.quickActionIcon, { backgroundColor: isDarkMode ? "#2A2D32" : "#F8F9FA" }]}>
        <Text style={styles.quickActionEmoji}>{icon}</Text>
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );

  const ProductItem = ({ product }: { product: DashboardProduct }) => (
    <TouchableOpacity 
      style={[styles.productItem, { backgroundColor: isDarkMode ? "#1A1D21" : "#FFFFFF" }]}
      onPress={() => router.push({
        pathname: "/details/product" as any,
        params: { id: product.id }
      })}
    >
      <View style={styles.productMain}>
        <View style={[styles.productStatus, { backgroundColor: "#FF6B6B" }]} />
        <View style={styles.productInfo}>
          <Text style={[styles.productName, { color: isDarkMode ? "#FFFFFF" : "#1A1D21" }]}>
            {product.name}
          </Text>
          <Text style={styles.productId}>#{product.id}</Text>
        </View>
      </View>
      <View style={styles.productStock}>
        <Text style={[styles.stockValue, { color: "#FF6B6B" }]}>{product.currentStock}</Text>
        <Text style={styles.stockLabel}>left</Text>
      </View>
    </TouchableOpacity>
  );

  const DepartmentsModal = () => (
    <Modal
      visible={showDepartmentsModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowDepartmentsModal(false)}
    >
      <View style={[styles.modalContainer, { backgroundColor: isDarkMode ? "#0F1114" : "#F8F9FA" }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: isDarkMode ? "#FFFFFF" : "#1A1D21" }]}>
            All Departments
          </Text>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setShowDepartmentsModal(false)}
          >
            <Ionicons name="close" size={24} color={isDarkMode ? "#666A70" : "#A0A4A8"} />
          </TouchableOpacity>
        </View>

        <View style={[styles.searchContainer, { backgroundColor: isDarkMode ? "#1A1D21" : "#FFFFFF" }]}>
          <Ionicons name="search" size={20} color={isDarkMode ? "#666A70" : "#A0A4A8"} />
          <TextInput
            style={[styles.searchInput, { color: isDarkMode ? "#FFFFFF" : "#1A1D21" }]}
            placeholder="Search departments..."
            placeholderTextColor={isDarkMode ? "#666A70" : "#A0A4A8"}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <FlatList
          data={filteredDepartments}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.modalDepartmentItem, { backgroundColor: isDarkMode ? "#1A1D21" : "#FFFFFF" }]}
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
                <Text style={styles.modalDepartmentEmoji}>{item.icon}</Text>
              </View>
              <View style={styles.modalDepartmentContent}>
                <Text style={[styles.modalDepartmentName, { color: isDarkMode ? "#FFFFFF" : "#1A1D21" }]}>
                  {item.name}
                </Text>
                <Text style={[styles.modalDepartmentDescription, { color: isDarkMode ? "#666A70" : "#A0A4A8" }]}>
                  {item.description || 'No description available'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={isDarkMode ? "#666A70" : "#A0A4A8"} />
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
            colors={[isDarkMode ? "#4D8AFF" : "#4D8AFF"]}
            tintColor={isDarkMode ? "#4D8AFF" : "#4D8AFF"}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good morning! 👋</Text>
            <Text style={styles.date}>{todayDate}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={[styles.headerButton, { backgroundColor: isDarkMode ? "#2A2D32" : "#F8F9FA" }]}>
              <Ionicons name="search" size={20} color={isDarkMode ? "#FFFFFF" : "#1A1D21"} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.headerButton, { backgroundColor: isDarkMode ? "#2A2D32" : "#F8F9FA" }]}>
              <Ionicons name="notifications-outline" size={20} color={isDarkMode ? "#FFFFFF" : "#1A1D21"} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {statItems.map((item) => (
            <StatCard key={item.label} item={item} />
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? "#FFFFFF" : "#1A1D21" }]}>
            Quick Actions
          </Text>
          <View style={styles.quickActionsGrid}>
            <QuickAction 
              icon="📦" 
              label="Add Product" 
              onPress={() => router.push('/details/add-product' as any)}
            />
            <QuickAction 
              icon="🧾" 
              label="Create Invoice" 
              onPress={() => router.push('/details/add-invoice' as any)}
            />
            <QuickAction 
              icon="🏢" 
              label="Add Department" 
              onPress={() => router.push('/departments/create-department' as any)}
            />
            <QuickAction 
              icon="📊" 
              label="Stock Movement" 
              onPress={() => router.push('/details/add-quantity' as any)}
            />
          </View>
        </View>

        {/* Departments Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: isDarkMode ? "#FFFFFF" : "#1A1D21" }]}>
              Departments
            </Text>
            <TouchableOpacity 
              style={styles.seeAllButton}
              onPress={() => setShowDepartmentsModal(true)}
            >
              <Text style={styles.seeAllText}>See all</Text>
              <Ionicons name="chevron-forward" size={16} color={isDarkMode ? "#4D8AFF" : "#4D8AFF"} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.departmentsList}>
            {departments.length > 0 ? (
              departments.map((department) => (
                <DepartmentCard key={department.id} department={department} />
              ))
            ) : (
              <View style={[styles.emptyState, { backgroundColor: isDarkMode ? "#1A1D21" : "#FFFFFF" }]}>
                <View style={[styles.emptyIcon, { backgroundColor: isDarkMode ? "#2A2D32" : "#F8F9FA" }]}>
                  <Ionicons name="business-outline" size={32} color={isDarkMode ? "#666A70" : "#A0A4A8"} />
                </View>
                <Text style={[styles.emptyTitle, { color: isDarkMode ? "#FFFFFF" : "#1A1D21" }]}>
                  No Departments
                </Text>
                <Text style={styles.emptyDescription}>
                  Create your first department to get started
                </Text>
                <TouchableOpacity 
                  style={styles.emptyButton}
                  onPress={() => router.push('/departments/create-department' as any)}
                >
                  <Text style={styles.emptyButtonText}>Create Department</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Out of Stock Products */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: isDarkMode ? "#FFFFFF" : "#1A1D21" }]}>
              Out of Stock
            </Text>
            <TouchableOpacity onPress={() => router.push('/ProductsScreen' as any)}>
              <Text style={styles.seeAllText}>View all</Text>
            </TouchableOpacity>
          </View>
          
          <View style={[styles.productsList, { backgroundColor: isDarkMode ? "#1A1D21" : "#FFFFFF" }]}>
            {outOfStockProducts.length > 0 ? (
              outOfStockProducts.slice(0, 5).map((product) => (
                <ProductItem key={product.id} product={product} />
              ))
            ) : (
              <View style={styles.emptyProducts}>
                <View style={[styles.emptyProductsIcon, { backgroundColor: isDarkMode ? "#2A2D32" : "#F8F9FA" }]}>
                  <Ionicons name="checkmark-circle" size={32} color="#00D4AA" />
                </View>
                <Text style={[styles.emptyProductsTitle, { color: isDarkMode ? "#FFFFFF" : "#1A1D21" }]}>
                  All Products Stocked
                </Text>
                <Text style={styles.emptyProductsDescription}>
                  Great! All your products are properly stocked and ready for sale.
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
    backgroundColor: isDarkMode ? "#0F1114" : "#F8F9FA" 
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 10,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: isDarkMode ? "#FFFFFF" : "#1A1D21",
    marginBottom: 4,
  },
  date: {
    fontSize: 15,
    color: isDarkMode ? "#666A70" : "#A0A4A8",
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: isDarkMode ? "#2A2D32" : "#E8EAED",
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: isDarkMode ? "#666A70" : "#A0A4A8",
    fontWeight: '500',
  },
  section: {
    marginBottom: 30,
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
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: "#4D8AFF",
    marginRight: 4,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAction: {
    alignItems: 'center',
    flex: 1,
    padding: 12,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionEmoji: {
    fontSize: 20,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: isDarkMode ? "#FFFFFF" : "#1A1D21",
    textAlign: 'center',
  },
  departmentsList: {
    gap: 12,
  },
  departmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: isDarkMode ? "#2A2D32" : "#E8EAED",
  },
  departmentIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  departmentEmoji: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  departmentInfo: {
    flex: 1,
  },
  departmentName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  departmentDescription: {
    fontSize: 13,
    color: isDarkMode ? "#666A70" : "#A0A4A8",
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: isDarkMode ? "#2A2D32" : "#E8EAED",
    borderStyle: 'dashed',
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: isDarkMode ? "#666A70" : "#A0A4A8",
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  emptyButton: {
    backgroundColor: "#4D8AFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  productsList: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: isDarkMode ? "#2A2D32" : "#E8EAED",
    overflow: 'hidden',
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "#2A2D32" : "#F8F9FA",
  },
  productMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  productStatus: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  productId: {
    fontSize: 12,
    color: isDarkMode ? "#666A70" : "#A0A4A8",
  },
  productStock: {
    alignItems: 'flex-end',
  },
  stockValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  stockLabel: {
    fontSize: 11,
    color: isDarkMode ? "#666A70" : "#A0A4A8",
    fontWeight: '500',
  },
  emptyProducts: {
    alignItems: 'center',
    padding: 40,
  },
  emptyProductsIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyProductsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyProductsDescription: {
    fontSize: 14,
    color: isDarkMode ? "#666A70" : "#A0A4A8",
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
    borderBottomColor: isDarkMode ? "#2A2D32" : "#E8EAED",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  closeButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? "#2A2D32" : "#E8EAED",
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
  modalDepartmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? "#2A2D32" : "#E8EAED",
  },
  modalDepartmentIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  modalDepartmentEmoji: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  modalDepartmentContent: {
    flex: 1,
  },
  modalDepartmentName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  modalDepartmentDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
});