// app/movement-details.tsx
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
            
            // Handle the service response object
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
                            
                            // Check if deleteMovement exists, if not use a fallback
                            let result;
                            if (stockMovementService.deleteMovement) {
                                result = await (stockMovementService.deleteMovement as any)(movement.id);
                            } else {
                                // Fallback: show message that delete is not implemented
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

    const getDepartmentIcon = (department: string) => {
        const icons: { [key: string]: string } = {
            pastry: '🥐',
            bakery: '🍞',
            cleaning: '🧹',
            magazin: '👔'
        };
        return icons[department] || '📦';
    };

    // Add a function to handle stock change colors
    const getStockChangeColor = (newStock: number, previousStock: number) => {
        if (newStock > previousStock) {
            return { 
                badge: '#10b98120', 
                text: '#10b981',
                arrow: '#10b981'
            };
        } else if (newStock < previousStock) {
            return { 
                badge: '#ef444420', 
                text: '#ef4444',
                arrow: '#ef4444'
            };
        } else {
            return { 
                badge: '#6b728020', 
                text: '#6b7280',
                arrow: '#6b7280'
            };
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#ffffff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Movement Details</Text>
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366f1" />
                    <Text style={styles.loadingText}>Loading movement details...</Text>
                </View>
            </View>
        );
    }

    if (!movement) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#ffffff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Movement Details</Text>
                </View>
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
                    <Text style={styles.errorTitle}>Movement Not Found</Text>
                    <Text style={styles.errorText}>
                        The movement you're looking for doesn't exist or has been deleted.
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
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#ffffff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Movement Details</Text>
                <Text style={styles.headerSubtitle}>ID: {movement.movementId}</Text>
            </View>

            <ScrollView 
                style={styles.container}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Movement Summary Card */}
                <View style={styles.section}>
                    <View style={styles.summaryHeader}>
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

                    <View style={styles.infoGrid}>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Movement ID</Text>
                            <Text style={styles.infoValue}>{movement.movementId}</Text>
                        </View>
                        
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Stock Manager</Text>
                            <Text style={styles.infoValue}>{movement.stockManager}</Text>
                        </View>

                        {movement.type === 'distribution' && movement.department && (
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Department</Text>
                                <View style={styles.departmentInfo}>
                                    <Text style={styles.departmentIcon}>
                                        {getDepartmentIcon(movement.department)}
                                    </Text>
                                    <Text style={styles.infoValue}>
                                        {movement.department.charAt(0).toUpperCase() + movement.department.slice(1)}
                                    </Text>
                                </View>
                            </View>
                        )}

                        {movement.type === 'stock_in' && movement.supplier && (
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Supplier</Text>
                                <Text style={styles.infoValue}>{movement.supplier}</Text>
                            </View>
                        )}

                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Total Items</Text>
                            <Text style={styles.infoValue}>{movement.totalItems}</Text>
                        </View>

                        {movement.type === 'stock_in' && movement.totalValue > 0 && (
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Total Value</Text>
                                <Text style={styles.totalValue}>{movement.totalValue.toFixed(2)} MAD</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Products List */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Products ({movement.products?.length || 0})</Text>
                    
                    {movement.products?.map((product, index) => {
                        const stockChange = getStockChangeColor(product.newStock, product.previousStock);
                        const changeAmount = product.newStock - product.previousStock;
                        
                        return (
                            <View key={`${product.productId}-${index}`} style={styles.productCard}>
                                <View style={styles.productHeader}>
                                    <Text style={styles.productNumber}>#{index + 1}</Text>
                                    <Text style={styles.productName}>{product.productName}</Text>
                                </View>
                                
                                <View style={styles.productDetails}>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Quantity:</Text>
                                        <Text style={styles.detailValue}>
                                            {product.quantity} {product.unit}
                                        </Text>
                                    </View>
                                    
                                    {movement.type === 'stock_in' && product.unitPrice > 0 && (
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Unit Price:</Text>
                                            <Text style={styles.detailValue}>
                                                {product.unitPrice.toFixed(2)} MAD
                                            </Text>
                                        </View>
                                    )}
                                    
                                    {movement.type === 'stock_in' && product.total > 0 && (
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Total:</Text>
                                            <Text style={styles.detailValue}>
                                                {product.total.toFixed(2)} MAD
                                            </Text>
                                        </View>
                                    )}
                                    
                                    <View style={styles.stockChange}>
                                        <Text style={styles.stockChangeLabel}>Stock Change:</Text>
                                        <View style={styles.stockValues}>
                                            <Text style={[styles.stockPrevious, { color: stockChange.arrow }]}>
                                                {product.previousStock} →
                                            </Text>
                                            <Text style={styles.stockNew}>
                                                {product.newStock}
                                            </Text>
                                            <View style={[
                                                styles.stockChangeBadge,
                                                { backgroundColor: stockChange.badge }
                                            ]}>
                                                <Text style={[styles.stockChangeText, { color: stockChange.text }]}>
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

                {/* Notes */}
                {movement.notes && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Notes</Text>
                        <View style={styles.notesCard}>
                            <Text style={styles.notesText}>{movement.notes}</Text>
                        </View>
                    </View>
                )}

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
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

                {/* Footer Spacer */}
                <View style={styles.footerSpacer} />
            </ScrollView>
        </View>
    );
}

// Keep your existing getStyles function exactly as it was
const getStyles = (isDarkMode: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: isDarkMode ? "#0f172a" : "#f8fafc",
    },
    scrollContent: {
        flexGrow: 1,
        padding: 16,
    },
    header: {
        padding: 20,
        paddingTop: 60,
        paddingBottom: 16,
        backgroundColor: '#6366f1',
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },
    backButton: {
        position: 'absolute',
        top: 60,
        left: 20,
        zIndex: 1,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 4,
        textAlign: 'center',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#e0e7ff',
        opacity: 0.9,
        textAlign: 'center',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
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
    section: {
        backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDarkMode ? 0.1 : 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: isDarkMode ? "#f1f5f9" : "#1e293b",
        marginBottom: 16,
    },
    // Summary Section
    summaryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    typeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    typeBadgeIcon: {
        fontSize: 16,
        marginRight: 6,
    },
    typeBadgeText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    dateText: {
        fontSize: 14,
        color: isDarkMode ? "#94a3b8" : "#64748b",
        fontWeight: '500',
    },
    infoGrid: {
        gap: 16,
    },
    infoItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: isDarkMode ? "#334155" : "#e2e8f0",
    },
    infoLabel: {
        fontSize: 14,
        color: isDarkMode ? "#94a3b8" : "#64748b",
        fontWeight: '500',
    },
    infoValue: {
        fontSize: 14,
        color: isDarkMode ? "#f1f5f9" : "#1e293b",
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    totalValue: {
        fontSize: 14,
        color: '#10b981',
        fontWeight: 'bold',
    },
    departmentInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    departmentIcon: {
        fontSize: 16,
        marginRight: 8,
    },
    // Products Section
    productCard: {
        backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#6366f1',
    },
    productHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    productNumber: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#6366f1',
        marginRight: 12,
    },
    productName: {
        fontSize: 16,
        fontWeight: '600',
        color: isDarkMode ? "#f1f5f9" : "#1e293b",
        flex: 1,
    },
    productDetails: {
        gap: 8,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    detailLabel: {
        fontSize: 14,
        color: isDarkMode ? "#94a3b8" : "#64748b",
    },
    detailValue: {
        fontSize: 14,
        color: isDarkMode ? "#f1f5f9" : "#1e293b",
        fontWeight: '500',
    },
    stockChange: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: isDarkMode ? "#475569" : "#e2e8f0",
    },
    stockChangeLabel: {
        fontSize: 14,
        color: isDarkMode ? "#94a3b8" : "#64748b",
        fontWeight: '500',
    },
    stockValues: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    stockPrevious: {
        fontSize: 14,
        fontWeight: '500',
    },
    stockNew: {
        fontSize: 14,
        color: isDarkMode ? "#f1f5f9" : "#1e293b",
        fontWeight: '600',
    },
    stockChangeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    stockChangeText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    // Notes Section
    notesCard: {
        backgroundColor: isDarkMode ? "#334155" : "#f8fafc",
        borderRadius: 12,
        padding: 16,
    },
    notesText: {
        fontSize: 14,
        color: isDarkMode ? "#f1f5f9" : "#1e293b",
        lineHeight: 20,
    },
    // Action Buttons
    actionButtons: {
        marginTop: 8,
        marginBottom: 24,
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ef4444',
        padding: 16,
        borderRadius: 12,
        gap: 8,
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