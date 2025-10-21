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
  gradient: string[];
}

interface DashboardProduct {
  id: string;
  name: string;
  currentStock: number;
  alertLevel: string;
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

  // Get today's date in formatted style
  const getTodayDate = () => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return today.toLocaleDateString('en-US', options);
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
        setDepartments(departmentsResponse.slice(0, 4));
        setAllDepartments(departmentsResponse);
        setStats(prev => ({
          ...prev,
          totalDepartments: departmentsResponse.length
        }));
        console.log('✅ Departments loaded successfully');
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
      label: "Products", 
      value: stats.totalProducts, 
      color: isDarkMode ? "#4ade80" : "#16a34a", 
      icon: "📦",
      gradient: isDarkMode ? ["#059669", "#10b981"] : ["#16a34a", "#22c55e"]
    },
    { 
      label: "Out of Stock", 
      value: stats.outOfStock, 
      color: isDarkMode ? "#f87171" : "#dc2626", 
      icon: "⚠️",
      gradient: isDarkMode ? ["#dc2626", "#ef4444"] : ["#b91c1c", "#dc2626"]
    },
    { 
      label: "Departments", 
      value: stats.totalDepartments, 
      color: isDarkMode ? "#60a5fa" : "#3b82f6", 
      icon: "🏢",
      gradient: isDarkMode ? ["#1d4ed8", "#3b82f6"] : ["#1e40af", "#3b82f6"]
    }
  ];

  const DepartmentCard = ({ department }: { department: Department }) => (
    <TouchableOpacity 
      style={[styles.departmentCard, { backgroundColor: department.color + '20' }]}
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
      <View style={[styles.departmentIconContainer, { backgroundColor: department.color }]}>
        <Text style={styles.departmentIcon}>{department.icon}</Text>
      </View>
      <Text style={styles.departmentName} numberOfLines={1}>
        {department.name}
      </Text>
      <Text style={styles.departmentDescription} numberOfLines={2}>
        {department.description || 'No description'}
      </Text>
    </TouchableOpacity>
  );

  const StatCard = ({ item }: { item: StatItem }) => (
    <View style={[styles.statCard, { 
      backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
      shadowColor: item.gradient[0],
    }]}>
      <View style={styles.statHeader}>
        <Text style={styles.statIcon}>{item.icon}</Text>
        <View style={[styles.statBadge, { backgroundColor: item.color + '20' }]}>
          <Text style={[styles.statValue, { color: item.color }]}>{item.value}</Text>
        </View>
      </View>
      <Text style={styles.statLabel}>{item.label}</Text>
    </View>
  );

  const QuickAction = ({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) => (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <View style={[styles.actionIconContainer, { backgroundColor: isDarkMode ? "#334155" : "#f1f5f9" }]}>
        <Text style={styles.actionIcon}>{icon}</Text>
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );

  const DepartmentsModal = () => (
    <Modal
      visible={showDepartmentsModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowDepartmentsModal(false)}
    >
      <View style={[styles.modalContainer, { backgroundColor: isDarkMode ? "#0f172a" : "#f8fafc" }]}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>All Departments</Text>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setShowDepartmentsModal(false)}
          >
            <Ionicons name="close" size={24} color={isDarkMode ? "#94a3b8" : "#64748b"} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={isDarkMode ? "#94a3b8" : "#64748b"} />
          <TextInput
            style={[styles.searchInput, { color: isDarkMode ? "#f1f5f9" : "#1e293b" }]}
            placeholder="Search departments..."
            placeholderTextColor={isDarkMode ? "#94a3b8" : "#9ca3af"}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <FlatList
          data={filteredDepartments}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.modalDepartmentItem, { backgroundColor: isDarkMode ? "#1e293b" : "#ffffff" }]}
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
              <View style={[styles.modalIconContainer, { backgroundColor: item.color }]}>
                <Text style={styles.modalDepartmentIcon}>{item.icon}</Text>
              </View>
              <View style={styles.modalDepartmentInfo}>
                <Text style={[styles.modalDepartmentName, { color: isDarkMode ? "#f1f5f9" : "#1e293b" }]}>
                  {item.name}
                </Text>
                <Text style={[styles.modalDepartmentDescription, { color: isDarkMode ? "#94a3b8" : "#64748b" }]}>
                  {item.description || 'No description'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={isDarkMode ? "#475569" : "#94a3b8"} />
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
            colors={[isDarkMode ? "#60a5fa" : "#3b82f6"]}
            tintColor={isDarkMode ? "#60a5fa" : "#3b82f6"}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back! 👋</Text>
            <Text style={styles.date}>{todayDate}</Text>
          </View>
          <View style={[styles.avatar, { backgroundColor: isDarkMode ? "#334155" : "#e2e8f0" }]}>
            <Text style={styles.avatarText}>AD</Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {statItems.map((item, index) => (
            <StatCard key={item.label} item={item} />
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
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
              label="Manage Stock" 
              onPress={() => router.push('/details/add-quantity' as any)}
            />
          </View>
        </View>

        {/* Departments Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Departments</Text>
            <TouchableOpacity 
              style={styles.seeAllButton}
              onPress={() => setShowDepartmentsModal(true)}
            >
              <Text style={styles.seeAllText}>See All</Text>
              <Ionicons name="chevron-forward" size={16} color={isDarkMode ? "#60a5fa" : "#3b82f6"} />
            </TouchableOpacity>
          </View>
          
          {departments.length > 0 ? (
            <View style={styles.departmentsGrid}>
              {departments.map((department) => (
                <DepartmentCard key={department.id} department={department} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: isDarkMode ? "#334155" : "#f1f5f9" }]}>
                <Text style={styles.emptyIconText}>🏢</Text>
              </View>
              <Text style={styles.emptyTitle}>No Departments</Text>
              <Text style={styles.emptyDescription}>
                Get started by creating your first department
              </Text>
              <TouchableOpacity 
                style={styles.emptyAction}
                onPress={() => router.push('/departments/create-department' as any)}
              >
                <Text style={styles.emptyActionText}>Create Department</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Out of Stock Alert */}
        {outOfStockProducts.length > 0 && (
          <View style={styles.section}>
            <View style={[styles.alertCard, { backgroundColor: isDarkMode ? "#431407" : "#fef2f2" }]}>
              <View style={styles.alertHeader}>
                <View style={[styles.alertIcon, { backgroundColor: isDarkMode ? "#dc2626" : "#ef4444" }]}>
                  <Text style={styles.alertIconText}>⚠️</Text>
                </View>
                <View style={styles.alertContent}>
                  <Text style={[styles.alertTitle, { color: isDarkMode ? "#fca5a5" : "#dc2626" }]}>
                    Out of Stock Alert
                  </Text>
                  <Text style={[styles.alertDescription, { color: isDarkMode ? "#fecaca" : "#ef4444" }]}>
                    {outOfStockProducts.length} products need restocking
                  </Text>
                </View>
              </View>
              <TouchableOpacity 
                style={[styles.alertAction, { backgroundColor: isDarkMode ? "#dc2626" : "#ef4444" }]}
                onPress={() => router.push('/ProductsScreen' as any)}
              >
                <Text style={styles.alertActionText}>View Products</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      <DepartmentsModal />
    </View>
  );
}

const getStyles = (isDarkMode: boolean) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: isDarkMode ? "#0f172a" : "#f8fafc" 
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
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontWeight: '500',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? "#e2e8f0" : "#475569",
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: isDarkMode ? "#334155" : "#e2e8f0",
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIcon: {
    fontSize: 20,
  },
  statBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: isDarkMode ? "#94a3b8" : "#64748b",
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
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? "#60a5fa" : "#3b82f6",
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
  actionIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionIcon: {
    fontSize: 20,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: isDarkMode ? "#cbd5e1" : "#475569",
    textAlign: 'center',
  },
  departmentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  departmentCard: {
    width: (screenWidth - 64) / 2,
    padding: 16,
    borderRadius: 16,
    margin: 6,
    borderWidth: 1,
    borderColor: isDarkMode ? "#334155" : "#e2e8f0",
  },
  departmentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  departmentIcon: {
    fontSize: 18,
    color: '#ffffff',
  },
  departmentName: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 4,
  },
  departmentDescription: {
    fontSize: 12,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    lineHeight: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: isDarkMode ? "#334155" : "#e2e8f0",
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
  emptyIconText: {
    fontSize: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  emptyAction: {
    backgroundColor: isDarkMode ? "#60a5fa" : "#3b82f6",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyActionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  alertCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: isDarkMode ? "#7f1d1d" : "#fecaca",
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  alertIconText: {
    fontSize: 16,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  alertDescription: {
    fontSize: 14,
    fontWeight: '500',
  },
  alertAction: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  alertActionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "#334155" : "#e2e8f0",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 20,
    padding: 12,
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? "#334155" : "#e2e8f0",
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  modalListContent: {
    padding: 20,
  },
  modalDepartmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? "#334155" : "#e2e8f0",
  },
  modalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modalDepartmentIcon: {
    fontSize: 16,
    color: '#ffffff',
  },
  modalDepartmentInfo: {
    flex: 1,
  },
  modalDepartmentName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  modalDepartmentDescription: {
    fontSize: 14,
  },
});