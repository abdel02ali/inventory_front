// services/departmentService.ts
import { CreateDepartmentData, Department } from '../app/types/department';

// Mock data - replace with actual API calls
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
  private departments: Department[] = [...mockDepartments];

  async getDepartments(): Promise<Department[]> {
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([...this.departments]);
      }, 500);
    });
  }

  async createDepartment(data: CreateDepartmentData): Promise<{ success: boolean; department?: Department; error?: string }> {
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

  async updateDepartment(id: string, data: Partial<CreateDepartmentData>): Promise<{ success: boolean; department?: Department; error?: string }> {
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

  async deleteDepartment(id: string): Promise<{ success: boolean; error?: string }> {
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
}

export const departmentService = new DepartmentService();