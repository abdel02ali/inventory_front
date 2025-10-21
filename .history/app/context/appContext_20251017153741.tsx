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

  const fetchProducts = async () => {
    try {
      console.log('🔄 Fetching products from API...');
      const response = await getProducts();
      console.log('📦 Products API response:', response.data);
      
      // Check if products have prices
      if (response.data && response.data.length > 0) {
        console.log('💰 First product price:', response.data[0].price);
        console.log('📊 All products:', response.data.map((p: { name: string; quantity: number }) => ({ 
          name: p.name, 
          quantity: p.quantity
        })));
      }
      
      setProducts(response.data || []);
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