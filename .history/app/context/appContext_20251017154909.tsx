// context/appContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { getProducts } from '../api';
import { Product } from '../types/model';

type AppContextType = {
  products: Product[];
  loading: boolean;
  refreshProducts: () => Promise<void>;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper function to normalize product data
  const normalizeProducts = (apiProducts: any[]): Product[] => {
    return apiProducts.map(product => {
      // Handle inconsistent quantity fields
      let finalQuantity = 0;
      
      if (product.quantity !== undefined && product.quantity !== null) {
        finalQuantity = product.quantity;
      } else if (product.q !== undefined && product.q !== null) {
        finalQuantity = product.q;
      }
      
      // Return normalized product
      return {
        ...product,
        quantity: finalQuantity,
        // Remove the inconsistent 'q' field to avoid confusion
        q: undefined
      };
    });
  };

  const fetchProducts = async () => {
    try {
      console.log('🔄 Fetching products from API...');
      const response = await getProducts();
      console.log('📦 Products API response:', response.data);
      
      // Normalize the products data
      const normalizedProducts = normalizeProducts(response.data || []);
      
      console.log('🔄 Normalized products:', normalizedProducts.map(p => ({ 
        name: p.name, 
        quantity: p.quantity,
        unit: p.unit
      })));
      
      setProducts(normalizedProducts);
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      setProducts([]);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchProducts();
      setLoading(false);
    };
    loadData();
  }, []);

  const refreshProducts = async (): Promise<void> => {
    await fetchProducts();
  };

  return (
    <AppContext.Provider
      value={{
        products,
        loading,
        refreshProducts,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};