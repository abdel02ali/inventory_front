import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export type Department = 'pastry' | 'bakery' | 'cleaning' | 'magazin';
export type MovementType = 'stock_in' | 'distribution';

export interface ProductSelection {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
}

export interface StockMovementData {
  type: MovementType;
  department?: Department;
  supplier?: string;
  stockManager: string;
  notes?: string;
  products: ProductSelection[];
}

export interface StockMovement {
  id: string;
  movementId: string;
  type: MovementType;
  department?: Department;
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

export interface DepartmentStats {
  department: Department;
  totalDistributions: number;
  totalProductsDistributed: number;
  productBreakdown: Array<{
    productId: string;
    productName: string;
    totalQuantity: number;
    unit: string;
  }>;
  recentMovements: StockMovement[];
}

export interface Statistics {
  totalMovements: number;
  totalStockIn: number;
  totalDistributions: number;
  totalProductsIn: number;
  totalProductsOut: number;
  totalValue: number;
  departmentBreakdown: Array<{
    department: Department;
    count: number;
    totalProducts: number;
  }>;
}

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export const stockMovementService = {
  // Create stock movement
  async createMovement(movementData: StockMovementData) {
    try {
      console.log('🔄 Creating stock movement:', movementData);
      
      const response = await axios.post(`${API_URL}/movements/`, movementData);
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error: any) {
      console.error('❌ Error creating stock movement:', error.response?.data || error.message);
      
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create stock movement',
        errors: error.response?.data?.errors || []
      };
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
  } = {}) {
    try {
      const params = new URLSearchParams();
      
      if (filters.type && filters.type !== 'all') params.append('type', filters.type);
      if (filters.department && filters.department !== 'all') params.append('department', filters.department);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());

      console.log('📡 Fetching movements from:', `${API_URL}/movements/history?${params}`);
      
      const response = await axios.get(`${API_URL}/movements/history?${params}`);
      
      console.log('✅ Movements response received:', {
        success: response.data.success,
        count: response.data.data?.length
      });
      
      return {
        success: true,
        data: response.data.data,
        pagination: response.data.pagination
      };
    } catch (error: any) {
      console.error('❌ Error fetching movements:', error.response?.data || error.message);
      
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch movements',
        data: [],
        pagination: { page: 1, limit: 50, total: 0, pages: 0 }
      };
    }
  },

  // Get movement by ID
  async getMovementById(id: string) {
    try {
      const response = await axios.get(`${API_URL}/movements/${id}`);
      
      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      console.error('❌ Error fetching movement:', error);
      
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch movement',
        data: null
      };
    }
  },

  // Update movement
  async updateMovement(id: string, movementData: Partial<StockMovementData>) {
    try {
      const response = await axios.put(`${API_URL}/movements/${id}`, movementData);
      
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
        data: null
      };
    }
  },

  // Delete movement
  async deleteMovement(id: string): Promise<ServiceResponse<void>> {
    try {
      console.log('🗑️ Deleting movement:', id);
      
      const response = await axios.delete(`${API_URL}/movements/${id}`);
      
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

  // Get department statistics
  async getDepartmentStats(department: Department) {
    try {
      const response = await axios.get(`${API_URL}/movements/departments/${department}`);
      
      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      console.error('❌ Error fetching department stats:', error);
      
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch department statistics',
        data: null
      };
    }
  },

  // Get movement statistics
  async getStatistics(period: 'today' | 'week' | 'month' | 'year' = 'month') {
    try {
      const response = await axios.get(`${API_URL}/movements/statistics?period=${period}`);
      
      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      console.error('❌ Error fetching statistics:', error);
      
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch statistics',
        data: null
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