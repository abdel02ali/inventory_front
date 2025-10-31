import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
  View
} from 'react-native';
import { useStockMovements } from '../../hooks/useStockMovements';
import { departmentService } from '../../services/departmentService';
import { MovementType, ProductSelection, StockMovement, Department as StockMovementDepartment } from "../../services/stockMovmentService";
import type { Department as ApiDepartment } from '../types/department';

// Types
type DepartmentFilter = StockMovementDepartment | 'all';

interface DepartmentConfig {
  key: DepartmentFilter;
  label: string;
  icon: string;
  color: string;
  activeColor: string;
}

// Constants
const DEFAULT_DEPARTMENTS: DepartmentConfig[] = [
  { key: 'all', label: 'All', icon: '🏢', color: '#6b7280', activeColor: '#6366f1' },
  { key: 'pastry', label: 'Pastry', icon: '🥐', color: '#f59e0b', activeColor: '#d97706' },
  { key: 'bakery', label: 'Bakery', icon: '🍞', color: '#84cc16', activeColor: '#65a30d' },
  { key: 'cleaning', label: 'Cleaning', icon: '🧹', color: '#06b6d4', activeColor: '#0891b2' },
  { key: 'magazin', label: 'Office', icon: '👔', color: '#8b5cf6', activeColor: '#7c3aed' },
];

const MOVEMENT_TYPES = [
  { key: 'all', label: 'All', icon: '📊' },
  { key: 'stock_in', label: 'Stock In', icon: '📥' },
  { key: 'distribution', label: 'Distribute', icon: '📤' }
] as const;

const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'all', label: 'All Time' }
] as const;

