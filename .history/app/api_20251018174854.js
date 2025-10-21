import axios from "axios";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

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
export const getProducts = () => {
  console.log('📦 Fetching products...');
  return api.get("/products");
};

export const createProduct = async (productData) => {
  try {
    console.log('📤 Creating product:', productData);
    const response = await api.post('/products', productData);
    console.log('✅ Product created successfully:', response.data);
    return response;
  } catch (error) {
    console.error('❌ Error creating product:', error.response?.data || error.message);
    
    const errorData = error.response?.data;
    
    if (errorData) {
      const errorMessage = errorData.error || errorData.message || errorData.details || '';
      const errorString = typeof errorMessage === 'string' ? errorMessage.toLowerCase() : JSON.stringify(errorMessage).toLowerCase();
      
      if (errorString.includes('already exists') || 
          errorString.includes('duplicate') ||
          errorString.includes('unique')) {
        throw new Error('DUPLICATE_PRODUCT');
      }
      
      if (errorString.includes('validation') || errorString.includes('required') || errorString.includes('invalid')) {
        throw new Error('VALIDATION_ERROR');
      }
    }
    
    if (error.message === 'Network Error' || error.code === 'NETWORK_ERROR') {
      throw new Error('NETWORK_ERROR');
    }
    
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      throw new Error('Request timeout');
    }
    
    throw error;
  }
};

export const updateProduct = (id, product) => {
  console.log('✏️ Updating product:', id);
  return api.put(`/products/${id}`, product);
};

export const deleteProduct = (id) => {
  console.log('🗑️ Deleting product:', id);
  return api.delete(`/products/${id}`);
};

export const addProductQuantities = (products) => {
  console.log('➕ Adding quantities to products:', products);
  return api.post("/products/add-quantities", { products });
};

export const removeProductQuantities = async (products) => {
  try {
    console.log('📤 Removing product quantities:', products);
    
    const response = await api.post('/products/remove-quantities', {
      products: products.map(p => ({
        productId: p.productId,
        quantityToRemove: p.quantityToRemove
      }))
    });

    console.log('✅ Quantities removed successfully:', response.data);
    return response;
  } catch (error) {
    console.error('❌ Failed to remove quantities:', error);
    throw error;
  }
};

// Clients API
export const getClients = () => {
  console.log('👥 Fetching clients...');
  return api.get("/clients");
};

export const createClient = (client) => {
  console.log('🆕 Creating client:', client);
  return api.post("/clients", client);
};

export const updateClient = (id, client) => {
  console.log('✏️ Updating client:', id);
  return api.put(`/clients/${id}`, client);
};

export const deleteClient = (id) => {
  console.log('🗑️ Deleting client:', id);
  return api.delete(`/clients/${id}`);
};

