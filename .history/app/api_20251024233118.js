// api.js - Version complète corrigée
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.0.178:3001";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`);
    if (config.data) {
      console.log('📦 Request Data:', config.data);
    }
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`✅ ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('❌ Response Error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    });
    return Promise.reject(error);
  }
);

// Products API
export const getProducts = async () => {
  try {
    console.log('🔍 API_URL:', API_URL);
    console.log('📦 Fetching products from:', `${API_URL}/api/products`);
    
    const response = await api.get("/api/products");
    
    console.log('✅ API Response status:', response.status);
    console.log('✅ API Response data structure:', Object.keys(response.data));
    console.log('✅ Products data:', response.data.data ? response.data.data.length : 'no data');
    
    return response;
    
  } catch (error) {
    console.error('❌ Detailed API Error:', {
      message: error.message,
      code: error.code,
      response: error.response ? {
        status: error.response.status,
        data: error.response.data
      } : 'No response',
      request: error.request ? 'Request made but no response' : 'No request made'
    });
    
    // Pour le développement, retourner des données mock en cas d'erreur
    console.log('⚠️ Using mock data due to API error');
    const mockProducts = [
      {
        id: 'PROD000001',
        name: 'Organic Whole Milk',
        description: 'Fresh organic whole milk, 1 gallon',
        quantity: 50,
        unit: 'bottles',
        categories: ['CAT000002', 'CAT000007'],
        primaryCategory: 'CAT000002',
        departmentId: 'DEPT000001',
        unitPrice: 3.50,
        totalUsed: 0,
        lastUsed: null,
        imageUrl: 'https://example.com/images/milk.jpg',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'PROD000002', 
        name: 'Whole Wheat Bread',
        description: 'Freshly baked whole wheat bread',
        quantity: 25,
        unit: 'loaves',
        categories: ['CAT000001'],
        primaryCategory: 'CAT000001',
        departmentId: 'DEPT000001',
        unitPrice: 2.75,
        totalUsed: 0,
        lastUsed: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    
    return {
      data: {
        success: true,
        data: mockProducts,
        total: mockProducts.length
      }
    };
  }
};

export const createProduct = async (productData) => {
  try {
    console.log('📤 Creating product:', productData);
    const response = await api.post('/api/products', productData);
    console.log('✅ Product created successfully:', response.data);
    return response;
  } catch (error) {
    console.error('❌ Error creating product:', error.response?.data || error.message);
    throw error;
  }
};

export const updateProduct = (id, product) => {
  console.log('✏️ Updating product:', id);
  return api.put(`/api/products/${id}`, product);
};

export const deleteProduct = (id) => {
  console.log('🗑️ Deleting product:', id);
  return api.delete(`/api/products/${id}`);
};

// Stock Movements API
export const createMovement = async (movementData) => {
  try {
    console.log('🔄 Creating stock movement:', movementData);
    const response = await api.post('/api/movements', movementData);
    return {
      success: true,
      data: response.data.data,
      message: response.data.message
    };
  } catch (error) {
    console.error('❌ Error creating stock movement:', error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to create stock movement',
      errors: error.response?.data?.errors || []
    };
  }
};

export const getStockHistory = async (filters = {}) => {
  try {
    const { type, departmentId, startDate, endDate, page, limit } = filters;
    
    const params = new URLSearchParams();
    if (type && type !== 'all') params.append('type', type);
    if (departmentId && departmentId !== 'all') params.append('departmentId', departmentId);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());

    const response = await api.get(`/api/movements?${params}`);
    
    return {
      success: true,
      data: response.data.data,
      pagination: response.data.pagination
    };
  } catch (error) {
    console.error('❌ Error fetching stock history:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to fetch stock history',
      data: []
    };
  }
};

export const getDepartmentStock = async (departmentId) => {
  try {
    const response = await api.get(`/api/movements/department/${departmentId}`);
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.error('❌ Error fetching department stock:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to fetch department stock',
      data: null
    };
  }
};

export const getMovementStatistics = async (period = 'month') => {
  try {
    const response = await api.get(`/api/movements/stats/overview?period=${period}`);
    return {
      success: true,
      data: response.data.data,
      period: period
    };
  } catch (error) {
    console.error('❌ Error fetching movement statistics:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to fetch statistics',
      data: null
    };
  }
};

// Category API
export const createCategory = async (categoryData) => {
  try {
    console.log('📤 Creating category:', categoryData);
    const response = await api.post('/api/categories', categoryData);
    console.log('✅ Category created successfully:', response.data);
    return response;
  } catch (error) {
    console.error('❌ Error creating category:', error.response?.data || error.message);
    throw error;
  }
};

export const getCategories = async () => {
  try {
    console.log('📂 Fetching categories...');
    const response = await api.get('/api/categories');
    console.log('✅ Categories fetched successfully:', response.data);
    return response.data.data || response.data || [];
  } catch (error) {
    console.error('❌ Error fetching categories:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      const defaultCategories = [
        { id: 'CAT000001', name: 'Bakery products', type: 'default', color: '#f59e0b', icon: '🍞' },
        { id: 'CAT000002', name: 'Dairy', type: 'default', color: '#60a5fa', icon: '🥛' },
        { id: 'CAT000003', name: 'Produce', type: 'default', color: '#22c55e', icon: '🥦' },
        { id: 'CAT000004', name: 'Meat', type: 'default', color: '#ef4444', icon: '🥩' },
        { id: 'CAT000005', name: 'Beverages', type: 'default', color: '#8b5cf6', icon: '🥤' },
        { id: 'CAT000006', name: 'Dry Goods', type: 'default', color: '#d946ef', icon: '🫘' },
        { id: 'CAT000007', name: 'Frozen', type: 'default', color: '#0ea5e9', icon: '❄️' }
      ];
      return defaultCategories;
    }
    
    throw error;
  }
};

export const updateCategory = async (categoryId, categoryData) => {
  try {
    console.log('✏️ Updating category:', categoryId, categoryData);
    const response = await api.put(`/api/categories/${categoryId}`, categoryData);
    console.log('✅ Category updated successfully:', response.data);
    return response;
  } catch (error) {
    console.error('❌ Error updating category:', error.response?.data || error.message);
    throw error;
  }
};

export const deleteCategory = async (categoryId) => {
  try {
    console.log('🗑️ Deleting category:', categoryId);
    const response = await api.delete(`/api/categories/${categoryId}`);
    console.log('✅ Category deleted successfully:', response.data);
    return response;
  } catch (error) {
    console.error('❌ Error deleting category:', error.response?.data || error.message);
    throw error;
  }
};

// Departments API
export const getDepartments = async () => {
  try {
    console.log('🏢 Fetching departments...');
    const response = await api.get('/api/departments');
    console.log('✅ Departments fetched successfully:', response.data);
    return response.data.data || response.data || [];
  } catch (error) {
    console.error('❌ Error fetching departments:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      return [{ id: 'DEPT000001', name: 'Main Department', description: 'Default main department' }];
    }
    
    throw error;
  }
};

// Dashboard API - FONCTIONS MANQUANTES AJOUTÉES
export const getDashboardStats = async (period = 'daily') => {
  try {
    console.log(`📊 Fetching dashboard stats for period: ${period}`);
    
    // Pour l'instant, simuler les données jusqu'à ce que vous créiez l'endpoint backend
    const mockStats = {
      totalProducts: 45,
      lowStockItems: 3,
      totalMovements: 128,
      recentActivity: 12
    };
    
    return {
      success: true,
      data: mockStats
    };
    
    // Décommentez quand vous aurez l'endpoint backend :
    // const response = await api.get(`/api/dashboard/stats?period=${period}`);
    // return {
    //   success: true,
    //   data: response.data.data
    // };
    
  } catch (error) {
    console.error('❌ Error fetching dashboard stats:', error);
    
    // Retourner des données mock en cas d'erreur
    const mockStats = {
      totalProducts: 45,
      lowStockItems: 3,
      totalMovements: 128,
      recentActivity: 12
    };
    
    return {
      success: true,
      data: mockStats
    };
  }
};

export const getOutOfStockProducts = async () => {
  try {
    console.log('📦 Fetching out of stock products');
    
    // Pour l'instant, simuler les données
    const mockOutOfStock = [];
    
    return {
      success: true,
      data: mockOutOfStock
    };
    
    // Décommentez quand vous aurez l'endpoint backend :
    // const response = await api.get('/api/products/out-of-stock');
    // return {
    //   success: true,
    //   data: response.data.data
    // };
    
  } catch (error) {
    console.error('❌ Error fetching out of stock products:', error);
    return {
      success: true,
      data: []
    };
  }
};

// ============================================================================
// PRODUCT USAGE ANALYTICS API - NEW FUNCTIONS
// ============================================================================

// Get current month usage for a product
export const getCurrentMonthUsage = async (productId) => {
  try {
    console.log(`📊 Fetching current month usage for product: ${productId}`);
    
    const response = await api.get(`/api/products/${productId}/current-month-usage`);
    
    console.log('✅ Current month usage fetched successfully:', response.data);
    
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.error('❌ Error fetching current month usage:', error.response?.data || error.message);
    
    // Return mock data for development
    const mockUsage = {
      productId: productId,
      productName: 'Mock Product',
      currentMonthUsage: 25
    };
    
    return {
      success: true,
      data: mockUsage
    };
  }
};

// Get detailed usage stats for a product
export const getUsageStats = async (productId, month = null, year = null) => {
  try {
    console.log(`📈 Fetching usage stats for product: ${productId}`, { month, year });
    
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    if (year) params.append('year', year);
    
    const url = `/api/products/${productId}/usage-stats${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await api.get(url);
    
    console.log('✅ Usage stats fetched successfully:', response.data);
    
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.error('❌ Error fetching usage stats:', error.response?.data || error.message);
    
    // Return mock data for development
    const mockStats = {
      productId: productId,
      productName: 'Mock Product',
      usageStats: {
        period: 'October 2025',
        month: 10,
        year: 2025,
        totalUsed: 25,
        averageDailyUsage: 0.806,
        usageCount: 2,
        daysInMonth: 31,
        estimatedDaysRemaining: 12,
        monthlyUsage: [
          {
            date: "2025-10-22T15:24:10.731Z",
            quantityUsed: 15,
            movementId: "MOV000011",
            notes: "U",
            usedBy: "System",
            departmentId: "DEPT000002"
          },
          {
            date: "2025-10-23T10:39:19.103Z",
            quantityUsed: 10,
            movementId: "MOV000015",
            notes: "",
            usedBy: "Ahmed",
            departmentId: "DEPT000001"
          }
        ]
      }
    };
    
    return {
      success: true,
      data: mockStats
    };
  }
};

