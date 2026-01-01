import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL ;

// Export all types
// services/stockMovementService.ts

export type Department = 'pastry' | 'bakery' | 'cleaning' | 'magazin';
export type MovementType = 'stock_in' | 'distribution';

export interface ProductSelection {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
}

// Update the Department type to support both string and object formats
export type DepartmentInput = Department | {
  id: Department;
  name: string;
};

export interface StockMovementData {
  type: MovementType;
  department?: DepartmentInput; // Updated to use DepartmentInput
  supplier?: string;
  stockManager: string;
  notes?: string;
  products: ProductSelection[];
}

// Keep your existing interfaces...
export interface StockMovement {
  id: string;
  movementId: string;
  type: MovementType;
  department?: DepartmentInput; // Updated here too
  supplier?: string;
  stockManager: string;
  products: ProductSelection[];
  totalItems: number;
  totalValue?: number;
  notes: string;
  date: string;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ... rest of your existing code

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasMore?: boolean;
}

export interface MovementsResponse {
  success: boolean;
  data: StockMovement[];
  pagination: PaginationInfo;
}

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

// Retry helper function with exponential backoff
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on client errors (4xx) except timeout
      if (error.response?.status >= 400 && error.response?.status < 500) {
        const isTimeout = error.code === 'ECONNABORTED' || 
                         error.message?.includes('timeout') ||
                         error.message?.includes('buffering') ||
                         error.response?.data?.errors?.some((e: string) => 
                           e.includes('timeout') || 
                           e.includes('buffering') ||
                           e.includes('Connection operation')
                         );
        
        if (!isTimeout) {
          throw error;
        }
      }
      
      // Don't retry on last attempt
      if (attempt === maxRetries - 1) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`⏳ Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

export const stockMovementService = {
  // Create stock movement with retry logic
  async createMovement(movementData: StockMovementData): Promise<ServiceResponse<any>> {
    try {
      const productCount = movementData.products.length;
      console.log(`🔄 Creating stock movement with ${productCount} product(s)...`);
      
      // Increase timeout for multiple products (60 seconds)
      // MongoDB operations can take longer with multiple products
      const timeout = productCount > 5 ? 60000 : 30000;
      
      // Use retry logic for database timeout errors
      const response = await retryWithBackoff(async () => {
        return await axios.post(`${API_URL}/api/movements`, movementData, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          timeout: timeout,
        });
      }, 3, 2000); // 3 retries with 2s, 4s, 8s delays
      
      console.log('✅ Server response:', {
        status: response.status,
        statusText: response.statusText,
      });
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error: any) {
      console.error('❌ Error creating stock movement:');
      console.error('❌ Error message:', error.message);
      console.error('❌ Error code:', error.code);
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        const errorData = error.response.data;
        const errorMessage = errorData?.message || `Server error: ${error.response.status}`;
        const errors = errorData?.errors || [];
        
        // Check for MongoDB timeout errors
        const isTimeoutError = errors.some((e: string) => 
          e.includes('timeout') || 
          e.includes('buffering') ||
          e.includes('Connection operation')
        );
        
        if (isTimeoutError) {
          return {
            success: false,
            message: 'Database operation timed out. This can happen when processing many products at once. Please try again or add products in smaller batches.',
            errors: ['Database timeout - try adding fewer products at once']
          };
        }
        
        return {
          success: false,
          message: errorMessage,
          errors: errors.length > 0 ? errors : [`Status: ${error.response.status}`]
        };
      } else if (error.request) {
        // Check if it's a timeout error
        const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
        
        if (isTimeout) {
          return {
            success: false,
            message: 'Request timed out. The server is taking too long to process your request. Please try again or add products in smaller batches.',
            errors: ['Request timeout']
          };
        }
        
        // The request was made but no response was received
        return {
          success: false,
          message: 'No response from server. Please check your internet connection.',
          errors: ['Network error']
        };
      } else {
        // Something happened in setting up the request that triggered an Error
        return {
          success: false,
          message: 'Failed to create stock movement',
          errors: [error.message]
        };
      }
    }
  },

  // Get all movements with filters
  async getMovements(filters: {
    type?: MovementType | 'all';
    department?: Department | 'all';
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<ServiceResponse<StockMovement[]>> {
    try {
      const params = new URLSearchParams();
      
      if (filters.type && filters.type !== 'all') params.append('type', filters.type);
      if (filters.department && filters.department !== 'all') params.append('department', filters.department);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());

      console.log('📡 Fetching movements from:', `${API_URL}/api/movements?${params}`);
      
      const response = await axios.get(`${API_URL}/api/movements?${params}`);
      
      console.log('✅ Movements response received:', {
        success: response.data.success,
        count: response.data.data?.length
      });
      
      // Ensure we always return an array, even if data is null/undefined
      const movementsData = response.data.data || [];
      
      return {
        success: true,
        data: movementsData,
        message: response.data.message
      };
    } catch (error: any) {
      console.error('❌ Error fetching movements:', error.response?.data || error.message);
      
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch movements',
        data: [], // Always return empty array on error
        errors: error.response?.data?.errors || []
      };
    }
  },

  // Get movement by ID
  async getMovementById(id: string): Promise<ServiceResponse<StockMovement>> {
    try {
      const response = await axios.get(`${API_URL}/api/movements/${id}`);
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error: any) {
      console.error('❌ Error fetching movement:', error);
      
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch movement',
        errors: error.response?.data?.errors || []
      };
    }
  },

  // Update movement
  async updateMovement(id: string, movementData: Partial<StockMovementData>): Promise<ServiceResponse<StockMovement>> {
    try {
      const response = await axios.put(`${API_URL}/api/movements/${id}`, movementData);
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error: any) {
      console.error('❌ Error updating movement:', error);
      
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update movement',
        errors: error.response?.data?.errors || []
      };
    }
  },

  // Delete movement
  async deleteMovement(id: string): Promise<ServiceResponse<void>> {
    try {
      console.log('🗑️ Deleting movement:', id);
      
      const response = await axios.delete(`${API_URL}/api/movements/${id}`);
      
      console.log('✅ Movement deleted successfully:', response.data);
      
      return {
        success: true,
        message: response.data.message || 'Movement deleted successfully'
      };
    } catch (error: any) {
      console.error('❌ Error deleting movement:', error.response?.data || error.message);
      
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete movement',
        errors: error.response?.data?.errors || [error.message]
      };
    }
  },

  // Check if movement can be deleted
  async canDeleteMovement(id: string): Promise<ServiceResponse<{ canDelete: boolean; reason?: string }>> {
    try {
      const response = await axios.get(`${API_URL}/api/movements/${id}/can-delete`);
      
      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      console.error('❌ Error checking if movement can be deleted:', error);
      
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to check movement deletion status',
        errors: error.response?.data?.errors || []
      };
    }
  },

  // Get movement statistics
  async getStatistics(period: 'today' | 'week' | 'month' | 'year' = 'month'): Promise<ServiceResponse<any>> {
    try {
      const response = await axios.get(`${API_URL}/api/movements/stats/overview?period=${period}`);
      
      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      console.error('❌ Error fetching statistics:', error);
      
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch statistics',
        errors: error.response?.data?.errors || []
      };
    }
  },

  // Get department movements
  async getDepartmentMovements(departmentId: string): Promise<ServiceResponse<StockMovement[]>> {
    try {
      const response = await axios.get(`${API_URL}/api/movements/department/${departmentId}`);
      
      return {
        success: true,
        data: response.data.data || []
      };
    } catch (error: any) {
      console.error('❌ Error fetching department movements:', error);
      
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch department movements',
        data: [],
        errors: error.response?.data?.errors || []
      };
    }
  }
};

// Helper function to convert Firestore data
export const convertFirestoreData = (data: any): any => {
  if (Array.isArray(data)) {
    return data.map(item => convertFirestoreData(item));
  } else if (data && typeof data === 'object') {
    // Create a copy to avoid mutating the original data
    const result = { ...data };
    
    // Convert Firestore timestamps
    if (result.timestamp && result.timestamp._seconds) {
      result.timestamp = new Date(result.timestamp._seconds * 1000);
    }
    if (result.createdAt && result.createdAt._seconds) {
      result.createdAt = new Date(result.createdAt._seconds * 1000);
    }
    if (result.updatedAt && result.updatedAt._seconds) {
      result.updatedAt = new Date(result.updatedAt._seconds * 1000);
    }
    return result;
  }
  return data;
};