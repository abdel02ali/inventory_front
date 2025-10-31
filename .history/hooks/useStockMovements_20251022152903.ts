import { useEffect, useState } from 'react';
import {
  Department,
  MovementType,
  PaginationInfo,
  StockMovement,
  stockMovementService
} from "../services/stockMovmentService";

interface UseStockMovementsProps {
  type?: MovementType;
  department?: Department;
  page?: number;
  limit?: number;
}

interface UseStockMovementsReturn {
  movements: StockMovement[];
  loading: boolean;
  error: string | null;
  pagination: PaginationInfo;
  refetch: () => void;
}

export const useStockMovements = (filters: UseStockMovementsProps = {}): UseStockMovementsReturn => {
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
        // Ensure we always have an array, even if data is undefined
        const movementsData = result.data || [];
        setMovements(movementsData);
        
        // Create a default pagination since the service might not return it
        setPagination({
          page: filters.page || 1,
          limit: filters.limit || 50,
          total: movementsData.length,
          pages: Math.ceil(movementsData.length / (filters.limit || 50))
        });
        console.log(`✅ Loaded ${movementsData.length} movements`);
      } else {
        setError(result.message || 'Failed to fetch movements');
        setMovements([]); // Ensure empty array on error
        console.error('❌ Failed to fetch movements:', result.message);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch movements');
      setMovements([]); // Ensure empty array on error
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
    refetch
  };
};