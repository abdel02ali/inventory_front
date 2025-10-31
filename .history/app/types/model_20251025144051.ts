// src/types/models.ts

// types/product.ts
export interface Product {
  id: string;
  name: string;
  unitPrice?: number;
  unit?: string;
  quantity: number; // Make this required and remove q
  image?: string;
  imageUrl?: string;
  category?: string;
  categories?: string[];
  primaryCategory?: string;
  department?: string;
  lastUsed?: string;
  description?: string;
  usageHistory?: any[];
  totalUsed?: number;
  lowStockThreshold?: number;
  createdAt?: any;
  updatedAt?: any;
}
export type ProductItem = {
  name: string;
  quantity: number;
  unitPrice: number; // For invoice products
  price?: number; // For compatibility
};

