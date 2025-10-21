import axios from "axios";

const API_URL = process.env.EXPO_PUBLIC_API_URL; // Replace localhost with your backend IP if using real device

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 seconds timeout
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
    
    // Check various possible error message locations
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
    
    // Handle network errors
    if (error.message === 'Network Error' || error.code === 'NETWORK_ERROR') {
      throw new Error('NETWORK_ERROR');
    }
    
    // Handle timeout
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
// Remove quantities from products
// Remove quantities from products
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

// Invoices API



export const stockMovementService = {
  // Create stock movement (stock in or distribution)
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

  // Get stock history with filters
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

  // Get department-specific stock data
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

// Utility functions for error handling
export const handleApiError = (error) => {
  console.error('🔧 API Error Handler:', error);
  
  if (error.response) {
    // Server responded with error status
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
    // Network error
    return { success: false, message: 'Network error. Please check your connection.' };
  } else {
    // Other errors
    return { success: false, message: error.message || 'Unknown error occurred' };
  }
};

// Health check
export const healthCheck = () => {
  console.log('🏥 Performing health check...');
  return api.get("/health");
};
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
export const createCategory = async (categoryData: {
  name: string;
  type: 'predefined' | 'custom';
}) => {
  // Your API call to create a category
};

export const getCategories = async () {
  
};

export const deleteCategory = async (categoryId: string) => {
  // Your API call to delete a category
};


// Export default for convenience
export default {
  // Products
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  addProductQuantities,
  
  // Clients
  getClients,
  createClient,
  updateClient,
  deleteClient,
  
  // Invoices

  
  // Settings
  getSettings,
  updateSettings,
  
  // Utilities
  handleApiError,
  healthCheck,
  getOutOfStockProducts,
  getRecentInvoices,
    getDashboardStats,

  
  // Axios instance

};