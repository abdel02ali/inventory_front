// api/dashboard.ts
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL ;

export const getDashboardStats = async (period = 'daily') => {
  try {
    console.log(`📊 Fetching dashboard stats for period: ${period}`);
    
    const response = await axios.get(`${API_URL}/api/dashboard/stats?period=${period}`);
    
    console.log('✅ Dashboard stats received:', response.data);
    
    return {
      success: true,
      data: response.data.data
    };
    
  } catch (error: any) {
    console.error('❌ Error fetching dashboard stats:', error.response?.data || error.message);
    
    // Fallback mock data
    const mockStats = {
      totalProducts: 0,
      outOfStock: 0,
      lowStock: 0,
      totalDepartments: 0,
      totalMovements: 0,
      recentActivity: 0
    };
    
    return {
      success: false,
      data: mockStats,
      message: error.response?.data?.message || 'Failed to fetch dashboard stats'
    };
  }
};

export const getOutOfStockProducts = async () => {
  try {
    console.log('📦 Fetching out of stock products');
    
    const response = await axios.get(`${API_URL}/api/dashboard/out-of-stock`);
    
    console.log('✅ Out of stock products received:', response.data.data?.length);
    
    return {
      success: true,
      data: response.data.data || []
    };
    
  } catch (error: any) {
    console.error('❌ Error fetching out of stock products:', error.response?.data || error.message);
    
    return {
      success: false,
      data: [],
      message: error.response?.data?.message || 'Failed to fetch out of stock products'
    };
  }
};

export const getLowStockProducts = async (threshold = 10) => {
  try {
    console.log(`📦 Fetching low stock products (threshold: ${threshold})`);
    
    const response = await axios.get(`${API_URL}/api/dashboard/low-stock?threshold=${threshold}`);
    
    return {
      success: true,
      data: response.data.data || []
    };
    
  } catch (error: any) {
    console.error('❌ Error fetching low stock products:', error.response?.data || error.message);
    
    return {
      success: false,
      data: [],
      message: error.response?.data?.message || 'Failed to fetch low stock products'
    };
  }
};

export const getRecentMovements = async (limit = 5) => {
  try {
    console.log(`📄 Fetching ${limit} recent movements`);
    
    const response = await axios.get(`${API_URL}/api/dashboard/recent-movements?limit=${limit}`);
    
    return {
      success: true,
      data: response.data.data || []
    };
    
  } catch (error: any) {
    console.error('❌ Error fetching recent movements:', error.response?.data || error.message);
    
    return {
      success: false,
      data: [],
      message: error.response?.data?.message || 'Failed to fetch recent movements'
    };
  }
};