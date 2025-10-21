// app/history.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    SectionList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';
import AddStockButton from '../../components/add-stock-button';

type Department = 'pastry' | 'bakery' | 'cleaning' | 'management';

type StockItem = {
  productId: string;
  productName: string;
  quantity: number;
  unit?: string;
  price?: number;
};

type HistoryItem = {
  id: string;
  type: 'stock_in' | 'distribution'; // Stock in or distribution out
  date: string;
  stockManager: string;
  department?: Department; // Only for distributions
  items: StockItem[]; // Multiple products in one transaction
  totalItems: number;
  totalValue?: number;
  notes?: string;
  supplier?: string; // Only for stock in
};

type SectionData = {
  title: string;
  data: HistoryItem[];
};

export default function HistoryScreen() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'stock_in' | 'distribution'>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [selectedDepartment, setSelectedDepartment] = useState<Department | 'all'>('all');

  const styles = getStyles(isDarkMode);

  // Department configuration
  const departments: { key: Department | 'all'; label: string; icon: string; color: string }[] = [
    { key: 'all', label: 'All Departments', icon: '🏢', color: '#6366f1' },
    { key: 'pastry', label: 'Pastry', icon: '🥐', color: '#f59e0b' },
    { key: 'bakery', label: 'Bakery', icon: '🍞', color: '#84cc16' },
    { key: 'cleaning', label: 'Cleaning', icon: '🧹', color: '#06b6d4' },
    { key: 'management', label: 'Management', icon: '👔', color: '#8b5cf6' },
  ];

  // Mock data representing both stock in and distributions
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      
      // Mock data including both stock in and distributions
      const mockHistory: HistoryItem[] = [
        // TODAY - Stock In (Products added to stock)
        {
          id: 'stock-1',
          type: 'stock_in',
          date: new Date().toISOString(),
          stockManager: 'Ahmed',
          totalItems: 3,
          totalValue: 450,
          supplier: 'Local Supplier',
          items: [
            { productId: '1', productName: 'Flour', quantity: 10, unit: 'bags', price: 200 },
            { productId: '2', productName: 'Sugar', quantity: 5, unit: 'kg', price: 150 },
            { productId: '3', productName: 'Butter', quantity: 8, unit: 'kg', price: 100 }
          ],
          notes: 'Weekly baking supplies delivery'
        },
        {
          id: 'stock-2',
          type: 'stock_in',
          date: new Date().toISOString(),
          stockManager: 'Ahmed',
          totalItems: 2,
          totalValue: 120,
          supplier: 'Cleaning Supplies Co.',
          items: [
            { productId: '4', productName: 'Disinfectant', quantity: 4, unit: 'bottles', price: 80 },
            { productId: '5', productName: 'Hand Soap', quantity: 6, unit: 'bottles', price: 40 }
          ],
          notes: 'Monthly cleaning supplies'
        },

        // TODAY - Distributions (Products out to departments)
        {
          id: 'dist-1',
          type: 'distribution',
          date: new Date().toISOString(),
          stockManager: 'Ahmed',
          department: 'bakery',
          totalItems: 2,
          items: [
            { productId: '1', productName: 'Flour', quantity: 2, unit: 'bags' },
            { productId: '6', productName: 'Sel', quantity: 1, unit: 'kg' }
          ],
          notes: 'Morning baking supplies'
        },
        {
          id: 'dist-2',
          type: 'distribution',
          date: new Date().toISOString(),
          stockManager: 'Ahmed',
          department: 'pastry',
          totalItems: 3,
          items: [
            { productId: '7', productName: 'Chocolate Bar', quantity: 3, unit: 'units' },
            { productId: '1', productName: 'Flour', quantity: 1, unit: 'kg' },
            { productId: '8', productName: 'Vanille', quantity: 2, unit: 'bottles' }
          ],
          notes: 'Pastry production batch'
        },
        {
          id: 'dist-3',
          type: 'distribution',
          date: new Date().toISOString(),
          stockManager: 'Ahmed',
          department: 'management',
          totalItems: 1,
          items: [
            { productId: '9', productName: 'Boxes', quantity: 3, unit: 'units' }
          ],
          notes: 'Packaging supplies'
        },
        {
          id: 'dist-4',
          type: 'distribution',
          date: new Date().toISOString(),
          stockManager: 'Ahmed',
          department: 'cleaning',
          totalItems: 1,
          items: [
            { productId: '4', productName: 'Disinfectant', quantity: 1, unit: 'bottle' }
          ],
          notes: 'Cleaning supplies restock'
        },

        // YESTERDAY - Stock In
        {
          id: 'stock-3',
          type: 'stock_in',
          date: new Date(Date.now() - 86400000).toISOString(),
          stockManager: 'Ahmed',
          totalItems: 2,
          totalValue: 180,
          supplier: 'Office Depot',
          items: [
            { productId: '10', productName: 'Printer Paper', quantity: 5, unit: 'reams', price: 100 },
            { productId: '11', productName: 'Pens', quantity: 20, unit: 'units', price: 80 }
          ],
          notes: 'Office supplies restock'
        },

        // YESTERDAY - Distributions
        {
          id: 'dist-5',
          type: 'distribution',
          date: new Date(Date.now() - 86400000).toISOString(),
          stockManager: 'Ahmed',
          department: 'bakery',
          totalItems: 3,
          items: [
            { productId: '1', productName: 'Flour', quantity: 3, unit: 'bags' },
            { productId: '12', productName: 'Yeast', quantity: 2, unit: 'packs' },
            { productId: '6', productName: 'Sel', quantity: 1, unit: 'kg' }
          ],
          notes: 'Bread production'
        },

        // THIS WEEK - Stock In
        {
          id: 'stock-4',
          type: 'stock_in',
          date: new Date(Date.now() - 172800000).toISOString(),
          stockManager: 'Ahmed',
          totalItems: 1,
          totalValue: 300,
          supplier: 'Bakery Supplies',
          items: [
            { productId: '13', productName: 'Chocolate Chips', quantity: 10, unit: 'kg', price: 300 }
          ],
          notes: 'Special order for cookies'
        }
      ];

      setHistory(mockHistory);
      setFilteredHistory(mockHistory);
    } catch (error) {
      console.error('Error loading history:', error);
      Alert.alert('Error', 'Failed to load stock history');
    } finally {
      setLoading(false);
    }
  };

  // Filter history based on search and filters
  useEffect(() => {
    let filtered = history;

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(item => item.type === selectedType);
    }

    // Filter by department (only for distributions)
    if (selectedDepartment !== 'all') {
      filtered = filtered.filter(item => 
        item.type === 'distribution' ? item.department === selectedDepartment : true
      );
    }

    // Filter by period
    const now = new Date();
    switch (selectedPeriod) {
      case 'today':
        filtered = filtered.filter(item => {
          const itemDate = new Date(item.date);
          return itemDate.toDateString() === now.toDateString();
        });
        break;
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 86400000);
        filtered = filtered.filter(item => new Date(item.date) >= weekAgo);
        break;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 86400000);
        filtered = filtered.filter(item => new Date(item.date) >= monthAgo);
        break;
      // 'all' shows everything
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.type.toLowerCase().includes(query) ||
        item.stockManager.toLowerCase().includes(query) ||
        item.notes?.toLowerCase().includes(query) ||
        item.supplier?.toLowerCase().includes(query) ||
        (item.type === 'distribution' && item.department?.toLowerCase().includes(query)) ||
        item.items.some(product => 
          product.productName.toLowerCase().includes(query)
        )
      );
    }

    setFilteredHistory(filtered);
  }, [history, searchQuery, selectedType, selectedPeriod, selectedDepartment]);

  // Group history by date for section list
  const groupedHistory = filteredHistory.reduce((acc: { [key: string]: HistoryItem[] }, item) => {
    const date = new Date(item.date).toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(item);
    return acc;
  }, {});

  const sectionData: SectionData[] = Object.entries(groupedHistory)
    .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
    .map(([title, data]) => ({
      title,
      data: data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }));

  // Statistics
  const totalStockIn = filteredHistory.filter(item => item.type === 'stock_in').length;
  const totalDistributions = filteredHistory.filter(item => item.type === 'distribution').length;
  const totalProductsIn = filteredHistory
    .filter(item => item.type === 'stock_in')
    .reduce((sum, item) => sum + item.items.reduce((itemSum, product) => itemSum + product.quantity, 0), 0);
  const totalProductsOut = filteredHistory
    .filter(item => item.type === 'distribution')
    .reduce((sum, item) => sum + item.items.reduce((itemSum, product) => itemSum + product.quantity, 0), 0);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatCurrency = (amount: number) => {
    return `${amount?.toFixed(2) || '0.00'} MAD`;
  };

  const getTypeColor = (type: 'stock_in' | 'distribution') => {
    return type === 'stock_in' ? '#10b981' : '#ef4444';
  };

  const getTypeIcon = (type: 'stock_in' | 'distribution') => {
    return type === 'stock_in' ? '📥' : '📤';
  };

  const getDepartmentColor = (department?: Department) => {
    if (!department) return '#6b7280';
    const dept = departments.find(d => d.key === department);
    return dept?.color || '#6366f1';
  };

  if (loading) {
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
      <AddStockButton />

      {/* Statistics */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalStockIn}</Text>
          <Text style={styles.statLabel}>Stock In</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalDistributions}</Text>
          <Text style={styles.statLabel}>Distributions</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#10b981' }]}>+{totalProductsIn}</Text>
          <Text style={styles.statLabel}>Products In</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#ef4444' }]}>-{totalProductsOut}</Text>
          <Text style={styles.statLabel}>Products Out</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={isDarkMode ? "#94a3b8" : "#64748b"} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products, suppliers, departments..."
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
                onPress={() => setSelectedType(type.key as any)}
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

        {/* Department Filter (only show when viewing distributions or all) */}
        {(selectedType === 'distribution' || selectedType === 'all') && (
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
                  onPress={() => setSelectedDepartment(dept.key as any)}
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
        )}

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
                onPress={() => setSelectedPeriod(period.key as any)}
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
      {filteredHistory.length === 0 ? (
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
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
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
                  <Text style={styles.time}>{formatTime(item.date)}</Text>
                </View>
              </View>

              {/* Products List */}
              <View style={styles.productsList}>
                {item.items.map((product, index) => (
                  <View key={`${product.productId}-${index}`} style={styles.productItem}>
                    <Text style={styles.productQuantity}>
                      {product.quantity} {product.unit || 'units'}
                    </Text>
                    <Text style={styles.productName}>of {product.productName}</Text>
                    {product.price && (
                      <Text style={styles.productPrice}>{formatCurrency(product.price)}</Text>
                    )}
                  </View>
                ))}
              </View>

              {/* Total Value for Stock In */}
              {item.type === 'stock_in' && item.totalValue && (
                <View style={styles.totalValueContainer}>
                  <Text style={styles.totalValueLabel}>Total Value: </Text>
                  <Text style={styles.totalValue}>{formatCurrency(item.totalValue)}</Text>
                </View>
              )}

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
    fontSize: 18,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontWeight: '600',
    textAlign: 'center',
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