// Get comprehensive usage analytics for a product
export const getUsageHistoryAnalytics = async (productId, previousMonths = 3) => {
  try {
    console.log(`📊 Fetching usage analytics for product: ${productId}`, { previousMonths });
    
    const response = await api.get(`/api/products/${productId}/usage-analytics?previousMonths=${previousMonths}`);
    
    console.log('✅ Usage analytics fetched successfully:', response.data);
    
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.error('❌ Error fetching usage analytics:', error.response?.data || error.message);
    
    // Return comprehensive mock data for development
    const mockAnalytics = {
      productId: productId,
      productName: 'Whole Wheat Bread',
      analytics: {
        currentMonth: {
          period: "October 2025",
          month: 10,
          year: 2025,
          totalUsed: 25,
          averageDailyUsage: 0.806,
          usageCount: 2,
          daysInMonth: 31,
          estimatedDaysRemaining: 12,
          monthlyUsage: [
            {
              date: "2025-10-22T15:24:10.731Z",
              quantityUsed: 15,
              movementId: "MOV000011",
              notes: "U",
              usedBy: "System",
              departmentId: "DEPT000002"
            },
            {
              date: "2025-10-23T10:39:19.103Z",
              quantityUsed: 10,
              movementId: "MOV000015",
              notes: "",
              usedBy: "Ahmed",
              departmentId: "DEPT000001"
            }
          ]
        },
        previousMonths: [
          {
            period: "September 2025",
            month: 9,
            year: 2025,
            totalUsed: 0,
            averageDailyUsage: 0,
            usageCount: 0,
            daysInMonth: 30,
            estimatedDaysRemaining: Infinity,
            monthlyUsage: []
          },
          {
            period: "August 2025",
            month: 8,
            year: 2025,
            totalUsed: 0,
            averageDailyUsage: 0,
            usageCount: 0,
            daysInMonth: 31,
            estimatedDaysRemaining: Infinity,
            monthlyUsage: []
          },
          {
            period: "July 2025",
            month: 7,
            year: 2025,
            totalUsed: 0,
            averageDailyUsage: 0,
            usageCount: 0,
            daysInMonth: 31,
            estimatedDaysRemaining: Infinity,
            monthlyUsage: []
          }
        ],
        comparisons: [
          {
            comparedTo: "September 2025",
            usageChange: 100,
            trend: "significant_increase",
            currentMonthTotal: 25,
            comparedMonthTotal: 0,
            absoluteChange: 25
          },
          {
            comparedTo: "August 2025",
            usageChange: 100,
            trend: "significant_increase",
            currentMonthTotal: 25,
            comparedMonthTotal: 0,
            absoluteChange: 25
          },
          {
            comparedTo: "July 2025",
            usageChange: 100,
            trend: "significant_increase",
            currentMonthTotal: 25,
            comparedMonthTotal: 0,
            absoluteChange: 25
          }
        ],
        summary: {
          totalMonthsAnalyzed: 4,
          averageMonthlyUsage: 6.25,
          highestUsage: {
            period: "October 2025",
            totalUsed: 25
          },
          lowestUsage: {
            period: "September 2025",
            totalUsed: 0
          },
          overallTrend: "significant_increase",
          currentStock: 10,
          estimatedMonthsRemaining: 1.6
        }
      }
    };
    
    return {
      success: true,
      data: mockAnalytics
    };
  }
};

