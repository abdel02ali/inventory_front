import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
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
import { departmentService } from '../../services/departmentService';
import { MovementType, ProductSelection, StockMovement, Department as StockMovementDepartment } from "../../services/stockMovmentService";

// Import the Department type from the correct location
import type { Department as ApiDepartment } from '../types/department';

// Use the Department type from stockMovmentService for the hook
type DepartmentFilter = StockMovementDepartment | 'all';

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

// Define the department type for our UI
interface DepartmentConfig {
  key: DepartmentFilter;
  label: string;
  icon: string;
  color: string;
  activeColor: string;
}

export default function HistoryScreen() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const router = useRouter();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<MovementType | 'all'>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentFilter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [departments, setDepartments] = useState<DepartmentConfig[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [lastRefetchTime, setLastRefetchTime] = useState<Date>(new Date());

  const styles = getStyles(isDarkMode);

  // Default department configuration as fallback - using StockMovementDepartment type
  const defaultDepartments: DepartmentConfig[] = [
    { key: 'all', label: 'All', icon: '🏢', color: '#6b7280', activeColor: '#6366f1' },
    { key: 'pastry', label: 'Pastry', icon: '🥐', color: '#f59e0b', activeColor: '#d97706' },
    { key: 'bakery', label: 'Bakery', icon: '🍞', color: '#84cc16', activeColor: '#65a30d' },
    { key: 'cleaning', label: 'Cleaning', icon: '🧹', color: '#06b6d4', activeColor: '#0891b2' },
    { key: 'magazin', label: 'Office', icon: '👔', color: '#8b5cf6', activeColor: '#7c3aed' },
  ];

  // Fetch departments from server and map to StockMovementDepartment
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        setLoadingDepartments(true);
        const serverDepartments = await departmentService.getDepartments();
        
        console.log('📊 Server departments:', serverDepartments); // Debug log
        
        // Transform server departments to match our UI format using StockMovementDepartment
        const transformedDepartments: DepartmentConfig[] = [
          { key: 'all', label: 'All', icon: '🏢', color: '#6b7280', activeColor: '#6366f1' },
        ];

        // Server returns array of Department objects with id, name, icon, color, etc.
        if (Array.isArray(serverDepartments)) {
          serverDepartments.forEach((dept: ApiDepartment) => {
            if (dept && dept.id) {
              // Map the API department ID to a StockMovementDepartment
              const departmentKey = dept.id as StockMovementDepartment;
              
              transformedDepartments.push({
                key: departmentKey,
                label: dept.name || 'Unknown',
                icon: dept.icon || '🏢',
                color: dept.color || '#6366f1',
                activeColor: dept.activeColor || dept.color || '#6366f1',
              });
            }
          });
        }
        
        // Use transformed departments if we have any, otherwise use defaults
        setDepartments(transformedDepartments.length > 1 ? transformedDepartments : defaultDepartments);
      } catch (error) {
        console.error('❌ Failed to fetch departments:', error);
        // Fallback to default departments if server fetch fails
        setDepartments(defaultDepartments);
      } finally {
        setLoadingDepartments(false);
      }
    };

    fetchDepartments();
  }, []);

  // Helper function to extract department ID from movement - IMPROVED VERSION
  const getDepartmentIdFromMovement = (movement: StockMovement): string => {
    if (!movement.department) {
      console.log('🚫 No department found in movement:', movement.id);
      return '';
    }
    
    console.log('🔍 Movement department raw:', movement.department, 'Type:', typeof movement.department);
    
    // If department is a string, return it directly
    if (typeof movement.department === 'string') {
      console.log('📝 Department is string:', movement.department);
      return movement.department;
    }
    
    // If department is an object with an id property, return the id
    if (typeof movement.department === 'object' && movement.department !== null && 'id' in movement.department) {
      const deptId = (movement.department as any).id;
      console.log('🆔 Department object with id:', deptId);
      return deptId;
    }
    
    // If department is an object with a name property, try to find matching department by name
    if (typeof movement.department === 'object' && movement.department !== null && 'name' in movement.department) {
      const deptName = (movement.department as any).name;
      console.log('📛 Department object with name:', deptName);
      
      // Try to find a department with matching name
      const foundDept = departments.find(d => 
        d.label.toLowerCase() === deptName.toLowerCase() ||
        d.key.toLowerCase() === deptName.toLowerCase()
      );
      if (foundDept) {
        console.log('✅ Found matching department by name:', foundDept.key);
        return foundDept.key;
      }
      console.log('❌ No matching department found for name:', deptName);
      return deptName; // Return name as fallback
    }
    
    // Fallback: stringify the object for debugging
    console.warn('⚠️ Unknown department format:', movement.department);
    return JSON.stringify(movement.department);
  };

  // Update hook to use current filters - using the correct Department type
  const { 
    movements, 
    loading, 
    error, 
    pagination, 
    fetchMovements,
    refetch 
  } = useStockMovements({
    type: selectedType !== 'all' ? selectedType : undefined,
    department: selectedDepartment !== 'all' ? selectedDepartment as StockMovementDepartment : undefined,
    page: 1,
    limit: 100 // Increased limit to get more data
  });

  // Refetch data when filters change
  useEffect(() => {
    console.log('🔄 Refetching with filters:', {
      type: selectedType,
      department: selectedDepartment,
      movementsCount: movements.length
    });
    refetch();
  }, [selectedType, selectedDepartment]);

  // Use focus effect to refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('🎯 Screen focused, refreshing data...');
      refetch();
      setLastRefetchTime(new Date());
    }, [refetch])
  );

  // Show error alert if there's an error
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
    }
  }, [error]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      console.log('🔄 Manual refresh triggered');
      await refetch();
      setLastRefetchTime(new Date());
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
      (movement.department && getDepartmentIdFromMovement(movement).toLowerCase().includes(searchQuery.toLowerCase()));

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

  // Debug: Log department filtering info
  useEffect(() => {
    if (selectedDepartment !== 'all' && movements.length > 0) {
      console.log('🔍 Department Filter Debug:');
      console.log('Selected Department:', selectedDepartment);
      console.log('Total movements from API:', movements.length);
      console.log('Available departments:', departments.map(d => ({ key: d.key, label: d.label })));
      
      movements.forEach((movement, index) => {
        const deptId = getDepartmentIdFromMovement(movement);
        const matches = deptId === selectedDepartment;
        console.log(`Movement ${index + 1}:`, {
          id: movement.id,
          type: movement.type,
          departmentRaw: movement.department,
          extractedDeptId: deptId,
          matches: matches,
          movementType: movement.type
        });
      });

      const matchingMovements = movements.filter(movement => 
        getDepartmentIdFromMovement(movement) === selectedDepartment
      );
      console.log(`✅ Movements matching department ${selectedDepartment}:`, matchingMovements.length);
    }
  }, [selectedDepartment, movements, departments]);

  // Debug: Log all movements when they load
  useEffect(() => {
    if (movements.length > 0) {
      console.log('📦 All loaded movements:', movements.map(m => ({
        id: m.id,
        type: m.type,
        department: m.department,
        extractedDept: getDepartmentIdFromMovement(m),
        products: m.products.length
      })));
    }
  }, [movements]);

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

  // Statistics - based on filtered movements
  const totalMovements = filteredMovements.length;
  const totalStockIn = filteredMovements.filter((m: StockMovement) => m.type === 'stock_in').length;
  const totalDistributions = filteredMovements.filter((m: StockMovement) => m.type === 'distribution').length;

  const formatTime = (timestamp: any) => {
    const date = convertFirestoreTimestamp(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getTypeColor = (type: MovementType) => {
    return type === 'stock_in' ? '#10b981' : '#ef4444';
  };

  const getTypeIcon = (type: MovementType) => {
    return type === 'stock_in' ? '📥' : '📤';
  };

  const getDepartmentColor = (movement: StockMovement): string => {
    const departmentId = getDepartmentIdFromMovement(movement);
    if (!departmentId) return '#6b7280';
    
    const dept = departments.find(d => d.key === departmentId);
    return dept?.color || '#6366f1';
  };

  const getDepartmentDisplay = (movement: StockMovement): string => {
    const departmentId = getDepartmentIdFromMovement(movement);
    
    const dept = departments.find(d => d.key === departmentId);
    if (dept) {
      return `${dept.icon} ${dept.label}`;
    }
    
    // Fallback: if we have a department object with name, use that
    if (typeof movement.department === 'object' && movement.department !== null && 'name' in movement.department) {
      return `🏢 ${(movement.department as any).name}`;
    }
    
    // Final fallback
    return `🏢 ${departmentId}`;
  };

  const renderProductItem = (product: ProductSelection, index: number) => {
    return (
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
  };

  // Handle filter changes
  const handleTypeChange = (type: MovementType | 'all') => {
    setSelectedType(type);
  };

  const handleDepartmentChange = (department: DepartmentFilter) => {
    console.log('🏭 Department filter changed to:', department);
    setSelectedDepartment(department);
  };

  const handlePeriodChange = (period: 'today' | 'week' | 'month' | 'all') => {
    setSelectedPeriod(period);
  };

  // Force refresh function
  const forceRefresh = () => {
    console.log('🔄 Force refreshing data...');
    refetch();
    setLastRefetchTime(new Date());
  };

  if ((loading && !refreshing) || loadingDepartments) {
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
        <TouchableOpacity style={styles.retryButton} onPress={forceRefresh}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Add Button */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>📦 Stock History</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.refreshButton} onPress={forceRefresh}>
              <Ionicons name="refresh" size={18} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => router.push('/stock-movement')}
            >
              <Ionicons name="add-circle" size={20} color="#ffffff" />
              <Text style={styles.addButtonText}>New Movement</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.headerSubtitle}>Track all stock movements</Text>
        <Text style={styles.lastUpdated}>
          Last updated: {lastRefetchTime.toLocaleTimeString()}
        </Text>
      </View>

      {/* Statistics */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalMovements}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#10b981' }]}>{totalStockIn}</Text>
          <Text style={styles.statLabel}>Stock In</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#ef4444' }]}>{totalDistributions}</Text>
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
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.filterScroll}
          contentContainerStyle={styles.filterScrollContent}
        >
          {[
            { key: 'all', label: 'All', icon: '📊' },
            { key: 'stock_in', label: 'Stock In', icon: '📥' },
            { key: 'distribution', label: 'Distribute', icon: '📤' }
          ].map((type) => (
            <TouchableOpacity
              key={type.key}
              style={[
                styles.filterButton,
                selectedType === type.key && [
                  styles.filterButtonActive,
                  { backgroundColor: type.key === 'stock_in' ? '#10b981' : type.key === 'distribution' ? '#ef4444' : '#6366f1' }
                ]
              ]}
              onPress={() => handleTypeChange(type.key as MovementType | 'all')}
            >
              <Text style={[
                styles.filterButtonText,
                selectedType === type.key && styles.filterButtonTextActive
              ]}>
                {type.icon} {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Department Filter */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.filterScroll}
          contentContainerStyle={styles.filterScrollContent}
        >
          {departments.map((dept) => (
            <TouchableOpacity
              key={dept.key}
              style={[
                styles.departmentButton,
                selectedDepartment === dept.key && [
                  styles.departmentButtonActive,
                  { borderLeftColor: dept.activeColor, backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc' }
                ]
              ]}
              onPress={() => handleDepartmentChange(dept.key)}
            >
              <Text style={[
                styles.departmentButtonText,
                selectedDepartment === dept.key && [styles.departmentButtonTextActive, { color: dept.activeColor }]
              ]}>
                {dept.icon} {dept.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Period Filter */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.filterScroll}
          contentContainerStyle={styles.filterScrollContent}
        >
          {[
            { key: 'today', label: 'Today' },
            { key: 'week', label: 'Week' },
            { key: 'month', label: 'Month' },
            { key: 'all', label: 'All Time' }
          ].map((period) => (
            <TouchableOpacity
              key={period.key}
              style={[
                styles.periodButton,
                selectedPeriod === period.key && styles.periodButtonActive
              ]}
              onPress={() => handlePeriodChange(period.key as 'today' | 'week' | 'month' | 'all')}
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

      {/* Debug Info */}
      <View style={styles.debugContainer}>
        <Text style={styles.debugText}>
          📊 Loaded: {movements.length} movements • 
          Filtered: {filteredMovements.length} • 
          Department: {selectedDepartment} • 
          Type: {selectedType}
        </Text>
        <TouchableOpacity onPress={forceRefresh} style={styles.debugRefreshButton}>
          <Ionicons name="refresh" size={12} color="#6366f1" />
        </TouchableOpacity>
      </View>

      {/* History List */}
      {filteredMovements.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={64} color={isDarkMode ? "#475569" : "#cbd5e1"} />
          <Text style={styles.emptyStateTitle}>No movements found</Text>
          <Text style={styles.emptyStateText}>
            {searchQuery || selectedType !== 'all' || selectedPeriod !== 'all' || selectedDepartment !== 'all'
              ? 'Try adjusting your filters'
              : 'No stock movements recorded yet'
            }
          </Text>
          <TouchableOpacity style={styles.emptyStateButton} onPress={forceRefresh}>
            <Text style={styles.emptyStateButtonText}>Refresh Data</Text>
          </TouchableOpacity>
          <Text style={styles.debugHint}>
            Debug: API returned {movements.length} movements
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
            <TouchableOpacity 
              style={styles.historyItem}
              onPress={() => router.push({
                pathname: "/details/movementDetail",
                params: { movementId: item.id }
              })}
              activeOpacity={0.7}
            >
              {/* Item Header */}
              <View style={styles.itemHeader}>
                <View style={styles.typeInfo}>
                  <View style={[styles.typeBadge, { backgroundColor: getTypeColor(item.type) }]}>
                    <Text style={styles.typeBadgeText}>
                      {getTypeIcon(item.type)} {item.type === 'stock_in' ? 'IN' : 'OUT'}
                    </Text>
                  </View>
                  <Text style={styles.itemCount}>{item.totalItems} items</Text>
                  
                  {/* Supplier for stock in */}
                  {item.type === 'stock_in' && item.supplier && (
                    <Text style={styles.supplier}>from {item.supplier}</Text>
                  )}
                  
                  {/* Department for distribution */}
                  {item.type === 'distribution' && item.department && (
                    <View style={[styles.departmentBadge, { backgroundColor: getDepartmentColor(item) }]}>
                      <Text style={styles.departmentBadgeText}>
                        {getDepartmentDisplay(item)}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.itemMeta}>
                  <Text style={styles.manager}>{item.stockManager}</Text>
                  <Text style={styles.time}>{formatTime(item.timestamp)}</Text>
                </View>
              </View>

              {/* Products List */}
              <View style={styles.productsList}>
                {item.products.map((product, index) => renderProductItem(product, index))}
              </View>

              {/* Total Value for Stock In */}
              {item.type === 'stock_in' && item.totalValue && item.totalValue > 0 && (
                <View style={styles.totalValueContainer}>
                  <Text style={styles.totalValueLabel}>Total: </Text>
                  <Text style={styles.totalValue}>${item.totalValue.toFixed(2)}</Text>
                </View>
              )}

              {/* Notes */}
              {item.notes && (
                <View style={styles.notesContainer}>
                  <Text style={styles.notesLabel}>📝 </Text>
                  <Text style={styles.notes}>{item.notes}</Text>
                </View>
              )}

              {/* Optional: Add a visual indicator that this is clickable */}
              <View style={styles.clickIndicator}>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </View>
            </TouchableOpacity>
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
    marginBottom: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#e0e7ff',
    opacity: 0.9,
  },
  lastUpdated: {
    fontSize: 11,
    color: '#e0e7ff',
    opacity: 0.7,
    marginTop: 4,
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
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    marginTop: -32,
  },
  statCard: {
    flex: 1,
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    marginHorizontal: 4,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkMode ? 0.1 : 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: isDarkMode ? "#94a3b8" : "#64748b",
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
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? "#334155" : "#e2e8f0",
    marginBottom: 4,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    fontSize: 15,
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: isDarkMode ? "#334155" : "#f1f5f9",
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#e2e8f0",
  },
  filterButtonActive: {
    borderColor: 'transparent',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },
  departmentButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    borderWidth: 1,
    borderColor: isDarkMode ? "#334155" : "#e2e8f0",
    borderLeftWidth: 3,
  },
  departmentButtonActive: {
    borderWidth: 1,
    borderLeftWidth: 3,
  },
  departmentButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  departmentButtonTextActive: {
    fontWeight: '700',
  },
  periodButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: isDarkMode ? "#334155" : "#f1f5f9",
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#e2e8f0",
  },
  periodButtonActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  periodButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  periodButtonTextActive: {
    color: '#ffffff',
  },
  debugContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: isDarkMode ? "#1e293b" : "#e0f2fe",
    marginHorizontal: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
  },
  debugText: {
    fontSize: 12,
    color: isDarkMode ? "#94a3b8" : "#0369a1",
    fontStyle: 'italic',
    flex: 1,
  },
  debugRefreshButton: {
    padding: 4,
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
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
  },
  historyItem: {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: isDarkMode ? "#334155" : "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDarkMode ? 0.1 : 0.03,
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
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontWeight: '600',
    marginBottom: 2,
  },
  supplier: {
    fontSize: 11,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontStyle: 'italic',
  },
  departmentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  departmentBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  itemMeta: {
    alignItems: 'flex-end',
  },
  manager: {
    fontSize: 11,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontWeight: '600',
    marginBottom: 2,
  },
  time: {
    fontSize: 11,
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  productsList: {
    gap: 4,
    marginBottom: 10,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#e2e8f0",
  },
  productQuantity: {
    fontSize: 13,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginRight: 8,
    minWidth: 60,
  },
  productName: {
    fontSize: 13,
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
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
    borderTopColor: isDarkMode ? "#334155" : "#e2e8f0",
  },
  totalValueLabel: {
    fontSize: 13,
    color: isDarkMode ? "#94a3b8" : "#64748b",
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
    backgroundColor: isDarkMode ? "#334155" : "#f0f9ff",
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
    fontSize: 16,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 13,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyStateButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  emptyStateButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  debugHint: {
    fontSize: 12,
    color: '#f59e0b',
    marginTop: 8,
    textAlign: 'center',
  },
  clickIndicator: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -8,
  },
});