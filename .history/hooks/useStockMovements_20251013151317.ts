// hooks/useStockMovements.ts
import { useEffect, useState } from 'react';
import { Department, MovementType, StockMovement, StockMovementData, stockMovementService } from '../services/stockMovementService';

interface UseStockMovementsProps {
  type?: MovementType | 'all';
  department?: Department | 'all';
  page?: number;
  limit?: number;
}

interface UseStockMovementsReturn {
  movements: StockMovement[];
  loading: boolean;
  error: string | null;
  pagination: any;
  fetchMovements: (newFilters?: UseStockMovementsProps) => Promise<void>;
  createMovement: (movementData: StockMovementData) => Promise<any>;
  updateMovement: (id: string, movementData: Partial<StockMovementData>) => Promise<any>;
  deleteMovement: (id: string) => Promise<any>;
  refetch: () => Promise<void>;
}

export const useStockMovements = (filters: UseStockMovementsProps = {}): UseStockMovementsReturn => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<any>(null);

  const fetchMovements = async (newFilters: UseStockMovementsProps = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await stockMovementService.getMovements({
        ...filters,
        ...newFilters
      });

      if (result.success) {
        setMovements(result.data);
        setPagination(result.pagination);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Failed to fetch stock movements');
      console.error('Error fetching stock movements:', err);
    } finally {
      setLoading(false);
    }
  };

  const createMovement = async (movementData: StockMovementData) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await stockMovementService.createMovement(movementData);
      
      if (result.success) {
        // Refresh the movements list
        await fetchMovements();
        return result;
      } else {
        setError(result.message);
        return result;
      }
    } catch (err) {
      const errorMsg = 'Failed to create stock movement';
      setError(errorMsg);
      console.error('Error creating stock movement:', err);
      return { success: false, message: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const updateMovement = async (id: string, movementData: Partial<StockMovementData>) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await stockMovementService.updateMovement(id, movementData);
      
      if (result.success) {
        // Refresh the movements list
        await fetchMovements();
        return result;
      } else {
        setError(result.message);
        return result;
      }
    } catch (err) {
      const errorMsg = 'Failed to update stock movement';
      setError(errorMsg);
      console.error('Error updating stock movement:', err);
      return { success: false, message: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const deleteMovement = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await stockMovementService.deleteMovement(id);
      
      if (result.success) {
        // Refresh the movements list
        await fetchMovements();
        return result;
      } else {
        setError(result.message);
        return result;
      }
    } catch (err) {
      const errorMsg = 'Failed to delete stock movement';
      setError(errorMsg);
      console.error('Error deleting stock movement:', err);
      return { success: false, message: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const refetch = () => fetchMovements(filters);

  useEffect(() => {
    fetchMovements();
  }, [filters.type, filters.department, filters.page, filters.limit]);

  return {
    movements,
    loading,
    error,
    pagination,
    fetchMovements,
    createMovement,
    updateMovement,
    deleteMovement,
    refetch
  };
};