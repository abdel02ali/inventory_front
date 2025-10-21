// services/departmentService.ts
import { CreateDepartmentData, Department } from '../app/types/department';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

// Mock data - fallback when API is not available
const mockDepartments: Department[] = [
  {
    id: 'dept-001',
    name: 'Pastry',
    description: 'Pastry and desserts department',
    icon: '🥐',
    color: '#f59e0b',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'dept-002',
    name: 'Bakery',
    description: 'Bread and bakery items',
    icon: '🍞',
    color: '#84cc16',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'dept-003',
    name: 'Cleaning',
    description: 'Cleaning supplies and equipment',
    icon: '🧹',
    color: '#06b6d4',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'dept-004',
    name: 'Office',
    description: 'Office supplies and equipment',
    icon: '👔',
    color: '#8b5cf6',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

class DepartmentService {
  private useMockData = false;
  private departments: Department[] = [...mockDepartments];

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // If we're using mock data, don't make actual API calls
    if (this.useMockData) {
      throw new Error('Using mock data - API call skipped');
    }

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
      
      // If this is the first API failure, switch to mock data
      if (!this.useMockData) {
        console.log('🔄 Switching to mock data for departments');
        this.useMockData = true;
      }
      
      throw error;
    }
  }

  async getDepartments(): Promise<Department[]> {
    // If using mock data, return mock departments
    if (this.useMockData) {
      console.log('📦 Using mock departments data');
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve([...this.departments]);
        }, 500);
      });
    }

    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: Department[];
        count: number;
      }>('/departments');
      
      console.log(`📦 Retrieved ${response.count} departments from API`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching departments from API, using mock data:', error);
      
      // Fallback to mock data
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve([...this.departments]);
        }, 500);
      });
    }
  }

  async getAllDepartments(): Promise<Department[]> {
    return this.getDepartments(); // For now, same as getDepartments
  }

  async getDepartmentById(id: string): Promise<Department> {
    if (this.useMockData) {
      const department = this.departments.find(dept => dept.id === id);
      if (!department) {
        throw new Error('Department not found');
      }
      return department;
    }

    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: Department;
      }>(`/departments/${id}`);
      
      return response.data;
    } catch (error) {
      console.error(`Error fetching department ${id}:`, error);
      
      // Fallback to mock data
      const department = this.departments.find(dept => dept.id === id);
      if (!department) {
        throw new Error('Department not found');
      }
      return department;
    }
  }

  async createDepartment(data: CreateDepartmentData): Promise<{ 
    success: boolean; 
    department?: Department; 
    error?: string;
    message?: string;
  }> {
    if (this.useMockData) {
      return new Promise((resolve) => {
        setTimeout(() => {
          try {
            // Check if department name already exists
            const existingDept = this.departments.find(
              dept => dept.name.toLowerCase() === data.name.toLowerCase()
            );

            if (existingDept) {
              resolve({
                success: false,
                error: 'Department with this name already exists',
              });
              return;
            }

            const newDepartment: Department = {
              id: `dept-${Date.now()}`,
              ...data,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            this.departments.push(newDepartment);

            resolve({
              success: true,
              department: newDepartment,
              message: 'Department created successfully',
            });
          } catch (error) {
            resolve({
              success: false,
              error: 'Failed to create department',
            });
          }
        }, 500);
      });
    }

    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: Department;
        message: string;
      }>('/departments', {
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
    if (this.useMockData) {
      return new Promise((resolve) => {
        setTimeout(() => {
          try {
            const departmentIndex = this.departments.findIndex(dept => dept.id === id);
            
            if (departmentIndex === -1) {
              resolve({
                success: false,
                error: 'Department not found',
              });
              return;
            }

            // Check if new name conflicts with other departments
            if (data.name) {
              const nameExists = this.departments.some(
                (dept, index) => 
                  index !== departmentIndex && 
                  dept.name.toLowerCase() === data.name!.toLowerCase()
              );

              if (nameExists) {
                resolve({
                  success: false,
                  error: 'Department with this name already exists',
                });
                return;
              }
            }

            this.departments[departmentIndex] = {
              ...this.departments[departmentIndex],
              ...data,
              updatedAt: new Date(),
            };

            resolve({
              success: true,
              department: this.departments[departmentIndex],
              message: 'Department updated successfully',
            });
          } catch (error) {
            resolve({
              success: false,
              error: 'Failed to update department',
            });
          }
        }, 500);
      });
    }

    try {
      const response = await this.makeRequest<{
        success: boolean;
        data: Department;
        message: string;
      }>(`/departments/${id}`, {
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
    if (this.useMockData) {
      return new Promise((resolve) => {
        setTimeout(() => {
          try {
            const departmentIndex = this.departments.findIndex(dept => dept.id === id);
            
            if (departmentIndex === -1) {
              resolve({
                success: false,
                error: 'Department not found',
              });
              return;
            }

            this.departments.splice(departmentIndex, 1);

            resolve({
              success: true,
              message: 'Department deleted successfully',
            });
          } catch (error) {
            resolve({
              success: false,
              error: 'Failed to delete department',
            });
          }
        }, 500);
      });
    }

    try {
      const response = await this.makeRequest<{
        success: boolean;
        message: string;
      }>(`/departments/${id}`, {
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
    const departments = await this.getDepartments();
    
    return {
      totalDepartments: departments.length,
      activeDepartments: departments.length,
      inactiveDepartments: 0,
      departmentUsage: {}
    };
  }

  async searchDepartments(query: string): Promise<Department[]> {
    const departments = await this.getDepartments();
    return departments.filter(dept => 
      dept.name.toLowerCase().includes(query.toLowerCase()) ||
      dept.description?.toLowerCase().includes(query.toLowerCase())
    );
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