// Stock Movement API
export const stockMovementService = {
  async createMovement(movementData) {
    try {
      console.log('🔄 Creating stock movement:', movementData);
      
      const response = await axios.post(`${API_URL}/api/stock/movements`, movementData);
      
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
  },

  async getStockHistory(filters = {}) {
    try {
      const { type, department, startDate, endDate, page, limit } = filters;
      
      const params = new URLSearchParams();
      if (type) params.append('type', type);
      if (department) params.append('department', department);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (page) params.append('page', page.toString());
      if (limit) params.append('limit', limit.toString());

      const response = await axios.get(`${API_URL}/api/stock/history?${params}`);
      
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
  },

  async getDepartmentStock(department) {
    try {
      const response = await axios.get(`${API_URL}/api/stock/departments/${department}`);
      
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
  }
};

// Settings API
export const getSettings = () => {
  console.log('⚙️ Fetching settings...');
  return api.get("/settings");
};

export const updateSettings = (settings) => {
  console.log('✏️ Updating settings:', settings);
  return api.put("/settings", settings);
};

// Dashboard API
export const getDashboardStats = async (period = 'daily') => {
  try {
    console.log(`📊 Fetching dashboard stats for period: ${period}`);
    const response = await api.get(`/dashboard/stats?period=${period}`);
    console.log('✅ Dashboard stats received:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching dashboard stats:', error);
    throw error;
  }
};

export const getRecentInvoices = async (limit = 5) => {
  try {
    console.log(`📋 Fetching ${limit} recent invoices`);
    const response = await api.get(`/dashboard/recent-invoices?limit=${limit}`);
    console.log('✅ Recent invoices received:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching recent invoices:', error);
    throw error;
  }
};

export const getOutOfStockProducts = async () => {
  try {
    console.log('📦 Fetching out of stock products');
    const response = await api.get('/dashboard/out-of-stock');
    console.log('✅ Out of stock products received:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching out of stock products:', error);
    throw error;
  }
};

// Category API functions
// Category API functions
export const createCategory = async (categoryData) => {
  try {
    console.log('📤 Creating category:', categoryData);
    const response = await api.post('/categories', categoryData);
    console.log('✅ Category created successfully:', response.data);
    return response;
  } catch (error) {
    console.error('❌ Error creating category:', error.response?.data || error.message);
    
    const errorData = error.response?.data;
    
    if (errorData) {
      const errorMessage = errorData.error || errorData.message || errorData.details || '';
      const errorString = typeof errorMessage === 'string' ? errorMessage.toLowerCase() : JSON.stringify(errorMessage).toLowerCase();
      
      if (errorString.includes('already exists') || 
          errorString.includes('duplicate') ||
          errorString.includes('unique')) {
        throw new Error('DUPLICATE_CATEGORY');
      }
      
      if (errorString.includes('validation') || errorString.includes('required') || errorString.includes('invalid')) {
        throw new Error('VALIDATION_ERROR');
      }
    }
    
    if (error.message === 'Network Error' || error.code === 'NETWORK_ERROR') {
      throw new Error('NETWORK_ERROR');
    }
    
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      throw new Error('Request timeout');
    }
    
    throw error;
  }
};

export const getCategories = async () => {
  try {
    console.log('📂 Fetching categories...');
    const response = await api.get('/categories');
    console.log('✅ Categories fetched successfully:', response.data);
    
    // Return just the data array for consistency
    return response.data.data || [];
  } catch (error) {
    console.error('❌ Error fetching categories:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      console.log('📂 Categories endpoint not found, returning default categories');
      const predefinedCategories = [
        'Vegetables', 'Fruits', 'Meat', 'Seafood', 'Dairy', 'Herbs & Spices',
        'Grains & Pasta', 'Oils & Vinegars', 'Canned Goods', 'Bakery', 'Beverages',
        'Cleaning Supplies', 'Paper Goods', 'Utensils', 'Equipment', 'Frozen Foods',
        'Condiments', 'Spices', 'Baking Supplies', 'Fresh Herbs'
      ];
      
      return predefinedCategories.map(name => ({
        _id: `predefined-${name.toLowerCase().replace(/\s+/g, '-')}`,
        name,
        type: 'predefined',
        productCount: 0
      }));
    }
    
    if (error.message === 'Network Error' || error.code === 'NETWORK_ERROR') {
      throw new Error('NETWORK_ERROR');
    }
    
    throw error;
  }
};

export const updateCategory = async (categoryId, categoryData) => {
  try {
    console.log('✏️ Updating category:', categoryId, categoryData);
    const response = await api.put(`/categories/${categoryId}`, categoryData);
    console.log('✅ Category updated successfully:', response.data);
    return response;
  } catch (error) {
    console.error('❌ Error updating category:', error.response?.data || error.message);
    
    const errorData = error.response?.data;
    
    if (errorData) {
      const errorMessage = errorData.error || errorData.message || errorData.details || '';
      const errorString = typeof errorMessage === 'string' ? errorMessage.toLowerCase() : JSON.stringify(errorMessage).toLowerCase();
      
      if (errorString.includes('already exists') || 
          errorString.includes('duplicate') ||
          errorString.includes('unique')) {
        throw new Error('DUPLICATE_CATEGORY');
      }
      
      if (errorString.includes('validation') || errorString.includes('required') || errorString.includes('invalid')) {
        throw new Error('VALIDATION_ERROR');
      }
      
      if (errorString.includes('not found') || errorString.includes('does not exist')) {
        throw new Error('CATEGORY_NOT_FOUND');
      }
    }
    
    if (error.message === 'Network Error' || error.code === 'NETWORK_ERROR') {
      throw new Error('NETWORK_ERROR');
    }
    
    throw error;
  }
};

export const deleteCategory = async (categoryId) => {
  try {
    console.log('🗑️ Deleting category:', categoryId);
    const response = await api.delete(`/categories/${categoryId}`);
    console.log('✅ Category deleted successfully:', response.data);
    return response;
  } catch (error) {
    console.error('❌ Error deleting category:', error.response?.data || error.message);
    
    const errorData = error.response?.data;
    
    if (errorData) {
      const errorMessage = errorData.error || errorData.message || errorData.details || '';
      const errorString = typeof errorMessage === 'string' ? errorMessage.toLowerCase() : JSON.stringify(errorMessage).toLowerCase();
      
      if (errorString.includes('not found') || errorString.includes('does not exist')) {
        throw new Error('CATEGORY_NOT_FOUND');
      }
      
      if (errorString.includes('in use') || errorString.includes('associated')) {
        throw new Error('CATEGORY_IN_USE');
      }
    }
    
    if (error.message === 'Network Error' || error.code === 'NETWORK_ERROR') {
      throw new Error('NETWORK_ERROR');
    }
    
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      throw new Error('Request timeout');
    }
    
    throw error;
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

// Health check
export const healthCheck = () => {
  console.log('🏥 Performing health check...');
  return api.get("/health");
};

// Export default for convenience
export default {
  // Products
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  addProductQuantities,
  removeProductQuantities,
  
  // Clients
  getClients,
  createClient,
  updateClient,
  deleteClient,
  
  // Categories
  createCategory,
  getCategories,
  deleteCategory,
  updateCategory,
  
  // Settings
  getSettings,
  updateSettings,
  
  // Dashboard
  getDashboardStats,
  getRecentInvoices,
  getOutOfStockProducts,
  
  // Stock Movements
  stockMovementService,
  
  // Utilities
  handleApiError,
  healthCheck,
  
  // Axios instance
  api
};