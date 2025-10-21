// src/types/models.ts

export interface Product {
  id: string;
  name: string;
  unitPrice?: number;
  unit?: string; // Changed from number to string
  quantity?: number;
  q?: number;
  image?: string;
  imageUrl?: string; // Add this for your data
  category?: string;
  categories?: string[]; // Add this for your data
  primaryCategory?: string; // Add this for your data
  department?: string;
  lastUsed?: string;
  description?: string; // Add this for your data
  usageHistory?: any[]; // Add this for your data
  totalUsed?: number; // Add this for your data
  createdAt?: any; // Add this for your data
  updatedAt?: any; // Add this for your data
}
export type ProductItem = {
  name: string;
  quantity: number;
  unitPrice: number; // For invoice products
  price?: number; // For compatibility
};

