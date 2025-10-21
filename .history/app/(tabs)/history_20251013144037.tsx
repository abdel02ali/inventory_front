// app/history.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    SectionList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';
import { useStockMovements } from '../../hooks/useStockMovements';
import { Department, MovementType, StockMovement, ProductSelection } from "../../services/stockMovmentService";';

type DepartmentFilter = Department | 'all';

export default function HistoryScreen() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const router = useRouter();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<MovementType | 'all'>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const styles = getStyles(isDarkMode);

  // Department configuration
  const departments: { key: DepartmentFilter; label: string; icon: string; color: string }[] = [
    { key: 'all', label: 'All Departments', icon: '🏢', color: '#6366f1' },
    { key: 'pastry', label: 'Pastry', icon: '🥐', color: '#f59e0b' },
    { key: 'bakery', label: 'Bakery', icon: '🍞', color: '#84cc16' },
    { key: 'magazin', label: 'Management', icon: '👔', color: '#0ea5e9' },
  ];

  const { 
    movements, 
    loading, 
    error, 
    pagination, 
    fetchMovements,
    refetch 
  } = useStockMovements({
    type: selectedType,
    department: selectedDepartment,
    page: 1,
    limit: 50
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Filter movements locally based on search and period
  const filteredMovements = movements.filter((movement: StockMovement) => {
    // Search filter
    const matchesSearch = searchQuery === '' || 
      movement.products.some((product: ProductSelection) => 
        product.productName.toLowerCase().includes(searchQuery.toLowerCase())
      ) ||
      movement.stockManager.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (movement.supplier && movement.supplier.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (movement.department && movement.department.toLowerCase().includes(searchQuery.toLowerCase()));

    // Period filter
    const movementDate = new Date(movement.timestamp);
    const now = new Date();
    let matchesPeriod = true;

    switch (selectedPeriod) {
      case 'today':
        matchesPeriod = movementDate.toDateString() === now.toDateString();
        break;
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchesPeriod = movementDate >= weekAgo;
        break;
      case 'month':
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        matchesPeriod = movementDate >= monthAgo;
        break;
      default:
        matchesPeriod = true;
    }

    return matchesSearch && matchesPeriod;
  });

  // Group by date for section list
  const groupedMovements = filteredMovements.reduce((acc: { [key: string]: StockMovement[] }, movement: StockMovement) => {
    const date = new Date(movement.timestamp).toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(movement);
    return acc;
  }, {});

  const sectionData = Object.entries(groupedMovements)
    .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
    .map(([title, data]) => ({
      title,
      data: data.sort((a: StockMovement, b: StockMovement) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    }));

  // Statistics
  const totalStockIn = filteredMovements.filter((m: StockMovement) => m.type === 'stock_in').length;
  const totalDistributions = filteredMovements.filter((m: StockMovement) => m.type === 'distribution').length;
  const totalProductsIn = filteredMovements
    .filter((m: StockMovement) => m.type === 'stock_in')
    .reduce((sum: number, m: StockMovement) => sum + m.totalItems, 0);
  const totalProductsOut = filteredMovements
    .filter((m: StockMovement) => m.type === 'distribution')
    .reduce((sum: number, m: StockMovement) => sum + m.totalItems, 0);

  const formatTime = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getTypeColor = (type: MovementType) => {
    return type === 'stock_in' ? '#10b981' : '#ef4444';
  };

  const getTypeIcon = (type: MovementType) => {
    return type === 'stock_in' ? '📥' : '📤';
  };

  const getDepartmentColor = (department?: Department) => {
    if (!department) return '#6b7280';
    const dept = departments.find(d => d.key === department);
    return dept?.color || '#6366f1';
  };

  const renderProductItem = (product: ProductSelection) => {
    return (
      <View key={product.productId} style={styles.productItem}>
        <Text style={styles.productQuantity}>
          {product.quantity} {product.unit}
        </Text>
        <Text style={styles.productName}>{product.productName}</Text>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading stock history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📦 Stock History</Text>
        <Text style={styles.headerSubtitle}>All stock movements managed by Ahmed</Text>
      </View>

      {/* Add Stock Button */}
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => router.push('/stock-movement')}
      >
        <Text style={styles.addButtonText}>➕ Add Stock Movement</Text>
      </TouchableOpacity>

      {/* Statistics */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{filteredMovements.length}</Text>
          <Text style={styles.statLabel}>Total Movements</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#10b981' }]}>+{totalStockIn}</Text>
          <Text style={styles.statLabel}>Stock In</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#ef4444' }]}>-{totalDistributions}</Text>
          <Text style={styles.statLabel}>Distributions</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={isDarkMode ? "#94a3b8" : "#64748b"} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products, departments..."
            placeholderTextColor={isDarkMode ? "#94a3b8" : "#9ca3af"}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={isDarkMode ? "#94a3b8" : "#64748b"} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Type Filter */}
        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeFilter}>
            {[
              { key: 'all', label: 'All Movements', icon: '📊' },
              { key: 'stock_in', label: 'Stock In', icon: '📥' },
              { key: 'distribution', label: 'Distributions', icon: '📤' }
            ].map((type) => (
              <TouchableOpacity
                key={type.key}
                style={[
                  styles.typeButton,
                  selectedType === type.key && styles.typeButtonActive
                ]}
                onPress={() => setSelectedType(type.key as MovementType | 'all')}
              >
                <Text style={[
                  styles.typeButtonText,
                  selectedType === type.key && styles.typeButtonTextActive
                ]}>
                  {type.icon} {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Department Filter */}
        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodFilter}>
            {departments.map((dept) => (
              <TouchableOpacity
                key={dept.key}
                style={[
                  styles.departmentButton,
                  selectedDepartment === dept.key && styles.departmentButtonActive,
                  { borderLeftColor: dept.color }
                ]}
                onPress={() => setSelectedDepartment(dept.key)}
              >
                <Text style={[
                  styles.departmentButtonText,
                  selectedDepartment === dept.key && styles.departmentButtonTextActive
                ]}>
                  {dept.icon} {dept.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Period Filter */}
        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodFilter}>
            {[
              { key: 'today', label: 'Today' },
              { key: 'week', label: 'This Week' },
              { key: 'month', label: 'This Month' },
              { key: 'all', label: 'All Time' }
            ].map((period) => (
              <TouchableOpacity
                key={period.key}
                style={[
                  styles.periodButton,
                  selectedPeriod === period.key && styles.periodButtonActive
                ]}
                onPress={() => setSelectedPeriod(period.key as 'today' | 'week' | 'month' | 'all')}
              >
                <Text style={[
                  styles.periodButtonText,
                  selectedPeriod === period.key && styles.periodButtonTextActive
                ]}>
                  {period.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* History List */}
      {filteredMovements.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>No stock movements found</Text>
          <Text style={styles.emptyStateText}>
            {searchQuery || selectedType !== 'all' || selectedPeriod !== 'all' || selectedDepartment !== 'all'
              ? 'Try changing your filters or search query'
              : 'No stock movements recorded yet'
            }
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sectionData}
          keyExtractor={(item: StockMovement) => item.id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#6366f1']}
              tintColor={isDarkMode ? "#6366f1" : "#6366f1"}
            />
          }
          renderItem={({ item }: { item: StockMovement }) => (
            <View style={styles.historyItem}>
              {/* Item Header */}
              <View style={styles.itemHeader}>
                <View style={styles.typeInfo}>
                  <View style={[styles.typeBadge, { backgroundColor: getTypeColor(item.type) }]}>
                    <Text style={styles.typeBadgeText}>
                      {getTypeIcon(item.type)} {item.type === 'stock_in' ? 'STOCK IN' : 'DISTRIBUTION'}
                    </Text>
                  </View>
                  <Text style={styles.itemCount}>{item.totalItems} products</Text>
                  
                  {/* Supplier for stock in */}
                  {item.type === 'stock_in' && item.supplier && (
                    <Text style={styles.supplier}>from {item.supplier}</Text>
                  )}
                  
                  {/* Department for distribution */}
                  {item.type === 'distribution' && item.department && (
                    <View style={[styles.departmentBadge, { backgroundColor: getDepartmentColor(item.department) }]}>
                      <Text style={styles.departmentBadgeText}>
                        {departments.find(d => d.key === item.department)?.icon} {item.department.toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.itemMeta}>
                  <Text style={styles.manager}>by {item.stockManager}</Text>
                  <Text style={styles.time}>{formatTime(item.timestamp)}</Text>
                </View>
              </View>

              {/* Products List */}
              <View style={styles.productsList}>
                {item.products.map(renderProductItem)}
              </View>

              {/* Notes */}
              {item.notes && (
                <View style={styles.notesContainer}>
                  <Text style={styles.notesLabel}>📝 </Text>
                  <Text style={styles.notes}>{item.notes}</Text>
                </View>
              )}
            </View>
          )}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{title}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const getStyles = (isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDarkMode ? "#0f172a" : "#f8fafc",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isDarkMode ? "#0f172a" : "#f8fafc",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  header: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#6366f1',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#e0e7ff',
    opacity: 0.9,
  },
  addButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    marginTop: -40,
  },
  statCard: {
    flex: 1,
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    marginHorizontal: 6,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDarkMode ? 0.2 : 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontWeight: '600',
  },
  filtersContainer: {
    padding: 16,
    gap: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? "#334155" : "#e2e8f0",
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    fontSize: 16,
  },
  filterRow: {
    flexDirection: 'row',
  },
  typeFilter: {
    flex: 1,
  },
  periodFilter: {
    flex: 1,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: isDarkMode ? "#334155" : "#f1f5f9",
    marginRight: 8,
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#e2e8f0",
  },
  typeButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  typeButtonTextActive: {
    color: '#ffffff',
  },
  departmentButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    marginRight: 8,
    borderWidth: 1,
    borderColor: isDarkMode ? "#334155" : "#e2e8f0",
    borderLeftWidth: 4,
  },
  departmentButtonActive: {
    backgroundColor: isDarkMode ? "#334155" : "#f1f5f9",
  },
  departmentButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  departmentButtonTextActive: {
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: isDarkMode ? "#334155" : "#f1f5f9",
    marginRight: 8,
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#e2e8f0",
  },
  periodButtonActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  periodButtonTextActive: {
    color: '#ffffff',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  sectionHeader: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
  },
  historyItem: {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? "#334155" : "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkMode ? 0.1 : 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  typeInfo: {
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  itemCount: {
    fontSize: 12,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontWeight: '600',
    marginBottom: 4,
  },
  supplier: {
    fontSize: 12,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontStyle: 'italic',
  },
  departmentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  departmentBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  itemMeta: {
    alignItems: 'flex-end',
  },
  manager: {
    fontSize: 12,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontWeight: '600',
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  productsList: {
    gap: 6,
    marginBottom: 12,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#e2e8f0",
  },
  productQuantity: {
    fontSize: 14,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginRight: 8,
    minWidth: 70,
  },
  productName: {
    fontSize: 14,
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    flex: 1,
  },
  productPrice: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
    marginLeft: 8,
  },
  totalValueContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: isDarkMode ? "#334155" : "#e2e8f0",
  },
  totalValueLabel: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10b981',
  },
  notesContainer: {
    flexDirection: 'row',
    backgroundColor: isDarkMode ? "#334155" : "#f0f9ff",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#06b6d4',
  },
  notesLabel: {
    fontSize: 12,
    marginRight: 8,
  },
  notes: {
    fontSize: 12,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    flex: 1,
    fontStyle: 'italic',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    textAlign: 'center',
  },
});