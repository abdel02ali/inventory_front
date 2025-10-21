// types/department.ts
export type Department = {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  activeColor?: string; // Add this line
  createdAt: Date;
  updatedAt: Date;
};

export type CreateDepartmentData = {
  name: string;
  description?: string;
  icon: string;
  color: string;
  activeColor?: string; // Add this line
};