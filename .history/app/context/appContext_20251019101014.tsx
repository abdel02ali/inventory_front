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
  const [loading, setLoading] = useState<boolean>(true);

  // ✅ Normalize product data (handles quantity/q mismatch + cleans duplicates)
  const normalizeProducts = (apiProducts: any[]): Product[] => {
    if (!Array.isArray(apiProducts)) return [];

    const seenIds = new Set<string>();

    return apiProducts
      .filter(p => p && p.id) // skip invalid entries
      .map(p => {
        const normalizedQuantity =
          p.quantity ?? p.q ?? 0; // take quantity, fallback to q

        // Remove duplicates by id (just in case API sends duplicates)
        if (seenIds.has(p.id)) return null;
        seenIds.add(p.id);

        return {
          ...p,
          quantity: normalizedQuantity,
          q: undefined, // remove old field
        };
      })
      .filter(Boolean) as Product[];
  };

  const fetchProducts = async () => {
    try {
      console.log('🔄 Fetching products from API...');
      const response = await getProducts();

      // Some APIs wrap data in { data: [...] }, others return an array directly
      const rawProducts = Array.isArray(response.data)
        ? response.data
        : response.data?.products || [];

      console.log('🧾 Latest product data:', rawProducts);

      const normalized = normalizeProducts(rawProducts);

      console.log(
        '✅ Normalized products:',
        normalized.map(p => ({
          name: p.name,
          quantity: p.quantity,
          unit: p.unit,
        }))
      );

      setProducts(normalized);
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // 🔁 Initial load
  useEffect(() => {
    fetchProducts();
  }, []);

  // 🔁 Refresh function used after adding stock movements
  const refreshProducts = async (): Promise<void> => {
    console.log('🔁 Manually refreshing products...');
    await fetchProducts();
  };

  return (
    <AppContext.Provider value={{ products, loading, refreshProducts }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
