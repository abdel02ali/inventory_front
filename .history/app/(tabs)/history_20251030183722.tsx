import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
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

// Custom debounce hook
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export default function HistoryScreen() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const router = useRouter();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<MovementType | 'all'>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'custom' | 'all'>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentFilter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [departments, setDepartments] = useState<DepartmentConfig[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [initialLoad, setInitialLoad] = useState(true);
  
  // Date picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'start' | 'end'>('start');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [tempStartDate, setTempStartDate] = useState<Date>(new Date());
  const [tempEndDate, setTempEndDate] = useState<Date>(new Date());

  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const styles = getStyles(isDarkMode);

  // Default department configuration as fallback
  const defaultDepartments: DepartmentConfig[] = [
    { key: 'all', label: 'All', icon: '🏢', color: '#6b7280', activeColor: '#6366f1' },
    { key: 'pastry', label: 'Pastry', icon: '🥐', color: '#f59e0b', activeColor: '#d97706' },
    { key: 'bakery', label: 'Bakery', icon: '🍞', color: '#84cc16', activeColor: '#65a30d' },
    { key: 'cleaning', label: 'Cleaning', icon: '🧹', color: '#06b6d4', activeColor: '#0891b2' },
    { key: 'magazin', label: 'Office', icon: '👔', color: '#8b5cf6', activeColor: '#7c3aed' },
  ];

  // Fetch departments - SIMPLIFIED VERSION
  const fetchDepartments = async () => {
    try {
      setLoadingDepartments(true);
      const serverDepartments = await departmentService.getDepartments();
      
      console.log('📊 Server departments:', serverDepartments);
      
      // Transform server departments to match our UI format
      const transformedDepartments: DepartmentConfig[] = [
        { key: 'all', label: 'All', icon: '🏢', color: '#6b7280', activeColor: '#6366f1' },
      ];

      if (Array.isArray(serverDepartments)) {
        serverDepartments.forEach((dept: ApiDepartment) => {
          if (dept && dept.id) {
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
      
      setDepartments(transformedDepartments.length > 1 ? transformedDepartments : defaultDepartments);
    } catch (error) {
      console.error('❌ Failed to fetch departments:', error);
      setDepartments(defaultDepartments);
    } finally {
      setLoadingDepartments(false);
    }
  };

  // Fetch departments on component mount
  useEffect(() => {
    fetchDepartments();
  }, []);

  // Refresh departments function
  const refreshDepartments = async () => {
    await fetchDepartments();
  };

  // Helper function to extract department ID from movement
  const getDepartmentIdFromMovement = (movement: StockMovement): string => {
    if (!movement.department) return '';
    
    if (typeof movement.department === 'string') {
      return movement.department;
    }
    
    if (typeof movement.department === 'object' && movement.department !== null && 'id' in movement.department) {
      return (movement.department as any).id;
    }
    
    if (typeof movement.department === 'object' && movement.department !== null && 'name' in movement.department) {
      const deptName = (movement.department as any).name;
      const foundDept = departments.find(d => 
        d.label.toLowerCase() === deptName.toLowerCase() ||
        d.key.toLowerCase() === deptName.toLowerCase()
      );
      if (foundDept) {
        return foundDept.key;
      }
      return deptName;
    }
    
    return JSON.stringify(movement.department);
  };

  // Update hook to use current filters
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

  // Enhanced refresh function that updates lastUpdated timestamp
  const enhancedRefetch = async () => {
    try {
      await refetch();
      setLastUpdated(new Date()); // Update last updated timestamp
    } catch (error) {
      console.error('Refetch error:', error);
      throw error;
    }
  };

  // Auto-refresh when filters change (but not on initial load)
  useEffect(() => {
    if (!initialLoad && !loading) {
      const timeoutId = setTimeout(() => {
        enhancedRefetch();
      }, 300); // Small delay to avoid too many rapid requests
      
      return () => clearTimeout(timeoutId);
    }
  }, [selectedType, selectedDepartment]);

  // Mark initial load as complete once data is loaded
  useEffect(() => {
    if (!loading && !loadingDepartments) {
      setInitialLoad(false);
    }
  }, [loading, loadingDepartments]);

  // Refresh function for both movements and departments
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        enhancedRefetch(),
        refreshDepartments()
      ]);
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Manual refresh function
  const handleManualRefresh = async () => {
    await handleRefresh();
  };

  // Date picker functions
  const handleCustomDateSelect = () => {
    // Initialize with current dates or existing selected dates
    setTempStartDate(startDate || new Date());
    setTempEndDate(endDate || new Date());
    setDatePickerMode('start');
    setShowDatePicker(true);
  };

  const handleStartDateSelect = () => {
    setDatePickerMode('start');
  };

  const handleEndDateSelect = () => {
    setDatePickerMode('end');
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (selectedDate) {
      if (datePickerMode === 'start') {
        setTempStartDate(selectedDate);
        // Auto-advance to end date selection
        if (Platform.OS === 'ios') {
          setDatePickerMode('end');
        }
      } else {
        setTempEndDate(selectedDate);
      }
    }
  };

  const applyDateFilter = () => {
    setStartDate(tempStartDate);
    setEndDate(tempEndDate);
    setSelectedPeriod('custom');
    setShowDatePicker(false);
  };

  const clearDateFilter = () => {
    setStartDate(null);
    setEndDate(null);
    setSelectedPeriod('all');
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format time for last updated
  const formatLastUpdated = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter movements locally based on search, period, and date range
  const filteredMovements = movements.filter((movement: StockMovement) => {
    const movementDate = convertFirestoreTimestamp(movement.timestamp);
    
    // Search filter with debounced query - IMPROVED SEARCH
    const matchesSearch = debouncedSearchQuery === '' || 
      movement.products.some((product: ProductSelection) => 
        product.productName.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        (product.productId && product.productId.toLowerCase().includes(debouncedSearchQuery.toLowerCase()))
      ) ||
      movement.stockManager.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      (movement.supplier && movement.supplier.toLowerCase().includes(debouncedSearchQuery.toLowerCase())) ||
      (movement.department && getDepartmentIdFromMovement(movement).toLowerCase().includes(debouncedSearchQuery.toLowerCase())) ||
      (movement.notes && movement.notes.toLowerCase().includes(debouncedSearchQuery.toLowerCase()));

    // Period and Date filter
    const now = new Date();
    let matchesDate = true;

    switch (selectedPeriod) {
      case 'today':
        matchesDate = movementDate.toDateString() === now.toDateString();
        break;
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchesDate = movementDate >= weekAgo;
        break;
      case 'month':
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        matchesDate = movementDate >= monthAgo;
        break;
      case 'custom':
        if (startDate && endDate) {
          // Set time to start and end of day for proper date range comparison
          const startOfDay = new Date(startDate);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(endDate);
          endOfDay.setHours(23, 59, 59, 999);
          matchesDate = movementDate >= startOfDay && movementDate <= endOfDay;
        }
        break;
      default:
        matchesDate = true;
    }

    return matchesSearch && matchesDate;
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
    
    if (typeof movement.department === 'object' && movement.department !== null && 'name' in movement.department) {
      return `🏢 ${(movement.department as any).name}`;
    }
    
    return `🏢 ${departmentId}`;
  };

  // Fixed renderProductItem function
  const renderProductItem = (product: ProductSelection) => {
    return (
      <View style={styles.productItem}>
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

  // Date Picker Modal
  const renderDatePickerModal = () => {
    if (!showDatePicker) return null;

    return (
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.datePickerOverlay}>
          <View style={styles.datePickerContainer}>
            <Text style={styles.datePickerTitle}>Select Date Range</Text>
            
            {/* Date Selection Buttons */}
            <View style={styles.dateSelectionContainer}>
              <TouchableOpacity 
                style={[
                  styles.dateSelectionButton,
                  datePickerMode === 'start' && styles.dateSelectionButtonActive
                ]}
                onPress={handleStartDateSelect}
              >
                <Text style={[
                  styles.dateSelectionButtonText,
                  datePickerMode === 'start' && styles.dateSelectionButtonTextActive
                ]}>
                  Start Date
                </Text>
                <Text style={styles.dateSelectionDateText}>
                  {formatDate(tempStartDate)}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.dateSelectionButton,
                  datePickerMode === 'end' && styles.dateSelectionButtonActive
                ]}
                onPress={handleEndDateSelect}
              >
                <Text style={[
                  styles.dateSelectionButtonText,
                  datePickerMode === 'end' && styles.dateSelectionButtonTextActive
                ]}>
                  End Date
                </Text>
                <Text style={styles.dateSelectionDateText}>
                  {formatDate(tempEndDate)}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Date Picker */}
            <DateTimePicker
              value={datePickerMode === 'start' ? tempStartDate : tempEndDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
              style={styles.datePicker}
              textColor={isDarkMode ? "#ffffff" : "#000000"}
            />

            {/* Action Buttons */}
            <View style={styles.datePickerActions}>
              <TouchableOpacity 
                style={styles.datePickerCancel}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.datePickerCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.datePickerApply}
                onPress={applyDateFilter}
                disabled={tempStartDate > tempEndDate}
              >
                <Text style={styles.datePickerApplyText}>
                  Apply Date Range
                </Text>
              </TouchableOpacity>
            </View>

            {tempStartDate > tempEndDate && (
              <Text style={styles.dateErrorText}>
                Start date cannot be after end date
              </Text>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  // Show loading screen only during initial load
  if (initialLoad) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading stock history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Add Button */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Stock History</Text>
          <View style={styles.headerActions}>
            
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => router.push('/details/stock-movement')}
            >
              <Ionicons name="add-circle" size={20} color="#ffffff" />
              <Text style={styles.addButtonText}>New Movement</Text>
            </TouchableOpacity>
          </View>
        </View>
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

      {/* Refresh Indicator - Only show for subsequent refreshes, not initial load */}
      {refreshing && (
        <View style={styles.refreshIndicator}>
          <ActivityIndicator size="small" color="#6366f1" />
          <Text style={styles.refreshIndicatorText}>Updating data...</Text>
        </View>
      )}

      {/* Last Updated Info */}


      {/* Filters */}
      <View style={styles.filtersContainer}>
        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={isDarkMode ? "#94a3b8" : "#64748b"} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products, managers, suppliers, notes..."
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
              onPress={() => setSelectedType(type.key as MovementType | 'all')}
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
        <View style={styles.departmentHeader}>
          <Text style={styles.filterLabel}>Departments</Text>
          
        </View>
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
              onPress={() => setSelectedDepartment(dept.key)}
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

        {/* Period Filter with Date Range */}
        <View style={styles.periodHeader}>
          <Text style={styles.filterLabel}>Time Period</Text>
          {selectedPeriod === 'custom' && startDate && endDate && (
            <TouchableOpacity onPress={clearDateFilter} style={styles.clearDateButton}>
              <Text style={styles.clearDateButtonText}>
                {formatDate(startDate)} - {formatDate(endDate)} ✕
              </Text>
            </TouchableOpacity>
          )}
        </View>
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
            { key: 'custom', label: 'Custom Date' },
            { key: 'all', label: 'All Time' }
          ].map((period) => (
            <TouchableOpacity
              key={period.key}
              style={[
                styles.periodButton,
                selectedPeriod === period.key && styles.periodButtonActive
              ]}
              onPress={() => {
                if (period.key === 'custom') {
                  handleCustomDateSelect();
                } else {
                  setSelectedPeriod(period.key as 'today' | 'week' | 'month' | 'custom' | 'all');
                  setStartDate(null);
                  setEndDate(null);
                }
              }}
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

      {/* Date Picker Modal */}
      {renderDatePickerModal()}

      {/* History List */}
      {filteredMovements.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={64} color={isDarkMode ? "#475569" : "#cbd5e1"} />
          <Text style={styles.emptyStateTitle}>No movements found</Text>
          <Text style={styles.emptyStateText}>
            {searchQuery || selectedType !== 'all' || selectedPeriod !== 'all' || selectedDepartment !== 'all'
              ? 'Try adjusting your filters or search query'
              : 'No stock movements recorded yet'
            }
          </Text>
          <TouchableOpacity style={styles.emptyStateButton} onPress={handleManualRefresh}>
            <Text style={styles.emptyStateButtonText}>Refresh Data</Text>
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
              onRefresh={handleRefresh}
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
                {item.products.map((product, index) => (
                  <View key={`${product.productId}-${index}`}>
                    {renderProductItem(product)}
                  </View>
                ))}
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

// ... keep the same getStyles function as before ...

const getStyles = (isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDarkMode ? "#121212" : "#f8fafc",
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
    padding: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#6366f1',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  // Add the missing refreshHeaderButton style
  refreshHeaderButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
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
    marginTop: -30,
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
  // Refresh Indicator Styles
  refreshIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    padding: 8,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: isDarkMode ? "#334155" : "#e2e8f0",
  },
  refreshIndicatorText: {
    fontSize: 12,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    marginLeft: 8,
    fontWeight: '500',
  },
  lastUpdatedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  lastUpdatedText: {
    fontSize: 11,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    marginLeft: 4,
  },
  filtersContainer: {
    padding: 16,
    gap: 8,
  },
  departmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  periodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
  },
  refreshSmallButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: isDarkMode ? "#334155" : "#f1f5f9",
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#e2e8f0",
  },
  clearDateButton: {
    backgroundColor: isDarkMode ? "#334155" : "#f1f5f9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#e2e8f0",
  },
  clearDateButtonText: {
    fontSize: 11,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontWeight: '600',
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
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? "#334155" : "#e2e8f0",
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
  // Date Picker Styles
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  datePickerContainer: {
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    padding: 20,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 20,
    textAlign: 'center',
  },
  dateSelectionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10,
  },
  dateSelectionButton: {
    flex: 1,
    backgroundColor: isDarkMode ? "#334155" : "#f1f5f9",
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  dateSelectionButtonActive: {
    borderColor: '#6366f1',
    backgroundColor: isDarkMode ? "#3730a3" : "#e0e7ff",
  },
  dateSelectionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? "#94a3b8" : "#64748b",
    marginBottom: 5,
  },
  dateSelectionButtonTextActive: {
    color: '#6366f1',
  },
  dateSelectionDateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
  },
  datePicker: {
    height: Platform.OS === 'ios' ? 200 : undefined,
    marginBottom: 20,
  },
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  datePickerCancel: {
    flex: 1,
    backgroundColor: isDarkMode ? "#334155" : "#f1f5f9",
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  datePickerCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  datePickerApply: {
    flex: 2,
    backgroundColor: '#6366f1',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  datePickerApplyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  dateErrorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    fontWeight: '600',
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