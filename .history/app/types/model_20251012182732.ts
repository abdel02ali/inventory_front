// src/types/models.ts

export interface Product {
  id: string;
  name: string;
    unitPrice?: number;
  price?: number; 
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

export interface Client {
  id: string;
  name: string;
  phone?: string;
  location?: string;
  invoices: Invoice[];
}

export interface Invoice {
  id: string;
  clientName: string;
  clientId: string;
  products: Product[];
  date: string;
  total: number;
    paid: boolean;
    advance?: number;
    rest:number;
    remise?: number;
  status: "paid" | "pending" | "partial"; // Use consistent lowercase

}
