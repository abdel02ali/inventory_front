// context/appContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { getClients, getProducts } from '../api';
import { Client, Product } from '../types/model';

type AppContextType = {
  products: Product[];
  clients: Client[];
  loading: boolean;
  refreshProducts: () => Promise<void>; // Changed to return Promise
  refreshClients: () => Promise<void>; // Changed to return Promise
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // In your context/appContext.tsx, update fetchProducts:
  const fetchProducts = async () => {
    try {
      console.log('🔄 Fetching products from API...');
      const response = await getProducts();
      console.log('📦 Products API response:', response.data);
      
      // Check if products have prices
      if (response.data && response.data.length > 0) {
        console.log('💰 First product price:', response.data[0].price);
        console.log('📊 All products:', response.data.map((p: { name: string; price: number }) => ({ 
          name: p.name, 
          price: p.price 
        })));
      }
      
      setProducts(response.data || []);
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      setProducts([]);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await getClients();
      setClients(response.data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      setClients([]);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchProducts(), fetchClients()]);
      setLoading(false);
    };
    loadData();
  }, []);

  // Refresh functions that return Promises for better async handling
  const refreshProducts = async (): Promise<void> => {
    await fetchProducts();
  };

  const refreshClients = async (): Promise<void> => {
    await fetchClients();
  };

  return (
    <AppContext.Provider
      value={{
        products,
        clients,
        loading,
        refreshProducts,
        refreshClients,
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