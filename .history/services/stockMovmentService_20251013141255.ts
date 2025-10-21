// services/stockMovementService.ts
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

// Define Department type here to ensure consistency
export type Department = 'pastry' | 'bakery' | 'cleaning' | 'management' | 'beverage' | 'packaging' | 'storage' | 'front_desk';
export type MovementType = 'stock_in' | 'distribution';

export interface ProductSelection {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
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

export const stockMovementService = {
  // Create stock movement
  async createMovement(movementData: StockMovementData) {
    try {
      console.log('🔄 Creating stock movement:', movementData);
      
      const response = await axios.post(`${API_URL}/api/movement/`, movementData);
      
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

      const response = await axios.get(`${API_URL}/api/movement/?${params}`);
      
      return {
        success: true,
        data: response.data.data,
        pagination: response.data.pagination
      };
    } catch (error: any) {
      console.error('❌ Error fetching movements:', error);
      
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
      const response = await axios.get(`${API_URL}/api/movement/${id}`);
      
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

  // Get department statistics
  async getDepartmentStats(department: Department) {
    try {
      const response = await axios.get(`${API_URL}/api/movement/department/${department}`);
      
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
      const response = await axios.get(`${API_URL}/api/movement/statistics?period=${period}`);
      
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