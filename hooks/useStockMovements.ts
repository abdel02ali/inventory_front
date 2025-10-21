import { useEffect, useState } from 'react';
import { Department, MovementType, PaginationInfo, StockMovement, stockMovementService } from '../services/stockMovmentService';

interface UseStockMovementsProps {
  type?: MovementType;
  department?: Department;
  page?: number;
  limit?: number;
}

export const useStockMovements = (filters: UseStockMovementsProps = {}) => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });

  const fetchMovements = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Fetching movements with filters:', filters);
      
      const result = await stockMovementService.getMovements(filters);
      
      if (result.success) {
        setMovements(result.data);
        setPagination(result.pagination || {
          page: 1,
          limit: 50,
          total: result.data.length,
          pages: 1
        });
        console.log(`✅ Loaded ${result.data.length} movements`);
      } else {
        setError(result.message);
        console.error('❌ Failed to fetch movements:', result.message);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch movements');
      console.error('❌ Error in fetchMovements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, [filters.type, filters.department, filters.page, filters.limit]);

  const refetch = () => {
    fetchMovements();
  };

  return {
    movements,
    loading,
    error,
    pagination,
    fetchMovements,
    refetch
  };
};