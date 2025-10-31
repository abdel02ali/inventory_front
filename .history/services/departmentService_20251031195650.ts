// services/departmentService.ts
import { CreateDepartmentData, Department } from '../app/types/department';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

class DepartmentService {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      console.log(`🌐 API Call: ${options.method || 'GET'} ${url}`);

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ API Error:', error);
      throw error;
    }
  }

  async getDepartments(): Promise<Department[]> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: Department[];
        count: number;
      }>('/api/departments/');
      
      console.log(`📦 Retrieved ${response.count} departments from API`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching departments from API:', error);
      throw error; // Don't fallback to mock data
    }
  }

  async getAllDepartments(): Promise<Department[]> {
    return this.getDepartments();
  }

  async getDepartmentById(id: string): Promise<Department> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: Department;
      }>(`/api/departments/${id}`);
      
      return response.data;
    } catch (error) {
      console.error(`Error fetching department ${id}:`, error);
      throw error;
    }
  }

  async createDepartment(data: CreateDepartmentData): Promise<{ 
    success: boolean; 
    department?: Department; 
    error?: string;
    message?: string;
  }> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: Department;
        message: string;
      }>('/api/departments', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      console.log('✅ Department created successfully via API:', response.message);
      return {
        success: true,
        department: response.data,
        message: response.message,
      };
    } catch (error: any) {
      console.error('Error creating department via API:', error);
      return {
        success: false,
        error: error.message || 'Failed to create department',
      };
    }
  }

  async updateDepartment(
    id: string, 
    data: Partial<CreateDepartmentData>
  ): Promise<{ 
    success: boolean; 
    department?: Department; 
    error?: string;
    message?: string;
  }> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: Department;
        message: string;
      }>(`/api/departments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });

      console.log('✅ Department updated successfully via API:', response.message);
      return {
        success: true,
        department: response.data,
        message: response.message,
      };
    } catch (error: any) {
      console.error(`Error updating department ${id} via API:`, error);
      return {
        success: false,
        error: error.message || 'Failed to update department',
      };
    }
  }

  async deleteDepartment(id: string): Promise<{ 
    success: boolean; 
    error?: string;
    message?: string;
  }> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        message: string;
      }>(`/api/departments/${id}`, {
        method: 'DELETE',
      });

      console.log('✅ Department deleted successfully via API:', response.message);
      return {
        success: true,
        message: response.message,
      };
    } catch (error: any) {
      console.error(`Error deleting department ${id} via API:`, error);
      return {
        success: false,
        error: error.message || 'Failed to delete department',
      };
    }
  }

  async getDepartmentStats(): Promise<{
    totalDepartments: number;
    activeDepartments: number;
    inactiveDepartments: number;
    departmentUsage: Record<string, number>;
  }> {
    try {
      const departments = await this.getDepartments();
      
      return {
        totalDepartments: departments.length,
        activeDepartments: departments.length,
        inactiveDepartments: 0,
        departmentUsage: {}
      };
    } catch (error) {
      console.error('Error getting department stats:', error);
      throw error;
    }
  }

  async searchDepartments(query: string): Promise<Department[]> {
    try {
      const departments = await this.getDepartments();
      return departments.filter(dept => 
        dept.name.toLowerCase().includes(query.toLowerCase()) ||
        dept.description?.toLowerCase().includes(query.toLowerCase())
      );
    } catch (error) {
      console.error('Error searching departments:', error);
      throw error;
    }
  }

  // Utility method to check if department name exists
  async checkDepartmentNameExists(name: string): Promise<boolean> {
    try {
      const departments = await this.getDepartments();
      return departments.some(
        dept => dept.name.toLowerCase() === name.toLowerCase()
      );
    } catch (error) {
      console.error('Error checking department name:', error);
      throw error;
    }
  }

  // Utility method to get department by name
  async getDepartmentByName(name: string): Promise<Department | null> {
    try {
      const departments = await this.getDepartments();
      return departments.find(
        dept => dept.name.toLowerCase() === name.toLowerCase()
      ) || null;
    } catch (error) {
      console.error('Error getting department by name:', error);
      throw error;
    }
  }
}

export const departmentService = new DepartmentService();