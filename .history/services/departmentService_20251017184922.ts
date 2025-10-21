// services/departmentService.ts
import { CreateDepartmentData, Department } from '../app/types/department';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ;

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
      }>('/departments/');
      
      console.log(`📦 Retrieved ${response.count} departments`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching departments:', error);
      throw new Error('Failed to fetch departments');
    }
  }

  async getAllDepartments(): Promise<Department[]> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: Department[];
        count: number;
      }>('/departments/all');
      
      console.log(`📦 Retrieved ${response.count} departments (including inactive)`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching all departments:', error);
      throw new Error('Failed to fetch all departments');
    }
  }

  async getDepartmentById(id: string): Promise<Department> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: Department;
      }>(`/departments/${id}`);
      
      return response.data;
    } catch (error) {
      console.error(`Error fetching department ${id}:`, error);
      throw new Error('Failed to fetch department');
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
      }>('/departments', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      console.log('✅ Department created successfully:', response.message);
      return {
        success: true,
        department: response.data,
        message: response.message,
      };
    } catch (error: any) {
      console.error('Error creating department:', error);
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
      }>(`/departments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });

      console.log('✅ Department updated successfully:', response.message);
      return {
        success: true,
        department: response.data,
        message: response.message,
      };
    } catch (error: any) {
      console.error(`Error updating department ${id}:`, error);
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
      }>(`/departments/${id}`, {
        method: 'DELETE',
      });

      console.log('✅ Department deleted successfully:', response.message);
      return {
        success: true,
        message: response.message,
      };
    } catch (error: any) {
      console.error(`Error deleting department ${id}:`, error);
      return {
        success: false,
        error: error.message || 'Failed to delete department',
      };
    }
  }

  async hardDeleteDepartment(id: string): Promise<{ 
    success: boolean; 
    error?: string;
    message?: string;
  }> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        message: string;
      }>(`/departments/${id}/hard`, {
        method: 'DELETE',
      });

      console.log('✅ Department permanently deleted:', response.message);
      return {
        success: true,
        message: response.message,
      };
    } catch (error: any) {
      console.error(`Error hard deleting department ${id}:`, error);
      return {
        success: false,
        error: error.message || 'Failed to permanently delete department',
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
      const response = await this.makeRequest<{
        success: boolean;
        data: {
          totalDepartments: number;
          activeDepartments: number;
          inactiveDepartments: number;
          departmentUsage: Record<string, number>;
        };
      }>('/departments/stats/summary');

      return response.data;
    } catch (error) {
      console.error('Error fetching department stats:', error);
      throw new Error('Failed to fetch department statistics');
    }
  }

  async searchDepartments(query: string): Promise<Department[]> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: Department[];
        count: number;
      }>(`/departments/search/${encodeURIComponent(query)}`);

      console.log(`🔍 Found ${response.count} departments matching "${query}"`);
      return response.data || [];
    } catch (error) {
      console.error('Error searching departments:', error);
      throw new Error('Failed to search departments');
    }
  }

  async bulkUpdateDepartments(
    departmentIds: string[], 
    updateData: Partial<CreateDepartmentData>
  ): Promise<{ 
    success: boolean; 
    error?: string;
    message?: string;
  }> {
    try {
      const response = await this.makeRequest<{
        success: boolean;
        message: string;
      }>('/departments/bulk', {
        method: 'PATCH',
        body: JSON.stringify({
          departmentIds,
          updateData,
        }),
      });

      console.log('✅ Departments bulk updated:', response.message);
      return {
        success: true,
        message: response.message,
      };
    } catch (error: any) {
      console.error('Error bulk updating departments:', error);
      return {
        success: false,
        error: error.message || 'Failed to bulk update departments',
      };
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
      return false;
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
      return null;
    }
  }
}

export const departmentService = new DepartmentService();