// Helper functions
const convertFirestoreTimestamp = (timestamp: any): Date => {
  if (timestamp?.seconds) {
    return new Date(timestamp.seconds * 1000);
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  if (typeof timestamp === 'string') {
    return new Date(timestamp);
  }
  return new Date();
};

const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

export default function HistoryScreen() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const router = useRouter();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<MovementType | 'all'>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentFilter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [departments, setDepartments] = useState<DepartmentConfig[]>(DEFAULT_DEPARTMENTS);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const styles = getStyles(isDarkMode);

  // Fetch departments
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const serverDepartments = await departmentService.getDepartments();
        
        const transformedDepartments: DepartmentConfig[] = [
          { key: 'all', label: 'All', icon: '🏢', color: '#6b7280', activeColor: '#6366f1' },
        ];

        if (Array.isArray(serverDepartments)) {
          serverDepartments.forEach((dept: ApiDepartment) => {
            if (dept?.id) {
              transformedDepartments.push({
                key: dept.id as StockMovementDepartment,
                label: dept.name || 'Unknown',
                icon: dept.icon || '🏢',
                color: dept.color || '#6366f1',
                activeColor: dept.activeColor || dept.color || '#6366f1',
              });
            }
          });
        }
        
        setDepartments(transformedDepartments.length > 1 ? transformedDepartments : DEFAULT_DEPARTMENTS);
      } catch (error) {
        console.error('❌ Failed to fetch departments:', error);
        setDepartments(DEFAULT_DEPARTMENTS);
      } finally {
        setLoadingDepartments(false);
      }
    };

    fetchDepartments();
  }, []);

  // Stock movements hook
  const { 
    movements, 
    loading, 
    error, 
    refetch 
  } = useStockMovements({
    type: selectedType !== 'all' ? selectedType : undefined,
    department: selectedDepartment !== 'all' ? selectedDepartment as StockMovementDepartment : undefined,
    page: 1,
    limit: 30
  });

  // Handle errors
  useEffect(() => {
    if (error && !apiError) {
      setApiError(error);
    }
  }, [error]);

  const handleRefetch = async () => {
    try {
      setRefreshing(true);
      setApiError(null);
      await refetch();
    } catch (error: any) {
      setApiError('Failed to load data. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  // Filter and group movements
  const filteredMovements = movements.filter((movement: StockMovement) => {
    const movementDate = convertFirestoreTimestamp(movement.timestamp);
    const now = new Date();
    
    // Search filter
    const matchesSearch = !debouncedSearchQuery || 
      movement.products.some((product: ProductSelection) => 
        product.productName.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
      ) ||
      movement.stockManager.toLowerCase().includes(debouncedSearchQuery.toLowerCase());

    // Period filter
    const matchesPeriod = (() => {
      switch (selectedPeriod) {
        case 'today': return movementDate.toDateString() === now.toDateString();
        case 'week': return movementDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        case 'month': return movementDate >= new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        default: return true;
      }
    })();

    return matchesSearch && matchesPeriod;
  });

  // Group by date
  const sectionData = Object.entries(
    filteredMovements.reduce((acc: { [key: string]: StockMovement[] }, movement: StockMovement) => {
      const date = convertFirestoreTimestamp(movement.timestamp).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      if (!acc[date]) acc[date] = [];
      acc[date].push(movement);
      return acc;
    }, {})
  )
  .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
  .map(([title, data]) => ({
    title,
    data: data.sort((a: StockMovement, b: StockMovement) => 
      convertFirestoreTimestamp(b.timestamp).getTime() - convertFirestoreTimestamp(a.timestamp).getTime()
    )
  }));

  // Statistics
  const stats = {
    total: filteredMovements.length,
    stockIn: filteredMovements.filter(m => m.type === 'stock_in').length,
    distributions: filteredMovements.filter(m => m.type === 'distribution').length,
  };

  // Helper functions
  const getTypeColor = (type: MovementType) => type === 'stock_in' ? '#10b981' : '#ef4444';
  const getTypeIcon = (type: MovementType) => type === 'stock_in' ? '📥' : '📤';
  const formatTime = (timestamp: any) => convertFirestoreTimestamp(timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  const getDepartmentDisplay = (movement: StockMovement): string => {
    const department = movement.department;
    if (!department) return '🏢 Unknown';
    
    if (typeof department === 'string') {
      const dept = departments.find(d => d.key === department);
      return dept ? `${dept.icon} ${dept.label}` : `🏢 ${department}`;
    }
    
    if (typeof department === 'object' && department.name) {
      return `🏢 ${department.name}`;
    }
    
    return '🏢 Unknown';
  };

  const renderProductItem = (product: ProductSelection, index: number) => (
    <View key={`${product.productId}-${index}`} style={styles.productItem}>
      <Text style={styles.productQuantity}>
        {product.quantity} {product.unit}
      </Text>
      <Text style={styles.productName}>{product.productName}</Text>
      {product.unitPrice && product.unitPrice > 0 && (
        <Text style={styles.productPrice}>
          ${(product.unitPrice * product.quantity).toFixed(2)}
        </Text>
      )}
    </View>
  );

  if ((loading && !refreshing) || loadingDepartments) {
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
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Stock History</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => router.push('/details/stock-movement')}
          >
            <Ionicons name="add-circle" size={20} color="#ffffff" />
            <Text style={styles.addButtonText}>New Movement</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Error Display */}
      {apiError && (
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={20} color="#f59e0b" />
          <Text style={styles.errorText}>{apiError}</Text>
          <TouchableOpacity onPress={() => setApiError(null)} style={styles.dismissButton}>
            <Text style={styles.dismissButtonText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Statistics */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#10b981' }]}>{stats.stockIn}</Text>
          <Text style={styles.statLabel}>Stock In</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#ef4444' }]}>{stats.distributions}</Text>
          <Text style={styles.statLabel}>Distributed</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={isDarkMode ? "#94a3b8" : "#64748b"} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products, departments..."
            placeholderTextColor={isDarkMode ? "#94a3b8" : "#9ca3af"}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={isDarkMode ? "#94a3b8" : "#64748b"} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Type Filter */}
        <FilterScrollView>
          {MOVEMENT_TYPES.map((type) => (
            <FilterButton
              key={type.key}
              label={`${type.icon} ${type.label}`}
              isActive={selectedType === type.key}
              onPress={() => setSelectedType(type.key as MovementType | 'all')}
              activeColor={type.key === 'stock_in' ? '#10b981' : type.key === 'distribution' ? '#ef4444' : '#6366f1'}
            />
          ))}
        </FilterScrollView>

        {/* Department Filter */}
        <FilterScrollView>
          {departments.map((dept) => (
            <DepartmentButton
              key={dept.key}
              label={`${dept.icon} ${dept.label}`}
              isActive={selectedDepartment === dept.key}
              onPress={() => setSelectedDepartment(dept.key)}
              activeColor={dept.activeColor}
              isDarkMode={isDarkMode}
            />
          ))}
        </FilterScrollView>

        {/* Period Filter */}
        <FilterScrollView>
          {PERIODS.map((period) => (
            <FilterButton
              key={period.key}
              label={period.label}
              isActive={selectedPeriod === period.key}
              onPress={() => setSelectedPeriod(period.key)}
              activeColor="#10b981"
            />
          ))}
        </FilterScrollView>
      </View>

      {/* History List */}
      {filteredMovements.length === 0 ? (
        <EmptyState 
          searchQuery={searchQuery}
          selectedType={selectedType}
          selectedPeriod={selectedPeriod}
          selectedDepartment={selectedDepartment}
          onRefresh={handleRefetch}
          isDarkMode={isDarkMode}
        />
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
              onRefresh={handleRefetch}
              colors={['#6366f1']}
              tintColor="#6366f1"
            />
          }
          renderItem={({ item }: { item: StockMovement }) => (
            <MovementItem 
              movement={item}
              onPress={() => router.push({
                pathname: "/details/movementDetail",
                params: { movementId: item.id }
              })}
              getTypeColor={getTypeColor}
              getTypeIcon={getTypeIcon}
              formatTime={formatTime}
              getDepartmentDisplay={getDepartmentDisplay}
              renderProductItem={renderProductItem}
              isDarkMode={isDarkMode}
            />
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

// Sub-components
const FilterScrollView: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ScrollView 
    horizontal 
    showsHorizontalScrollIndicator={false} 
    style={styles.filterScroll}
    contentContainerStyle={styles.filterScrollContent}
  >
    {children}
  </ScrollView>
);

interface FilterButtonProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
  activeColor: string;
}

const FilterButton: React.FC<FilterButtonProps> = ({ label, isActive, onPress, activeColor }) => (
  <TouchableOpacity
    style={[
      styles.filterButton,
      isActive && [styles.filterButtonActive, { backgroundColor: activeColor }]
    ]}
    onPress={onPress}
  >
    <Text style={[
      styles.filterButtonText,
      isActive && styles.filterButtonTextActive
    ]}>
      {label}
    </Text>
  </TouchableOpacity>
);

interface DepartmentButtonProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
  activeColor: string;
  isDarkMode: boolean;
}

const DepartmentButton: React.FC<DepartmentButtonProps> = ({ label, isActive, onPress, activeColor, isDarkMode }) => (
  <TouchableOpacity
    style={[
      styles.departmentButton,
      isActive && [
        styles.departmentButtonActive,
        { borderLeftColor: activeColor, backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc' }
      ]
    ]}
    onPress={onPress}
  >
    <Text style={[
      styles.departmentButtonText,
      isActive && [styles.departmentButtonTextActive, { color: activeColor }]
    ]}>
      {label}
    </Text>
  </TouchableOpacity>
);

interface EmptyStateProps {
  searchQuery: string;
  selectedType: MovementType | 'all';
  selectedPeriod: string;
  selectedDepartment: DepartmentFilter;
  onRefresh: () => void;
  isDarkMode: boolean;
}

const EmptyState: React.FC<EmptyStateProps> = ({ 
  searchQuery, 
  selectedType, 
  selectedPeriod, 
  selectedDepartment, 
  onRefresh, 
  isDarkMode 
}) => (
  <View style={styles.emptyState}>
    <Ionicons name="document-text-outline" size={64} color={isDarkMode ? "#475569" : "#cbd5e1"} />
    <Text style={styles.emptyStateTitle}>No movements found</Text>
    <Text style={styles.emptyStateText}>
      {searchQuery || selectedType !== 'all' || selectedPeriod !== 'all' || selectedDepartment !== 'all'
        ? 'Try adjusting your filters'
        : 'No stock movements recorded yet'
      }
    </Text>
    <TouchableOpacity style={styles.emptyStateButton} onPress={onRefresh}>
      <Text style={styles.emptyStateButtonText}>Refresh Data</Text>
    </TouchableOpacity>
  </View>
);

interface MovementItemProps {
  movement: StockMovement;
  onPress: () => void;
  getTypeColor: (type: MovementType) => string;
  getTypeIcon: (type: MovementType) => string;
  formatTime: (timestamp: any) => string;
  getDepartmentDisplay: (movement: StockMovement) => string;
  renderProductItem: (product: ProductSelection, index: number) => JSX.Element;
  isDarkMode: boolean;
}

const MovementItem: React.FC<MovementItemProps> = ({
  movement,
  onPress,
  getTypeColor,
  getTypeIcon,
  formatTime,
  getDepartmentDisplay,
  renderProductItem,
  isDarkMode
}) => (
  <TouchableOpacity style={styles.historyItem} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.itemHeader}>
      <View style={styles.typeInfo}>
        <View style={[styles.typeBadge, { backgroundColor: getTypeColor(movement.type) }]}>
          <Text style={styles.typeBadgeText}>
            {getTypeIcon(movement.type)} {movement.type === 'stock_in' ? 'IN' : 'OUT'}
          </Text>
        </View>
        <Text style={styles.itemCount}>{movement.totalItems} items</Text>
        
        {movement.type === 'stock_in' && movement.supplier && (
          <Text style={styles.supplier}>from {movement.supplier}</Text>
        )}
        
        {movement.type === 'distribution' && movement.department && (
          <Text style={styles.departmentText}>{getDepartmentDisplay(movement)}</Text>
        )}
      </View>
      
      <View style={styles.itemMeta}>
        <Text style={styles.manager}>{movement.stockManager}</Text>
        <Text style={styles.time}>{formatTime(movement.timestamp)}</Text>
      </View>
    </View>

    <View style={styles.productsList}>
      {movement.products.map(renderProductItem)}
    </View>

    {movement.type === 'stock_in' && movement.totalValue && movement.totalValue > 0 && (
      <View style={styles.totalValueContainer}>
        <Text style={styles.totalValueLabel}>Total: </Text>
        <Text style={styles.totalValue}>${movement.totalValue.toFixed(2)}</Text>
      </View>
    )}

    {movement.notes && (
      <View style={styles.notesContainer}>
        <Text style={styles.notesLabel}>📝 </Text>
        <Text style={styles.notes}>{movement.notes}</Text>
      </View>
    )}

    <View style={styles.clickIndicator}>
      <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
    </View>
  </TouchableOpacity>
);

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#6366f1',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  addButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#d97706',
    marginLeft: 8,
    marginRight: 12,
  },
  dismissButton: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  dismissButtonText: {
    color: '#4b5563',
    fontSize: 12,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    marginTop: -32,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    marginHorizontal: 4,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  filtersContainer: {
    padding: 16,
    gap: 8,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterScrollContent: {
    gap: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    color: '#1e293b',
    fontSize: 15,
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterButtonActive: {
    borderColor: 'transparent',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },
  departmentButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 3,
  },
  departmentButtonActive: {
    borderWidth: 1,
    borderLeftWidth: 3,
  },
  departmentButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  departmentButtonTextActive: {
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 20,
  },
  sectionHeader: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  historyItem: {
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  typeInfo: {
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  itemCount: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 2,
  },
  supplier: {
    fontSize: 11,
    color: '#64748b',
    fontStyle: 'italic',
  },
  departmentText: {
    fontSize: 11,
    color: '#64748b',
  },
  itemMeta: {
    alignItems: 'flex-end',
  },
  manager: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 2,
  },
  time: {
    fontSize: 11,
    color: '#64748b',
  },
  productsList: {
    gap: 4,
    marginBottom: 10,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  productQuantity: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1e293b',
    marginRight: 8,
    minWidth: 60,
  },
  productName: {
    fontSize: 13,
    color: '#1e293b',
    flex: 1,
  },
  productPrice: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '600',
    marginLeft: 6,
  },
  totalValueContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  totalValueLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#10b981',
    marginLeft: 6,
  },
  notesContainer: {
    flexDirection: 'row',
    backgroundColor: '#f0f9ff',
    padding: 8,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#06b6d4',
  },
  notesLabel: {
    fontSize: 11,
    marginRight: 6,
  },
  notes: {
    fontSize: 11,
    color: '#64748b',
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyStateButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  clickIndicator: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -8,
  },
});

// Helper function to get styles with dark mode support
const getStyles = (isDarkMode: boolean) => {
  const baseStyles = styles;
  
  if (!isDarkMode) return baseStyles;
  
  // Dark mode overrides
  return StyleSheet.create({
    ...baseStyles,
    container: {
      ...baseStyles.container,
      backgroundColor: '#0f172a',
    },
    loadingContainer: {
      ...baseStyles.loadingContainer,
      backgroundColor: '#0f172a',
    },
    loadingText: {
      ...baseStyles.loadingText,
      color: '#94a3b8',
    },
    statCard: {
      ...baseStyles.statCard,
      backgroundColor: '#1e293b',
    },
    statValue: {
      ...baseStyles.statValue,
      color: '#f1f5f9',
    },
    statLabel: {
      ...baseStyles.statLabel,
      color: '#94a3b8',
    },
    searchContainer: {
      ...baseStyles.searchContainer,
      backgroundColor: '#1e293b',
      borderColor: '#334155',
    },
    searchInput: {
      ...baseStyles.searchInput,
      color: '#f1f5f9',
    },
    filterButton: {
      ...baseStyles.filterButton,
      backgroundColor: '#334155',
      borderColor: '#475569',
    },
    filterButtonText: {
      ...baseStyles.filterButtonText,
      color: '#94a3b8',
    },
    departmentButton: {
      ...baseStyles.departmentButton,
      backgroundColor: '#1e293b',
      borderColor: '#334155',
    },
    departmentButtonText: {
      ...baseStyles.departmentButtonText,
      color: '#94a3b8',
    },
    sectionTitle: {
      ...baseStyles.sectionTitle,
      color: '#f1f5f9',
    },
    historyItem: {
      ...baseStyles.historyItem,
      backgroundColor: '#1e293b',
      borderColor: '#334155',
    },
    itemCount: {
      ...baseStyles.itemCount,
      color: '#94a3b8',
    },
    supplier: {
      ...baseStyles.supplier,
      color: '#94a3b8',
    },
    departmentText: {
      ...baseStyles.departmentText,
      color: '#94a3b8',
    },
    manager: {
      ...baseStyles.manager,
      color: '#94a3b8',
    },
    time: {
      ...baseStyles.time,
      color: '#94a3b8',
    },
    productItem: {
      ...baseStyles.productItem,
      backgroundColor: '#334155',
      borderColor: '#475569',
    },
    productQuantity: {
      ...baseStyles.productQuantity,
      color: '#f1f5f9',
    },
    productName: {
      ...baseStyles.productName,
      color: '#f1f5f9',
    },
    totalValueContainer: {
      ...baseStyles.totalValueContainer,
      borderTopColor: '#334155',
    },
    totalValueLabel: {
      ...baseStyles.totalValueLabel,
      color: '#94a3b8',
    },
    notesContainer: {
      ...baseStyles.notesContainer,
      backgroundColor: '#334155',
    },
    notes: {
      ...baseStyles.notes,
      color: '#94a3b8',
    },
    emptyStateTitle: {
      ...baseStyles.emptyStateTitle,
      color: '#f1f5f9',
    },
    emptyStateText: {
      ...baseStyles.emptyStateText,
      color: '#94a3b8',
    },
    errorContainer: {
      ...baseStyles.errorContainer,
      backgroundColor: '#451a03',
      borderColor: '#78350f',
    },
    errorText: {
      ...baseStyles.errorText,
      color: '#f59e0b',
    },
    dismissButton: {
      ...baseStyles.dismissButton,
      backgroundColor: '#374151',
    },
    dismissButtonText: {
      ...baseStyles.dismissButtonText,
      color: '#d1d5db',
    },
  });
};