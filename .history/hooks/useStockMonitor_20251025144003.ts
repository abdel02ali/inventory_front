import { useEffect } from 'react';
import { useAppContext } from '../app/context//appContext';
import { useNotifications } from '../app/context/NotificationContext';
import { Product } from '../app/types/model';

interface UsageHistoryItem {
  productId: string;
  quantityUsed?: number;
  quantity?: number;
  date?: string;
  timestamp?: string;
}

export const useStockMonitor = () => {
  const { scheduleLowStockAlert, scheduleOutOfStockAlert, scheduleUsageSpikeAlert } = useNotifications();
  const { products } = useAppContext();

  // Monitor stock levels
  useEffect(() => {
    if (!products || products.length === 0) return;

    console.log('🔍 Monitoring stock levels for', products.length, 'products');

    products.forEach((product: Product) => {
      const currentStock = product.quantity || 0;
      const lowStockThreshold = product.lowStockThreshold || 10;
      const productName = product.name || 'Unknown Product';

      console.log(`📦 ${productName}: ${currentStock} stock (threshold: ${lowStockThreshold})`);

      // Check for out of stock
      if (currentStock === 0) {
        console.log('🚨 Out of stock alert for:', productName);
        scheduleOutOfStockAlert(productName);
      }
      // Check for low stock
      else if (currentStock <= lowStockThreshold) {
        console.log('⚠️ Low stock alert for:', productName, 'Current:', currentStock, 'Threshold:', lowStockThreshold);
        scheduleLowStockAlert(productName, currentStock);
      }
    });
  }, [products, scheduleLowStockAlert, scheduleOutOfStockAlert]);

  // Monitor usage spikes (optional - implement when you have usage data)
  useEffect(() => {
    // This is commented out until you have usage history data
    // You can implement this later when you track product usage
    
    /*
    if (!usageHistory || usageHistory.length === 0) return;

    console.log('📊 Monitoring usage patterns...');

    // Group usage by product and calculate averages
    const usageByProduct: { [key: string]: { total: number; count: number; dates: string[] } } = {};

    usageHistory.forEach((usage: UsageHistoryItem) => {
      const productId = usage.productId;
      if (!usageByProduct[productId]) {
        usageByProduct[productId] = { total: 0, count: 0, dates: [] };
      }
      const quantityUsed = usage.quantityUsed || usage.quantity || 0;
      usageByProduct[productId].total += quantityUsed;
      usageByProduct[productId].count += 1;
      if (usage.date || usage.timestamp) {
        usageByProduct[productId].dates.push(usage.date || usage.timestamp || '');
      }
    });

    // Check for usage spikes (last 7 days vs previous average)
    Object.entries(usageByProduct).forEach(([productId, data]) => {
      const product = products.find((p: Product) => p.id === productId);
      if (!product) return;

      const averageUsage = data.count > 0 ? data.total / data.count : 0;
      
      // Calculate recent usage (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const recentUsageCount = data.dates.filter(dateString => {
        try {
          const usageDate = new Date(dateString);
          return usageDate > sevenDaysAgo;
        } catch {
          return false;
        }
      }).length;

      const increasePercentage = averageUsage > 0 ? ((recentUsageCount - averageUsage) / averageUsage) * 100 : 0;

      if (increasePercentage >= 50) { // 50% increase threshold
        console.log('📈 Usage spike detected for:', product.name, 'Increase:', increasePercentage.toFixed(1) + '%');
        scheduleUsageSpikeAlert(
          product.name,
          recentUsageCount,
          averageUsage
        );
      }
    });
    */
  }, [/* usageHistory, */ products, scheduleUsageSpikeAlert]);

  // Return any necessary data or functions
  return {
    // You can add functions here if needed, for example:
    // manuallyCheckStock: () => { ... }
  };
};