// Get low stock products
export const getLowStockProducts = async (limit = 10) => {
  try {
    console.log(`📉 Fetching low stock products, limit: ${limit}`);
    
    // For now, simulate the data until you create the backend endpoint
    const mockLowStock = [
      {
        id: 'PROD000002',
        name: 'Whole Wheat Bread',
        currentStock: 10,
        alertLevel: 'Low Stock',
        unit: 'loaves'
      },
      {
        id: 'PROD000009', 
        name: 'Mm',
        currentStock: 5,
        alertLevel: 'Low Stock',
        unit: 'can'
      }
    ];
    
    return {
      success: true,
      data: mockLowStock.slice(0, limit)
    };
    
    // Uncomment when you have the backend endpoint:
    // const response = await api.get(`/api/products/low-stock?limit=${limit}`);
    // return {
    //   success: true,
    //   data: response.data.data
    // };
    
  } catch (error) {
    console.error('❌ Error fetching low stock products:', error);
    return {
      success: true,
      data: []
    };
  }
};
// Health check
export const healthCheck = async () => {
  try {
    console.log('🏥 Performing health check...');
    const response = await api.get("/health");
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('❌ Health check failed:', error);
    return {
      success: false,
      message: 'Server is not responding'
    };
  }
};

// Test connection
export const testConnection = async () => {
  try {
    console.log('🔌 Testing API connection...');
    const response = await api.get("/api/test");
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('❌ API connection test failed:', error);
    return {
      success: false,
      message: 'Cannot connect to API'
    };
  }
};

