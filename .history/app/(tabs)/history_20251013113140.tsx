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
import { useAppContext } from '../context/appContext';

type Department = 'pastry' | 'bakery' | 'cleaning' | 'management';

type HistoryItem = {
  id: string;
  productId: string;
  productName: string;
  type: 'in' | 'out';
  quantity: number;
  price?: number;
  reason: string;
  date: string;
  stockManager: string;
  department?: Department; // Only for stock out
  notes?: string;
};

type SectionData = {
  title: string;
  data: HistoryItem[];
};

export default function HistoryScreen() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const { products } = useAppContext();
  
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'in' | 'out'>('all');
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

  // Mock data representing stock manager activities
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      
      // Mock history data - Stock Manager: "Ahmed" managing all stock movements
      const mockHistory: HistoryItem[] = [
        // Today's activities
        {
          id: '1',
          productId: '1',
          productName: 'Croissant',
          type: 'out',
          quantity: 12,
          price: 8,
          reason: 'Morning sales distribution',
          date: new Date().toISOString(),
          stockManager: 'Ahmed',
          department: 'pastry',
          notes: 'Distributed to pastry counter'
        },
        {
          id: '2',
          productId: '2',
          productName: 'Baguette',
          type: 'out',
          quantity: 8,
          price: 15,
          reason: 'Restaurant order fulfillment',
          date: new Date().toISOString(),
          stockManager: 'Ahmed',
          department: 'bakery',
          notes: 'Delivered to restaurant client'
        },
        {
          id: '3',
          productId: '3',
          productName: 'Flour',
          type: 'in',
          quantity: 50,
          price: 120,
          reason: 'Weekly supply received',
          date: new Date().toISOString(),
          stockManager: 'Ahmed',
          notes: 'Stored in main inventory'
        },
        {
          id: '4',
          productId: '7',
          productName: 'Disinfectant',
          type: 'out',
          quantity: 2,
          price: 0,
          reason: 'Cleaning supplies restock',
          date: new Date().toISOString(),
          stockManager: 'Ahmed',
          department: 'cleaning',
          notes: 'Provided to cleaning staff'
        },

        // Yesterday's activities
        {
          id: '5',
          productId: '4',
          productName: 'Chocolate Cake',
          type: 'out',
          quantity: 3,
          price: 45,
          reason: 'Birthday order preparation',
          date: new Date(Date.now() - 86400000).toISOString(),
          stockManager: 'Ahmed',
          department: 'pastry',
          notes: 'Special order for customer'
        },
        {
          id: '6',
          productId: '1',
          productName: 'Croissant',
          type: 'in',
          quantity: 30,
          price: 0,
          reason: 'Morning production batch',
          date: new Date(Date.now() - 86400000).toISOString(),
          stockManager: 'Ahmed',
          notes: 'Fresh batch from bakery'
        },
        {
          id: '7',
          productId: '10',
          productName: 'Printer Paper',
          type: 'out',
          quantity: 1,
          price: 0,
          reason: 'Office supplies',
          date: new Date(Date.now() - 86400000).toISOString(),
          stockManager: 'Ahmed',
          department: 'management',
          notes: 'For office use'
        },

        // This week
        {
          id: '8',
          productId: '5',
          productName: 'Butter',
          type: 'in',
          quantity: 20,
          price: 80,
          reason: 'Stock replenishment',
          date: new Date(Date.now() - 172800000).toISOString(),
          stockManager: 'Ahmed',
          notes: 'Refrigerated storage'
        },
        {
          id: '9',
          productId: '6',
          productName: 'Whole Wheat Bread',
          type: 'out',
          quantity: 15,
          price: 12,
          reason: 'Daily sales distribution',
          date: new Date(Date.now() - 259200000).toISOString(),
          stockManager: 'Ahmed',
          department: 'bakery',
          notes: 'Distributed to sales counter'
        },
        {
          id: '10',
          productId: '8',
          productName: 'Floor Cleaner',
          type: 'out',
          quantity: 1,
          price: 0,
          reason: 'Kitchen maintenance',
          date: new Date(Date.now() - 345600000).toISOString(),
          stockManager: 'Ahmed',
          department: 'cleaning',
          notes: 'For kitchen floor cleaning'
        }
      ];

      setHistory(mockHistory);
      setFilteredHistory(mockHistory);
    } catch (error) {
      console.error('Error loading history:', error);
      Alert.alert('Error', 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  // Filter history based on search and filters
  useEffect(() => {
    let filtered = history;

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(item => item.type === filterType);
    }

    // Filter by department
    if (selectedDepartment !== 'all') {
      filtered = filtered.filter(item => item.department === selectedDepartment);
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
        item.productName.toLowerCase().includes(query) ||
        item.reason.toLowerCase().includes(query) ||
        item.stockManager.toLowerCase().includes(query) ||
        item.department?.toLowerCase().includes(query) ||
        item.notes?.toLowerCase().includes(query)
      );
    }

    setFilteredHistory(filtered);
  }, [history, searchQuery, filterType, selectedPeriod, selectedDepartment]);

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
  const totalStockIn = filteredHistory
    .filter(item => item.type === 'in')
    .reduce((sum, item) => sum + item.quantity, 0);

  const totalStockOut = filteredHistory
    .filter(item => item.type === 'out')
    .reduce((sum, item) => sum + item.quantity, 0);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatCurrency = (amount: number) => {
    return `${amount?.toFixed(2) || '0.00'} MAD`;
  };

  const getTypeIcon = (type: 'in' | 'out') => {
    return type === 'in' ? '📥' : '📤';
  };

  const getTypeColor = (type: 'in' | 'out') => {
    return type === 'in' ? '#10b981' : '#ef4444';
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
        <Text style={styles.headerTitle}>📦 Stock Manager History</Text>
        <Text style={styles.headerSubtitle}>Track all stock movements by Ahmed</Text>
      </View>

      {/* Statistics */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{filteredHistory.length}</Text>
          <Text style={styles.statLabel}>Total Movements</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#10b981' }]}>+{totalStockIn}</Text>
          <Text style={styles.statLabel}>Stock In</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#ef4444' }]}>-{totalStockOut}</Text>
          <Text style={styles.statLabel}>Stock Out</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={isDarkMode ? "#94a3b8" : "#64748b"} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products, reasons, departments..."
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
            {['all', 'in', 'out'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeButton,
                  filterType === type && styles.typeButtonActive
                ]}
                onPress={() => setFilterType(type as any)}
              >
                <Text style={[
                  styles.typeButtonText,
                  filterType === type && styles.typeButtonTextActive
                ]}>
                  {type === 'all' ? 'All Movements' : type === 'in' ? '📥 Stock In' : '📤 Stock Out'}
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
                  styles.periodButton,
                  selectedDepartment === dept.key && styles.periodButtonActive,
                  { backgroundColor: selectedDepartment === dept.key ? dept.color : undefined }
                ]}
                onPress={() => setSelectedDepartment(dept.key as any)}
              >
                <Text style={[
                  styles.periodButtonText,
                  selectedDepartment === dept.key && styles.periodButtonTextActive
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
            {searchQuery || filterType !== 'all' || selectedPeriod !== 'all' || selectedDepartment !== 'all'
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
              <View style={styles.itemHeader}>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{item.productName}</Text>
                  <View style={styles.itemMeta}>
                    <Text style={styles.manager}>Managed by {item.stockManager}</Text>
                    <Text style={styles.time}>{formatTime(item.date)}</Text>
                  </View>
                </View>
                <View style={[styles.typeIndicator, { backgroundColor: getTypeColor(item.type) }]}>
                  <Text style={styles.typeText}>
                    {getTypeIcon(item.type)} {item.type === 'in' ? 'IN' : 'OUT'}
                  </Text>
                </View>
              </View>

              <View style={styles.itemDetails}>
                <View style={styles.quantityRow}>
                  <Text style={[
                    styles.quantity,
                    { color: getTypeColor(item.type) }
                  ]}>
                    {item.type === 'in' ? '+' : '-'}{item.quantity}
                  </Text>
                  <Text style={styles.quantityUnit}>units</Text>
                </View>
                
                {item.department && (
                  <View style={[styles.departmentBadge, { backgroundColor: getDepartmentColor(item.department) }]}>
                    <Text style={styles.departmentText}>
                      {departments.find(d => d.key === item.department)?.icon} {item.department.toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.reasonContainer}>
                <Text style={styles.reason}>{item.reason}</Text>
              </View>

              {item.notes && (
                <View style={styles.notesContainer}>
                  <Text style={styles.notesLabel}>Notes: </Text>
                  <Text style={styles.notes}>{item.notes}</Text>
                </View>
              )}

              {item.price && item.price > 0 && (
                <Text style={styles.price}>{formatCurrency(item.price)}</Text>
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
  periodButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: isDarkMode ? "#334155" : "#f1f5f9",
    marginRight: 8,
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#e2e8f0",
  },
  periodButtonActive: {
    borderColor: 'transparent',
  },
  periodButtonText: {
    fontSize: 12,
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
    marginBottom: 8,
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
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 4,
  },
  itemMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  manager: {
    fontSize: 12,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontWeight: '600',
  },
  time: {
    fontSize: 12,
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  typeIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantity: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 4,
  },
  quantityUnit: {
    fontSize: 14,
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  departmentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  departmentText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  reasonContainer: {
    marginBottom: 8,
  },
  reason: {
    fontSize: 14,
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    fontWeight: '500',
  },
  notesContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  notes: {
    fontSize: 12,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    flex: 1,
  },
  price: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
    textAlign: 'right',
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