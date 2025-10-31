import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { deleteProduct, updateProduct } from "../api";

const { width: screenWidth } = Dimensions.get('window');

// Define proper types for Ionicons names
type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

export default function ProductDetailScreen() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const router = useRouter();
  const params = useLocalSearchParams();

  // Helper functions to handle both data structures
  const getProductId = () => {
    const idParam = Array.isArray(params.id) ? params.id[0] : params.id;
    return String(idParam || "");
  };

  const getName = () => {
    const nameParam = Array.isArray(params.name) ? params.name[0] : params.name;
    return String(nameParam || "Unknown Product");
  };

  const getQuantity = () => {
    const quantityParam = Array.isArray(params.quantity) ? params.quantity[0] : params.quantity;
    const qParam = Array.isArray(params.q) ? params.q[0] : params.q;
    return Number(quantityParam || qParam || 0);
  };

  const getUnit = () => {
    const unitParam = Array.isArray(params.unit) ? params.unit[0] : params.unit;
    return String(unitParam || "units");
  };

  const getCategories = () => {
    try {
      const categoriesParam = Array.isArray(params.categories) ? params.categories[0] : params.categories;
      if (categoriesParam) {
        const parsed = JSON.parse(categoriesParam);
        return Array.isArray(parsed) ? parsed : [parsed];
      }
    } catch (e) {
      const categoryParam = Array.isArray(params.category) ? params.category[0] : params.category;
      if (categoryParam) {
        return [categoryParam];
      }
    }
    return ["Other"];
  };

  const getPrimaryCategory = () => {
    const primaryParam = Array.isArray(params.primaryCategory) ? params.primaryCategory[0] : params.primaryCategory;
    const categories = getCategories();
    return primaryParam || categories[0] || "Other";
  };

  const getDescription = () => {
    const descriptionParam = Array.isArray(params.description) ? params.description[0] : params.description;
    return String(descriptionParam || "");
  };

  const getLastUsed = () => {
    const lastUsedParam = Array.isArray(params.lastUsed) ? params.lastUsed[0] : params.lastUsed;
    return lastUsedParam || null;
  };

  const getTotalUsed = () => {
    const totalUsedParam = Array.isArray(params.totalUsed) ? params.totalUsed[0] : params.totalUsed;
    return Number(totalUsedParam || 0);
  };

  const getUsageHistory = () => {
    try {
      const usageHistoryParam = Array.isArray(params.usageHistory) ? params.usageHistory[0] : params.usageHistory;
      if (usageHistoryParam) {
        const parsed = JSON.parse(usageHistoryParam);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) {
      console.error('Error parsing usage history:', e);
    }
    return [];
  };

  // State
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(getName());
  const [editedUnit, setEditedUnit] = useState(getUnit());
  const [editedCategories, setEditedCategories] = useState<string[]>(getCategories());
  const [editedDescription, setEditedDescription] = useState(getDescription());
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const productId = getProductId();
  const quantity = getQuantity();
  const lastUsedDate = getLastUsed();
  const totalUsedAmount = getTotalUsed();
  const primaryCategory = getPrimaryCategory();
  const usageHistory = getUsageHistory();

  // Navigate to analytics screen
  const handleViewAnalytics = () => {
    router.push({
      pathname: "/(tabs)/details/product-analytics",
      params: {
        productId,
        productName: getName(),
        unit: getUnit(),
        currentStock: quantity,
        categories: JSON.stringify(getCategories())
      }
    });
  };

  // Update product
  const handleUpdate = async () => {
    if (!editedName.trim() || !editedUnit.trim()) {
      Alert.alert("Error", "Please enter valid values for name and unit.");
      return;
    }

    setIsLoading(true);
    try {
      const updateData: any = {
        name: editedName.trim(),
        unit: editedUnit.trim(),
        description: editedDescription.trim(),
        quantity: quantity
      };

      if (editedCategories.length > 0 && !(editedCategories.length === 1 && editedCategories[0] === "Other")) {
        updateData.categories = editedCategories;
        updateData.primaryCategory = editedCategories[0];
        updateData.category = editedCategories[0];
      }

      await updateProduct(productId, updateData);
      
      Alert.alert("✅ Success", `Product updated successfully!`);
      setIsEditing(false);
    } catch (error) {
      console.error("❌ Update product error:", error);
      Alert.alert("❌ Error", "Failed to update product. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Delete product
  const handleDelete = () => {
    Alert.alert(
      "Delete Product",
      "Are you sure you want to delete this product? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: handleConfirmDelete }
      ]
    );
  };

  const handleConfirmDelete = async () => {
    setIsLoading(true);
    try {
      await deleteProduct(productId);
      Alert.alert("✅ Success", "Product has been deleted.");
      router.back();
    } catch (error) {
      console.error("❌ Delete product error:", error);
      Alert.alert("❌ Error", "Failed to delete product. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedName(getName());
    setEditedUnit(getUnit());
    setEditedCategories(getCategories());
    setEditedDescription(getDescription());
    setIsEditing(false);
  };

  const onRefresh = () => {
    setRefreshing(false);
  };

  // Stock status with proper typing
  const getStockStatus = () => {
    if (quantity === 0) return { status: 'Out of Stock', color: '#ef4444', icon: 'close-circle' as IoniconsName };
    if (quantity <= 5) return { status: 'Low Stock', color: '#f59e0b', icon: 'warning' as IoniconsName };
    return { status: 'In Stock', color: '#10b981', icon: 'checkmark-circle' as IoniconsName };
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never used';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Never used';
      
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
    } catch (error) {
      return 'Never used';
    }
  };

  const formatDateForHistory = (dateString: string) => {
    if (!dateString) return 'Unknown date';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Unknown date';
      
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (error) {
      return 'Unknown date';
    }
  };

  // Category icons with only valid Ionicons names
  const getCategoryIcon = (category: string): IoniconsName => {
    const iconMap: {[key: string]: IoniconsName} = {
      'Vegetables': 'leaf',
      'Fruits': 'nutrition',
      'Meat': 'restaurant',
      'Seafood': 'fish',
      'Dairy': 'water',
      'Herbs & Spices': 'flower',
      'Grains & Pasta': 'fast-food',
      'Oils & Vinegars': 'flask',
      'Canned Goods': 'archive',
      'Bakery': 'cafe',
      'Beverages': 'beer',
      'Cleaning Supplies': 'sparkles',
      'Paper Goods': 'document',
      'Utensils': 'restaurant',
      'Equipment': 'hammer',
      'Frozen Foods': 'snow',
      'Condiments': 'flask',
      'Spices': 'flower',
      'Baking Supplies': 'ice-cream',
      'Fresh Herbs': 'leaf',
      'Other': 'cube',
    };
    
    return iconMap[category] || 'cube';
  };

  const renderUsageItem = ({ item, index }: { item: any; index: number }) => (
    <View style={[
      styles.usageItem,
      index === 0 && styles.recentUsageItem
    ]}>
      <View style={styles.usageIconContainer}>
        <Ionicons name="arrow-down" size={16} color="#ef4444" />
      </View>
      
      <View style={styles.usageContent}>
        <View style={styles.usageHeader}>
          <View style={styles.usageInfo}>
            <Text style={styles.usageDate}>
              {formatDateForHistory(item.date || item.timestamp)}
            </Text>
            {item.departmentId && (
              <Text style={styles.usageDepartment}>
                {item.departmentId}
              </Text>
            )}
          </View>
          <View style={styles.usageQuantityContainer}>
            <Text style={styles.usageQuantity}>
              {item.quantityUsed || item.quantity}
            </Text>
            <Text style={styles.usageUnit}>{getUnit()}</Text>
          </View>
        </View>
        
        <View style={styles.usageDetails}>
          {item.movementId && (
            <View style={styles.usageDetailRow}>
              <Ionicons name="barcode" size={12} color={isDarkMode ? "#94a3b8" : "#64748b"} />
              <Text style={styles.usageMovementId}>
                {item.movementId}
              </Text>
            </View>
          )}
          {item.usedBy && (
            <View style={styles.usageDetailRow}>
              <Ionicons name="person" size={12} color={isDarkMode ? "#94a3b8" : "#64748b"} />
              <Text style={styles.usageUser}>
                {item.usedBy}
              </Text>
            </View>
          )}
          {item.notes && (
            <View style={styles.usageDetailRow}>
              <Ionicons name="document-text" size={12} color={isDarkMode ? "#94a3b8" : "#64748b"} />
              <Text style={styles.usageNotes}>
                {item.notes}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  const stockStatus = getStockStatus();
  const styles = getStyles(isDarkMode);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header with Gradient */}
      <View style={styles.header}>
        <View style={styles.headerBackground} />
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Product Details</Text>
            <Text style={styles.headerSubtitle}>{getName()}</Text>
          </View>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => isEditing ? handleCancelEdit() : setIsEditing(true)}
          >
            <Ionicons 
              name={isEditing ? "close" : "create-outline"} 
              size={22} 
              color="#ffffff" 
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#6366f1"]}
            tintColor="#6366f1"
          />
        }
      >
        {/* Stock Status Card */}
        <View style={styles.stockCard}>
          <View style={styles.stockHeader}>
            <View style={styles.stockIconContainer}>
              <Ionicons name={stockStatus.icon} size={32} color={stockStatus.color} />
            </View>
            <View style={styles.stockInfo}>
              <Text style={styles.stockStatusText}>{stockStatus.status}</Text>
              <Text style={styles.stockQuantity}>
                {quantity} {getUnit()}
              </Text>
            </View>
          </View>
          <View style={styles.stockStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{getTotalUsed()}</Text>
              <Text style={styles.statLabel}>Total Used</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{usageHistory.length}</Text>
              <Text style={styles.statLabel}>Movements</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatDate(getLastUsed() || '')}</Text>
              <Text style={styles.statLabel}>Last Used</Text>
            </View>
          </View>
        </View>

        {/* Analytics Button */}
        {!isEditing && (
          <TouchableOpacity 
    style={styles.analyticsButton}
    onPress={handleViewAnalytics}
  >
    <View style={styles.analyticsButtonContent}>
      <View style={styles.analyticsIconContainer}>
        <Ionicons name="analytics" size={24} color="#ffffff" />
      </View>
      <View style={styles.analyticsTextContainer}>
        <Text style={styles.analyticsTitle}>View Usage Analytics</Text>
        <Text style={styles.analyticsSubtitle}>
          Detailed statistics, trends, and history
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#ffffff" />
    </View>
  </TouchableOpacity>
        )}

        {/* Product Information Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="information-circle" size={20} color={isDarkMode ? "#6366f1" : "#6366f1"} />
            <Text style={styles.cardTitle}>Product Information</Text>
          </View>

          <View style={styles.details}>
            {/* Product ID */}
            <View style={styles.detailRow}>
              <View style={styles.detailLabelContainer}>
                <Ionicons name="barcode" size={16} color={isDarkMode ? "#94a3b8" : "#64748b"} />
                <Text style={styles.label}>Product ID</Text>
              </View>
              <Text style={styles.value}>{productId}</Text>
            </View>

            {/* Name */}
            <View style={styles.detailRow}>
              <View style={styles.detailLabelContainer}>
                <Ionicons name="pricetag" size={16} color={isDarkMode ? "#94a3b8" : "#64748b"} />
                <Text style={styles.label}>Product Name</Text>
              </View>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={editedName}
                  onChangeText={setEditedName}
                  placeholder="Enter product name"
                  placeholderTextColor={isDarkMode ? "#64748b" : "#94a3b8"}
                />
              ) : (
                <Text style={styles.value}>{getName()}</Text>
              )}
            </View>

            {/* Unit */}
            <View style={styles.detailRow}>
              <View style={styles.detailLabelContainer}>
                <Ionicons name="scale" size={16} color={isDarkMode ? "#94a3b8" : "#64748b"} />
                <Text style={styles.label}>Unit</Text>
              </View>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={editedUnit}
                  onChangeText={setEditedUnit}
                  placeholder="e.g., kg, box, piece"
                  placeholderTextColor={isDarkMode ? "#64748b" : "#94a3b8"}
                />
              ) : (
                <Text style={styles.value}>{getUnit()}</Text>
              )}
            </View>

            {/* Categories */}
            <View style={styles.detailRow}>
              <View style={styles.detailLabelContainer}>
                <Ionicons name="folder" size={16} color={isDarkMode ? "#94a3b8" : "#64748b"} />
                <Text style={styles.label}>Categories</Text>
              </View>
              <View style={styles.categoriesContainer}>
                {getCategories().map((cat, index) => (
                  <View key={cat} style={[
                    styles.categoryTag,
                    index === 0 && styles.primaryCategoryTag
                  ]}>
                    <Ionicons 
                      name={getCategoryIcon(cat)} 
                      size={12} 
                      color="#ffffff" 
                      style={styles.categoryIcon}
                    />
                    <Text style={styles.categoryTagText}>{cat}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Description */}
            <View style={styles.detailRow}>
              <View style={styles.detailLabelContainer}>
                <Ionicons name="document-text" size={16} color={isDarkMode ? "#94a3b8" : "#64748b"} />
                <Text style={styles.label}>Description</Text>
              </View>
              {isEditing ? (
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={editedDescription}
                  onChangeText={setEditedDescription}
                  placeholder="Product description"
                  placeholderTextColor={isDarkMode ? "#64748b" : "#94a3b8"}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              ) : (
                <Text style={[styles.value, !getDescription() && styles.placeholder]}>
                  {getDescription() || "No description provided"}
                </Text>
              )}
            </View>
          </View>

          {/* Save Button */}
          {isEditing && (
            <TouchableOpacity
              style={[styles.saveButton, isLoading && styles.buttonDisabled]}
              onPress={handleUpdate}
              disabled={isLoading}
            >
              {isLoading ? (
                <Ionicons name="refresh" size={20} color="#ffffff" />
              ) : (
                <Ionicons name="save" size={20} color="#ffffff" />
              )}
              <Text style={styles.saveButtonText}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Usage History Card */}
        {!isEditing && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="time" size={20} color={isDarkMode ? "#6366f1" : "#6366f1"} />
              <Text style={styles.cardTitle}>Usage History</Text>
              <View style={styles.historyCountBadge}>
                <Text style={styles.historyCountText}>{usageHistory.length}</Text>
              </View>
            </View>

            {usageHistory.length > 0 ? (
              <FlatList
                data={usageHistory}
                renderItem={renderUsageItem}
                keyExtractor={(item, index) => item._id || item.movementId || `usage-${index}`}
                scrollEnabled={false}
                contentContainerStyle={styles.usageList}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="time-outline" size={48} color={isDarkMode ? "#475569" : "#cbd5e1"} />
                <Text style={styles.emptyText}>No Usage History</Text>
                <Text style={styles.emptySubtext}>
                  Usage records will appear here when this product is distributed to departments
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Action Buttons */}
        {!isEditing && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.editAction, isLoading && styles.buttonDisabled]}
              onPress={() => setIsEditing(true)}
              disabled={isLoading}
            >
              <Ionicons name="create" size={20} color="#ffffff" />
              <Text style={styles.editActionText}>Edit Product</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.deleteButton, isLoading && styles.buttonDisabled]}
              onPress={handleDelete}
              disabled={isLoading}
            >
              <Ionicons name="trash" size={20} color="#ffffff" />
              <Text style={styles.deleteButtonText}>
                {isLoading ? "Deleting..." : "Delete Product"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const getStyles = (isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDarkMode ? "#121212" : "#f8fafc",
  },
  // Header
  header: {
    height: 160,
    position: 'relative',
    overflow: 'hidden',
  },
  headerBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f97316',
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 60,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Content
  content: {
    flex: 1,
    marginTop: -20,
  },
  // Analytics Button
  analyticsButton: {
    backgroundColor: '#6366f1',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  analyticsButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  analyticsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  analyticsTextContainer: {
    flex: 1,
  },
  analyticsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  analyticsSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  // Stock Card
  stockCard: {
    backgroundColor: isDarkMode ? "#1e1e1e" : "#ffffff",
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  stockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  stockIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: isDarkMode ? "#1e1e1e" : "#f8fafc",
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  stockInfo: {
    flex: 1,
  },
  stockStatusText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 4,
  },
  stockQuantity: {
    fontSize: 24,
    fontWeight: 'bold',
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  stockStats: {
    flexDirection: 'row',
    backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
    borderRadius: 16,
    padding: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  statDivider: {
    width: 1,
    backgroundColor: isDarkMode ? "#475569" : "#e2e8f0",
  },
  // Card
  card: {
    backgroundColor: isDarkMode ? "#1e1e1e" : "#ffffff",
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginLeft: 8,
  },
  historyCountBadge: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 'auto',
  },
  historyCountText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  // Details
  details: {
    gap: 20,
  },
  detailRow: {
    gap: 8,
  },
  detailLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  value: {
    fontSize: 16,
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    padding: 16,
    backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? "#475569" : "#e2e8f0",
  },
  placeholder: {
    color: isDarkMode ? "#64748b" : "#94a3b8",
    fontStyle: 'italic',
  },
  // Categories
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  primaryCategoryTag: {
    backgroundColor: '#10b981',
  },
  categoryIcon: {
    marginRight: 2,
  },
  categoryTagText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  // Inputs
  input: {
    backgroundColor: isDarkMode ? "#334155" : "#ffffff",
    borderWidth: 2,
    borderColor: isDarkMode ? "#475569" : "#e2e8f0",
    borderRadius: 12,
    padding: 16,
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    fontSize: 16,
    fontWeight: '500',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  // Usage History
  usageList: {
    gap: 12,
  },
  usageItem: {
    flexDirection: 'row',
    backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: isDarkMode ? "#475569" : "#e2e8f0",
  },
  recentUsageItem: {
    borderLeftColor: '#f59e0b',
    backgroundColor: isDarkMode ? "#422006" : "#fef3c7",
  },
  usageIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  usageContent: {
    flex: 1,
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  usageInfo: {
    flex: 1,
  },
  usageDate: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? "#f1f5f9" : "#1e293b",
    marginBottom: 2,
  },
  usageDepartment: {
    fontSize: 12,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontWeight: '500',
  },
  usageQuantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  usageQuantity: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ef4444',
  },
  usageUnit: {
    fontSize: 12,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontWeight: '500',
  },
  usageDetails: {
    gap: 6,
  },
  usageDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  usageMovementId: {
    fontSize: 11,
    color: isDarkMode ? "#cbd5e1" : "#475569",
    fontFamily: 'monospace',
  },
  usageUser: {
    fontSize: 11,
    color: isDarkMode ? "#94a3b8" : "#64748b",
  },
  usageNotes: {
    fontSize: 11,
    color: isDarkMode ? "#94a3b8" : "#64748b",
    fontStyle: 'italic',
  },
  // Loading and Empty States
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? "#94a3b8" : "#64748b",
    marginTop: 12,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: isDarkMode ? "#64748b" : "#94a3b8",
    textAlign: 'center',
    lineHeight: 20,
  },
  // Buttons
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    padding: 18,
    borderRadius: 16,
    marginTop: 20,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  actions: {
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 30,
  },
  editAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    padding: 18,
    borderRadius: 16,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  editActionText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    padding: 18,
    borderRadius: 16,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});