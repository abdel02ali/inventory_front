import { useEffect } from 'react';
import { useApp } from '../context/appContext'; // Adjust import based on your app context
import { useNotifications } from '../contexts/NotificationContext';

export const useStockMonitor = () => {
  const { scheduleLowStockAlert, scheduleOutOfStockAlert, scheduleUsageSpikeAlert } = useNotifications();
  const { products, usageHistory } = useApp(); // Adjust based on your data structure

  // Monitor stock levels
  useEffect(() => {
    if (!products || products.length === 0) return;

    products.forEach(product => {
      const currentStock = product.quantity || product.currentStock || 0;
      const lowStockThreshold = product.lowStockThreshold || 10;

      // Check for out of stock
      if (currentStock === 0) {
        scheduleOutOfStockAlert(product.name || product.productName);
      }
      // Check for low stock
      else if (currentStock <= lowStockThreshold) {
        scheduleLowStockAlert(product.name || product.productName, currentStock);
      }
    });
  }, [products]);

  // Monitor usage spikes
  useEffect(() => {
    if (!usageHistory || usageHistory.length === 0) return;

    // Group usage by product and calculate averages
    const usageByProduct: { [key: string]: { total: number; count: number; dates: string[] } } = {};

    usageHistory.forEach(usage => {
      const productId = usage.productId;
      if (!usageByProduct[productId]) {
        usageByProduct[productId] = { total: 0, count: 0, dates: [] };
      }
      usageByProduct[productId].total += usage.quantityUsed || usage.quantity || 0;
      usageByProduct[productId].count += 1;
      usageByProduct[productId].dates.push(usage.date || usage.timestamp);
    });

    // Check for usage spikes (last 7 days vs previous average)
    Object.entries(usageByProduct).forEach(([productId, data]) => {
      const product = products.find(p => p.id === productId || p.productId === productId);
      if (!product) return;

      const averageUsage = data.total / data.count;
      const recentUsage = data.dates
        .filter(date => {
          const usageDate = new Date(date);
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          return usageDate > sevenDaysAgo;
        })
        .length;

      if (recentUsage > averageUsage * 1.5) { // 50% increase
        scheduleUsageSpikeAlert(
          product.name || product.productName,
          recentUsage,
          averageUsage
        );
      }
    });
  }, [usageHistory, products]);
};