// app/movement-details.tsx
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';
import { stockMovementService } from '../../services/stockMovmentService';

type Movement = {
    id: string;
    movementId: string;
    type: 'stock_in' | 'distribution';
    department?: string;
    supplier?: string;
    stockManager: string;
    products: Array<{
        productId: string;
        productName: string;
        quantity: number;
        unit: string;
        unitPrice: number;
        total: number;
        previousStock: number;
        newStock: number;
    }>;
    totalValue: number;
    totalItems: number;
    notes: string;
    date: string;
    timestamp: any;
    createdAt: any;
};

type ServiceResponse<T> = {
    success: boolean;
    data?: T;
    message?: string;
    errors?: string[];
};

export default function MovementDetailsScreen() {
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';
    const router = useRouter();
    const { movementId } = useLocalSearchParams();
    
    const [movement, setMovement] = useState<Movement | null>(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);

    const styles = getStyles(isDarkMode);

    useEffect(() => {
        loadMovementDetails();
    }, [movementId]);

    const loadMovementDetails = async () => {
        try {
            setLoading(true);
            console.log('🔄 Loading movement details for:', movementId);
            
            const response: ServiceResponse<Movement> = await (stockMovementService.getMovementById as any)(movementId as string);
            
            if (response.success && response.data) {
                setMovement(response.data);
            } else {
                throw new Error(response.message || 'Failed to load movement details');
            }
            
        } catch (error: any) {
            console.error('❌ Error loading movement details:', error);
            Alert.alert('Error', error.message || 'Failed to load movement details');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteMovement = async () => {
        if (!movement) return;

        Alert.alert(
            'Delete Movement',
            `Are you sure you want to delete this ${movement.type} movement? This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setDeleting(true);
                            console.log('🗑️ Deleting movement:', movement.id);
                            
                            let result;
                            if (stockMovementService.deleteMovement) {
                                result = await (stockMovementService.deleteMovement as any)(movement.id);
                            } else {
                                Alert.alert('Info', 'Delete functionality is not available in this version.');
                                return;
                            }
                            
                            if (result.success) {
                                Alert.alert(
                                    'Success',
                                    result.message || 'Movement deleted successfully',
                                    [{ text: 'OK', onPress: () => router.back() }]
                                );
                            } else {
                                Alert.alert('Error', result.message || 'Failed to delete movement');
                            }
                        } catch (error: any) {
                            console.error('❌ Delete error:', error);
                            Alert.alert('Error', error.message || 'Failed to delete movement');
                        } finally {
                            setDeleting(false);
                        }
                    }
                }
            ]
        );
    };

    const getMovementTypeColor = (type: string) => {
        return type === 'stock_in' ? '#10b981' : '#f59e0b';
    };

    const getMovementTypeIcon = (type: string) => {
        return type === 'stock_in' ? '📥' : '📤';
    };

    const getMovementTypeGradient = (type: string) => {
        return type === 'stock_in' 
            ? ['#10b981', '#059669'] 
            : ['#f59e0b', '#d97706'];
    };

    const getDepartmentIcon = (department: string) => {
        const icons: { [key: string]: string } = {
            pastry: '🥐',
            bakery: '🍞',
            cleaning: '🧹',
            magazin: '👔'
        };
        return icons[department] || '📦';
    };

    const getDepartmentColor = (department: string) => {
        const colors: { [key: string]: string } = {
            pastry: '#f59e0b',
            bakery: '#84cc16',
            cleaning: '#06b6d4',
            magazin: '#8b5cf6'
        };
        return colors[department] || '#6366f1';
    };

    const getStockChangeColor = (newStock: number, previousStock: number) => {
        if (newStock > previousStock) {
            return { 
                background: '#10b98120', 
                text: '#10b981',
                icon: '📈',
                trend: 'up'
            };
        } else if (newStock < previousStock) {
            return { 
                background: '#ef444420', 
                text: '#ef4444',
                icon: '📉',
                trend: 'down'
            };
        } else {
            return { 
                background: '#6b728020', 
                text: '#6b7280',
                icon: '➡️',
                trend: 'same'
            };
        }
    };

    const formatCurrency = (amount: number) => {
        return `${amount.toFixed(2)} MAD`;
    };

    if (loading) {
        return (
            
            <View style={styles.container}>
                      <Stack.Screen options={{ 
        headerShown: false
      }} />
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={24} color="#ffffff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Movement Details</Text>
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366f1" />
                    <Text style={styles.loadingText}>Loading details...</Text>
                </View>
            </View>
        );
    }

    if (!movement) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={24} color="#ffffff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Movement Details</Text>
                </View>
                <View style={styles.errorContainer}>
                    <View style={styles.errorIcon}>
                        <Ionicons name="document-text-outline" size={64} color="#94a3b8" />
                    </View>
                    <Text style={styles.errorTitle}>Movement Not Found</Text>
                    <Text style={styles.errorText}>
                        The movement you're looking for doesn't exist or may have been deleted.
                    </Text>
                    <TouchableOpacity 
                        style={styles.retryButton}
                        onPress={loadMovementDetails}
                    >
                        <Text style={styles.retryButtonText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header with Gradient */}
            <View style={[styles.header, { backgroundColor: getMovementTypeColor(movement.type) }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="#ffffff" />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Movement Details</Text>
                    <Text style={styles.headerSubtitle}>ID: {movement.movementId}</Text>
                </View>
                <View style={styles.headerIcon}>
                    <Text style={styles.headerIconText}>{getMovementTypeIcon(movement.type)}</Text>
                </View>
            </View>

            <ScrollView 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Quick Stats */}
                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{movement.totalItems}</Text>
                        <Text style={styles.statLabel}>Items</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>
                            {movement.type === 'stock_in' && movement.totalValue > 0 
                                ? formatCurrency(movement.totalValue)
                                : '-'
                            }
                        </Text>
                        <Text style={styles.statLabel}>Total Value</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>
                            {movement.products?.length || 0}
                        </Text>
                        <Text style={styles.statLabel}>Products</Text>
                    </View>
                </View>

                {/* Movement Overview Card */}
                <View style={styles.overviewCard}>
                    <View style={styles.overviewHeader}>
                        <View style={[styles.typeBadge, { backgroundColor: getMovementTypeColor(movement.type) }]}>
                            <Text style={styles.typeBadgeIcon}>
                                {getMovementTypeIcon(movement.type)}
                            </Text>
                            <Text style={styles.typeBadgeText}>
                                {movement.type === 'stock_in' ? 'Stock In' : 'Distribution'}
                            </Text>
                        </View>
                        <Text style={styles.dateText}>{movement.date}</Text>
                    </View>

                    <View style={styles.detailsGrid}>
                        <View style={styles.detailItem}>
                            <Ionicons name="person-outline" size={16} color="#94a3b8" />
                            <Text style={styles.detailLabel}>Manager</Text>
                            <Text style={styles.detailValue}>{movement.stockManager}</Text>
                        </View>

                        {movement.type === 'distribution' && movement.department && (
                            <View style={styles.detailItem}>
                                <Text style={styles.detailIcon}>{getDepartmentIcon(movement.department)}</Text>
                                <Text style={styles.detailLabel}>Department</Text>
                                <Text style={[styles.detailValue, { color: getDepartmentColor(movement.department) }]}>
                                    {movement.department.charAt(0).toUpperCase() + movement.department.slice(1)}
                                </Text>
                            </View>
                        )}

                        {movement.type === 'stock_in' && movement.supplier && (
                            <View style={styles.detailItem}>
                                <Ionicons name="business-outline" size={16} color="#94a3b8" />
                                <Text style={styles.detailLabel}>Supplier</Text>
                                <Text style={styles.detailValue}>{movement.supplier}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Products Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Products</Text>
                        <Text style={styles.sectionCount}>{movement.products?.length || 0} items</Text>
                    </View>
                    
                    {movement.products?.map((product, index) => {
                        const stockChange = getStockChangeColor(product.newStock, product.previousStock);
                        const changeAmount = product.newStock - product.previousStock;
                        
                        return (
                            <View key={`${product.productId}-${index}`} style={styles.productCard}>
                                <View style={styles.productHeader}>
                                    <View style={styles.productIndex}>
                                        <Text style={styles.productIndexText}>#{index + 1}</Text>
                                    </View>
                                    <Text style={styles.productName}>{product.productName}</Text>
                                    <View style={[styles.stockTrend, { backgroundColor: stockChange.background }]}>
                                        <Text style={[styles.stockTrendText, { color: stockChange.text }]}>
                                            {stockChange.icon}
                                        </Text>
                                    </View>
                                </View>
                                
                                <View style={styles.productDetails}>
                                    <View style={styles.quantityRow}>
                                        <Text style={styles.quantityLabel}>Quantity:</Text>
                                        <Text style={styles.quantityValue}>
                                            {product.quantity} {product.unit}
                                        </Text>
                                    </View>
                                    
                                    {movement.type === 'stock_in' && product.unitPrice > 0 && (
                                        <View style={styles.priceRow}>
                                            <View style={styles.priceGroup}>
                                                <Text style={styles.priceLabel}>Unit Price:</Text>
                                                <Text style={styles.priceValue}>
                                                    {formatCurrency(product.unitPrice)}
                                                </Text>
                                            </View>
                                            <View style={styles.priceGroup}>
                                                <Text style={styles.priceLabel}>Line Total:</Text>
                                                <Text style={styles.priceValue}>
                                                    {formatCurrency(product.total)}
                                                </Text>
                                            </View>
                                        </View>
                                    )}
                                    
                                    <View style={styles.stockRow}>
                                        <Text style={styles.stockLabel}>Stock Level:</Text>
                                        <View style={styles.stockProgress}>
                                            <View style={styles.stockValues}>
                                                <Text style={styles.stockFrom}>{product.previousStock}</Text>
                                                <Ionicons name="arrow-forward" size={14} color="#94a3b8" />
                                                <Text style={styles.stockTo}>{product.newStock}</Text>
                                            </View>
                                            <View style={[styles.changeBadge, { backgroundColor: stockChange.background }]}>
                                                <Text style={[styles.changeText, { color: stockChange.text }]}>
                                                    {changeAmount > 0 ? '+' : ''}{changeAmount}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* Notes Section */}
                {movement.notes && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Notes</Text>
                            <Ionicons name="document-text-outline" size={20} color="#94a3b8" />
                        </View>
                        <View style={styles.notesCard}>
                            <Text style={styles.notesText}>{movement.notes}</Text>
                        </View>
                    </View>
                )}

                {/* Action Buttons */}
                <View style={styles.actionSection}>
                    <TouchableOpacity 
                        style={[styles.deleteButton, deleting && styles.deleteButtonDisabled]}
                        onPress={handleDeleteMovement}
                        disabled={deleting}
                    >
                        {deleting ? (
                            <ActivityIndicator color="#ffffff" size="small" />
                        ) : (
                            <>
                                <Ionicons name="trash-outline" size={20} color="#ffffff" />
                                <Text style={styles.deleteButtonText}>Delete Movement</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.footerSpacer} />
            </ScrollView>
        </View>
    );
}

const getStyles = (isDarkMode: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: isDarkMode ? "#0f172a" : "#f8fafc",
    },
    scrollContent: {
        flexGrow: 1,
        padding: 20,
        paddingTop: 0,
    },
    // Header
    header: {
        padding: 24,
        paddingTop: 60,
        paddingBottom: 30,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom:50
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerContent: {
        flex: 1,
        alignItems: 'center',
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
    },
    headerIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerIconText: {
        fontSize: 18,
    },
    // Loading & Error States
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: isDarkMode ? "#94a3b8" : "#64748b",
        textAlign: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    errorIcon: {
        marginBottom: 24,
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: isDarkMode ? "#f1f5f9" : "#1e293b",
        marginBottom: 8,
        textAlign: 'center',
    },
    errorText: {
        fontSize: 16,
        color: isDarkMode ? "#94a3b8" : "#64748b",
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 22,
    },
    retryButton: {
        backgroundColor: '#6366f1',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 12,
    },
    retryButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    // Stats
    statsContainer: {
        flexDirection: 'row',
        backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
        borderRadius: 20,
        padding: 24,
        marginTop: -40,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDarkMode ? 0.1 : 0.05,
        shadowRadius: 12,
        elevation: 3,
        alignItems: 'center',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
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
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: isDarkMode ? "#334155" : "#e2e8f0",
    },
    // Overview Card
    overviewCard: {
        backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
        borderRadius: 20,
        padding: 24,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDarkMode ? 0.1 : 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    overviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    typeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    typeBadgeIcon: {
        fontSize: 16,
        marginRight: 8,
    },
    typeBadgeText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    dateText: {
        fontSize: 14,
        color: isDarkMode ? "#94a3b8" : "#64748b",
        fontWeight: '600',
    },
    detailsGrid: {
        gap: 16,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    detailIcon: {
        fontSize: 16,
        marginRight: 12,
        width: 20,
        textAlign: 'center',
    },
    detailLabel: {
        flex: 1,
        fontSize: 14,
        color: isDarkMode ? "#94a3b8" : "#64748b",
        marginLeft: 12,
    },
    detailValue: {
        fontSize: 15,
        fontWeight: '600',
        color: isDarkMode ? "#f1f5f9" : "#1e293b",
    },
    // Sections
    section: {
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: isDarkMode ? "#f1f5f9" : "#1e293b",
    },
    sectionCount: {
        fontSize: 14,
        color: isDarkMode ? "#94a3b8" : "#64748b",
        fontWeight: '600',
    },
    // Products
    productCard: {
        backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
        borderRadius: 16,
        padding: 20,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#6366f1',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDarkMode ? 0.1 : 0.03,
        shadowRadius: 3,
        elevation: 1,
    },
    productHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    productIndex: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#6366f1',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    productIndexText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    productName: {
        flex: 1,
        fontSize: 16,
        fontWeight: 'bold',
        color: isDarkMode ? "#f1f5f9" : "#1e293b",
    },
    stockTrend: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stockTrendText: {
        fontSize: 14,
    },
    productDetails: {
        gap: 12,
    },
    quantityRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    quantityLabel: {
        fontSize: 14,
        color: isDarkMode ? "#94a3b8" : "#64748b",
        fontWeight: '500',
    },
    quantityValue: {
        fontSize: 15,
        fontWeight: '600',
        color: isDarkMode ? "#f1f5f9" : "#1e293b",
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    priceGroup: {
        flex: 1,
    },
    priceLabel: {
        fontSize: 12,
        color: isDarkMode ? "#94a3b8" : "#64748b",
        marginBottom: 4,
    },
    priceValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#10b981',
    },
    stockRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: isDarkMode ? "#334155" : "#e2e8f0",
    },
    stockLabel: {
        fontSize: 14,
        color: isDarkMode ? "#94a3b8" : "#64748b",
        fontWeight: '500',
    },
    stockProgress: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    stockValues: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    stockFrom: {
        fontSize: 14,
        color: isDarkMode ? "#94a3b8" : "#64748b",
        fontWeight: '500',
    },
    stockTo: {
        fontSize: 14,
        fontWeight: 'bold',
        color: isDarkMode ? "#f1f5f9" : "#1e293b",
    },
    changeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    changeText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    // Notes
    notesCard: {
        backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
        borderRadius: 16,
        padding: 20,
        borderLeftWidth: 4,
        borderLeftColor: '#06b6d4',
    },
    notesText: {
        fontSize: 15,
        color: isDarkMode ? "#f1f5f9" : "#1e293b",
        lineHeight: 22,
    },
    // Actions
    actionSection: {
        marginTop: 8,
        marginBottom: 24,
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ef4444',
        padding: 18,
        borderRadius: 16,
        gap: 8,
        shadowColor: '#ef4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    deleteButtonDisabled: {
        opacity: 0.6,
    },
    deleteButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    footerSpacer: {
        height: 20,
    },
});