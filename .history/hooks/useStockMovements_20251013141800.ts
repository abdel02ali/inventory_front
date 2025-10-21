// hooks/useStockMovements.ts
import { useEffect, useState } from 'react';
import { Department, MovementType, StockMovement, StockMovementData, stockMovementService } from '../services/stockMovmentService';

interface UseStockMovementsProps {
  type?: MovementType | 'all';
  department?: Department | 'all';
  page?: number;
  limit?: number;
}

export const useStockMovements = (filters: UseStockMovementsProps = {}) => {
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
      return { success: false, message: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, [filters.type, filters.department, filters.page]);

  return {
    movements,
    loading,
    error,
    pagination,
    fetchMovements,
    createMovement,
    refetch: () => fetchMovements(filters)
  };
};