// Utility functions for error handling
export const handleApiError = (error) => {
  console.error('🔧 API Error Handler:', error);
  
  if (error.response) {
    const status = error.response.status;
    const message = error.response.data?.message || 'Server error';
    
    switch (status) {
      case 400:
        return { success: false, message: 'Bad request: ' + message };
      case 401:
        return { success: false, message: 'Unauthorized access' };
      case 404:
        return { success: false, message: 'Resource not found' };
      case 409:
        return { success: false, message: 'Conflict: ' + message };
      case 500:
        return { success: false, message: 'Server error, please try again later' };
      default:
        return { success: false, message: `Error ${status}: ${message}` };
    }
  } else if (error.request) {
    return { success: false, message: 'Network error. Please check your connection.' };
  } else {
    return { success: false, message: error.message || 'Unknown error occurred' };
  }
};

// Export default for convenience
// Export default for convenience
export default {
  // Products
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  
  // Product Usage Analytics - NEW
  getCurrentMonthUsage,
  getUsageStats,
  getUsageHistoryAnalytics,
  getLowStockProducts,
  
  // Categories
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
  
  // Departments
  getDepartments,
  
  // Stock Movements
  createMovement,
  getStockHistory,
  getDepartmentStock,
  getMovementStatistics,
  
  // Dashboard
  getDashboardStats,
  getOutOfStockProducts,
  
  // Utilities
  handleApiError,
  healthCheck,
  testConnection,
  
  // Axios instance
  api
};