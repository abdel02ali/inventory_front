// src/types/models.ts

export interface Product {
  id: string;
  name: string;
    unitPrice?: number;
  type?: number; 
    quantity?: number;
  q?: number;
  image?: string;
  category?: string; 

}
export type ProductItem = {
  name: string;
  quantity: number;
  unitPrice: number; // For invoice products
  price?: number; // For compatibility
};

