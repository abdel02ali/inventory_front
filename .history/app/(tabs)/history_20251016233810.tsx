import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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
import { Department, MovementType, ProductSelection, StockMovement } from "../../services/stockMovmentService";

type DepartmentFilter = Department | 'all';

// Helper function to convert Firestore timestamp to Date
const convertFirestoreTimestamp = (timestamp: any): Date => {
  if (timestamp && typeof timestamp === 'object' && timestamp._seconds) {
    return new Date(timestamp._seconds * 1000 + (timestamp._nanoseconds || 0) / 1000000);
  } else if (timestamp && typeof timestamp === 'string') {
    return new Date(timestamp);
  } else if (timestamp instanceof Date) {
    return timestamp;
  } else {
    console.warn('Invalid timestamp format:', timestamp);
    return new Date();
  }
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
  const [showFilters, setShowFilters] = useState(false);

  const styles = getStyles(isDarkMode);

  // Department configuration with updated colors
  const departments: { key: DepartmentFilter; label: string; icon: string; color: string; activeColor: string }[] = [
    { key: 'all', label: 'All', icon: '🏢', color: '#6b7280', activeColor: '#6366f1' },
    { key: 'pastry', label: 'Pastry', icon: '🥐', color: '#f59e0b', activeColor: '#d97706' },
    { key: 'bakery', label: 'Bakery', icon: '🍞', color: '#84cc16', activeColor: '#65a30d' },
    { key: 'cleaning', label: 'Cleaning', icon: '🧹', color: '#06b6d4', activeColor: '#0891b2' },
    { key: 'magazin', label: 'Office', icon: '👔', color: '#8b5cf6', activeColor: '#7c3aed' },
  ];

  // Update hook to use current filters
  const { 
    movements, 
    loading, 
    error, 
    pagination, 
    fetchMovements,
    refetch 
  } = useStockMovements({
    type: selectedType !== 'all' ? selectedType : undefined,
    department: selectedDepartment !== 'all' ? selectedDepartment : undefined,
    page: 1,
    limit: 50
  });

  // Refetch data when filters change
  useEffect(() => {
    refetch();
  }, [selectedType, selectedDepartment]);

  // Show error alert if there's an error
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
    }
  }, [error]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // Filter movements locally based on search and period only
  const filteredMovements = movements.filter((movement: StockMovement) => {
    const movementDate = convertFirestoreTimestamp(movement.timestamp);
    
    // Search filter
    const matchesSearch = searchQuery === '' || 
      movement.products.some((product: ProductSelection) => 
        product.productName.toLowerCase().includes(searchQuery.toLowerCase())
      ) ||
      movement.stockManager.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (movement.supplier && movement.supplier.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (movement.department && movement.department.toLowerCase().includes(searchQuery.toLowerCase()));

    // Period filter
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
    const movementDate = convertFirestoreTimestamp(movement.timestamp);
    const date = movementDate.toLocaleDateString('en-US', { 
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
    .sort(([dateA], [dateB]) => {
      const dateAObj = new Date(dateA);
      const dateBObj = new Date(dateB);
      return dateBObj.getTime() - dateAObj.getTime();
    })
    .map(([title, data]) => ({
      title,
      data: data.sort((a: StockMovement, b: StockMovement) => {
        const dateA = convertFirestoreTimestamp(a.timestamp);
        const dateB = convertFirestoreTimestamp(b.timestamp);
        return dateB.getTime() - dateA.getTime();
      })
    }));

  // Statistics
  const totalMovements = movements.length;
  const totalStockIn = movements.filter((m: StockMovement) => m.type === 'stock_in').length;
  const totalDistributions = movements.filter((m: StockMovement) => m.type === 'distribution').length;

  const formatTime = (timestamp: any) => {
    const date = convertFirestoreTimestamp(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatShortDate = (timestamp: any) => {
    const date = convertFirestoreTimestamp(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getTypeColor = (type: MovementType) => {
    return type === 'stock_in' ? '#10b981' : '#f59e0b';
  };

  const getTypeIcon = (type: MovementType) => {
    return type === 'stock_in' ? '📥' : '📤';
  };

  const getDepartmentColor = (department?: Department) => {
    if (!department) return '#6b7280';
    const dept = departments.find(d => d.key === department);
    return dept?.color || '#6366f1';
  };

  const renderProductItem = (product: ProductSelection, index: number) => {
    return (
      <View key={`${product.productId}-${index}`} style={styles.productItem}>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{product.productName}</Text>
          <Text style={styles.productDetails}>
            {product.quantity} {product.unit}
            {product.unitPrice && product.unitPrice > 0 && (
              <Text style={styles.productPrice}> • ${(product.unitPrice * product.quantity).toFixed(2)}</Text>
            )}
          </Text>
        </View>
      </View>
    );
  };

  // Handle filter changes
  const handleTypeChange = (type: MovementType | 'all') => {
    setSelectedType(type);
  };

  const handleDepartmentChange = (department: DepartmentFilter) => {
    setSelectedDepartment(department);
  };

  const handlePeriodChange = (period: 'today' | 'week' | 'month' | 'all') => {
    setSelectedPeriod(period);
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading stock history...</Text>
      </View>
    );
  }

  if (error && !loading) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#ef4444" />
        <Text style={styles.errorTitle}>Failed to Load History</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refetch}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Stock History</Text>
            <Text style={styles.headerSubtitle}>{totalMovements} total movements</Text>
          </View>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => router.push('/stock-movement')}
          >
            <Ionicons name="add" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Stats */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.statsScroll}
        contentContainerStyle={styles.statsContent}
      >
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#6366f120' }]}>
            <Text>📊</Text>
          </View>
          <View>
            <Text style={styles.statValue}>{totalMovements}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>
        
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#10b98120' }]}>
            <Text>📥</Text>
          </View>
          <View>
            <Text style={styles.statValue}>{totalStockIn}</Text>
            <Text style={styles.statLabel}>Stock In</Text>
          </View>
        </View>
        
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#f59e0b20' }]}>
            <Text>📤</Text>
          </View>
          <View>
            <Text style={styles.statValue}>{totalDistributions}</Text>
            <Text style={styles.statLabel}>Distribution</Text>
          </View>
        </View>
      </ScrollView>

      {/* Search and Filters */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={isDarkMode ? "#94a3b8" : "#64748b"} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products, managers..."
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

        <TouchableOpacity 
          style={styles.filterToggle}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons name="filter" size={20} color="#6366f1" />
          <Text style={styles.filterToggleText}>Filters</Text>
        </TouchableOpacity>
      </View>

      {/* Expandable Filters */}
      {showFilters && (
        <View style={styles.filtersPanel}>
          {/* Type Filter */}
          <View style={styles.filterGroup}>
            <Text style={styles.filterGroupTitle}>Movement Type</Text>
            <View style={styles.filterRow}>
              {[
                { key: 'all', label: 'All', icon: '📊' },
                { key: 'stock_in', label: 'Stock In', icon: '📥' },
                { key: 'distribution', label: 'Distribution', icon: '📤' }
              ].map((type) => (
                <TouchableOpacity
                  key={type.key}
                  style={[
                    styles.filterPill,
                    selectedType === type.key && [
                      styles.filterPillActive,
                      { backgroundColor: type.key === 'stock_in' ? '#10b981' : type.key === 'distribution' ? '#f59e0b' : '#6366f1' }
                    ]
                  ]}
                  onPress={() => handleTypeChange(type.key as MovementType | 'all')}
                >
                  <Text style={[
                    styles.filterPillText,
                    selectedType === type.key && styles.filterPillTextActive
                  ]}>
                    {type.icon} {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Department Filter */}
          <View style={styles.filterGroup}>
            <Text style={styles.filterGroupTitle}>Department</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.departmentScroll}
            >
              <View style={styles.filterRow}>
                {departments.map((dept) => (
                  <TouchableOpacity
                    key={dept.key}
                    style={[
                      styles.departmentPill,
                      selectedDepartment === dept.key && [
                        styles.departmentPillActive,
                        { borderColor: dept.activeColor }
                      ]
                    ]}
                    onPress={() => handleDepartmentChange(dept.key)}
                  >
                    <Text style={[
                      styles.departmentPillText,
                      selectedDepartment === dept.key && { color: dept.activeColor }
                    ]}>
                      {dept.icon} {dept.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Period Filter */}
          <View style={styles.filterGroup}>
            <Text style={styles.filterGroupTitle}>Time Period</Text>
            <View style={styles.filterRow}>
              {[
                { key: 'today', label: 'Today' },
                { key: 'week', label: 'This Week' },
                { key: 'month', label: 'This Month' },
                { key: 'all', label: 'All Time' }
              ].map((period) => (
                <TouchableOpacity
                  key={period.key}
                  style={[
                    styles.periodPill,
                    selectedPeriod === period.key && styles.periodPillActive
                  ]}
                  onPress={() => handlePeriodChange(period.key as 'today' | 'week' | 'month' | 'all')}
                >
                  <Text style={[
                    styles.periodPillText,
                    selectedPeriod === period.key && styles.periodPillTextActive
                  ]}>
                    {period.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* History List */}
      {filteredMovements.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={80} color={isDarkMode ? "#475569" : "#cbd5e1"} />
          <Text style={styles.emptyStateTitle}>No movements found</Text>
          <Text style={styles.emptyStateText}>
            {searchQuery || selectedType !== 'all' || selectedPeriod !== 'all' || selectedDepartment !== 'all'
              ? 'Try adjusting your filters or search terms'
              : 'Start by creating your first stock movement'
            }
          </Text>
          <TouchableOpacity 
            style={styles.emptyStateButton}
            onPress={() => router.push('/stock-movement')}
          >
            <Text style={styles.emptyStateButtonText}>Create Movement</Text>
          </TouchableOpacity>
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
            <TouchableOpacity 
              style={styles.movementCard}
              onPress={() => router.push({
                pathname: "/details/movementDetail",
                params: { movementId: item.id }
              })}
              activeOpacity={0.8}
            >
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={styles.typeSection}>
                  <View style={[styles.typeIndicator, { backgroundColor: getTypeColor(item.type) }]} />
                  <View>
                    <Text style={styles.movementType}>
                      {getTypeIcon(item.type)} {item.type === 'stock_in' ? 'Stock In' : 'Distribution'}
                    </Text>
                    <Text style={styles.movementDate}>{formatShortDate(item.timestamp)}</Text>
                  </View>
                </View>
                <View style={styles.metaSection}>
                  <Text style={styles.time}>{formatTime(item.timestamp)}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
                </View>
              </View>

              {/* Content */}
              <View style={styles.cardContent}>
                <View style={styles.detailsRow}>
                  <Text style={styles.manager}>{item.stockManager}</Text>
                  <Text style={styles.itemCount}>{item.totalItems} items</Text>
                </View>

                {item.type === 'stock_in' && item.supplier && (
                  <View style={styles.supplierRow}>
                    <Text style={styles.supplierLabel}>From:</Text>
                    <Text style={styles.supplier}>{item.supplier}</Text>
                  </View>
                )}

                {item.type === 'distribution' && item.department && (
                  <View style={styles.departmentRow}>
                    <View style={[styles.departmentTag, { backgroundColor: getDepartmentColor(item.department) }]}>
                      <Text style={styles.departmentTagText}>
                        {departments.find(d => d.key === item.department)?.icon} {item.department}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Products Preview */}
                <View style={styles.productsPreview}>
                  {item.products.slice(0, 2).map((product, index) => (
                    <View key={index} style={styles.productPreview}>
                      <Text style={styles.productPreviewName}>{product.productName}</Text>
                      <Text style={styles.productPreviewQuantity}>
                        {product.quantity} {product.unit}
                      </Text>
                    </View>
                  ))}
                  {item.products.length > 2 && (
                    <Text style={styles.moreProducts}>+{item.products.length - 2} more</Text>
                  )}
                </View>

                {/* Total Value */}
                {item.type === 'stock_in' && item.totalValue && item.totalValue > 0 && (
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total Value:</Text>
                    <Text style={styles.totalValue}>${item.totalValue.toFixed(2)}</Text>
                  </View>
                )}

                {/* Notes Preview */}
                {item.notes && (
                  <View style={styles.notesPreview}>
                    <Ionicons name="document-text" size={12} color="#94a3b8" />
                    <Text style={styles.notesPreviewText} numberOfLines={1}>
                      {item.notes}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{title}</Text>
              <View style={styles.sectionLine} />
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isDarkMode ? "#0f172a" : "#f8fafc",
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "#334155" : "#e2e8f0",
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
  },
  headerSubtitle: {
    fontSize: 16,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    marginTop: 4,
  },
  addButton: {
    backgroundColor: '#6366f1',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  statsScroll: {
    marginTop: 16,
  },
  statsContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    padding: 16,
    borderRadius: 16,
    minWidth: 160,
    borderWidth: 1,
    borderColor: isDarkMode ? "#334155" : "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkMode ? 0.1 : 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
  },
  statLabel: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    marginTop: 2,
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
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
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? "#334155" : "#e2e8f0",
    gap: 6,
  },
  filterToggleText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '600',
  },
  filtersPanel: {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: isDarkMode ? "#334155" : "#e2e8f0",
    gap: 20,
  },
  filterGroup: {
    gap: 12,
  },
  filterGroupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  departmentScroll: {
    flexGrow: 0,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#e2e8f0",
  },
  filterPillActive: {
    borderColor: 'transparent',
  },
  filterPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  filterPillTextActive: {
    color: '#ffffff',
  },
  departmentPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
    borderWidth: 2,
    borderColor: 'transparent',
  },
  departmentPillActive: {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
  },
  departmentPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  periodPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#e2e8f0",
  },
  periodPillActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  periodPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  periodPillTextActive: {
    color: '#ffffff',
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginRight: 12,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: isDarkMode ? "#334155" : "#e2e8f0",
  },
  movementCard: {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? "#334155" : "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkMode ? 0.1 : 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 12,
  },
  typeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typeIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  movementType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 2,
  },
  movementDate: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  metaSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  time: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontWeight: '500',
  },
  cardContent: {
    padding: 16,
    paddingTop: 0,
    gap: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  manager: {
    fontSize: 15,
    fontWeight: '600',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
  },
  itemCount: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontWeight: '500',
  },
  supplierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  supplierLabel: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  supplier: {
    fontSize: 14,
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    fontWeight: '500',
  },
  departmentRow: {
    flexDirection: 'row',
  },
  departmentTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  departmentTagText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  productsPreview: {
    gap: 6,
  },
  productPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
    padding: 8,
    borderRadius: 8,
  },
  productPreviewName: {
    fontSize: 14,
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    flex: 1,
  },
  productPreviewQuantity: {
    fontSize: 13,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontWeight: '500',
  },
  moreProducts: {
    fontSize: 13,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: isDarkMode ? "#334155" : "#e2e8f0",
  },
  totalLabel: {
    fontSize: 15,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontWeight: '500',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10b981',
  },
  notesPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: isDarkMode ? "#334155" : "#f0f9ff",
    padding: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#06b6d4',
  },
  notesPreviewText: {
    fontSize: 13,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  emptyStateButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 2,
  },
  productDetails: {
    fontSize: 13,
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  productPrice: {
    color: '#10b981',
    fontWeight: '600',
  },
});