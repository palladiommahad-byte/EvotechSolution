import React, { createContext, useContext, useState, ReactNode, useEffect, useRef, useMemo } from 'react';
import { useWarehouses, useCreateWarehouse, useUpdateWarehouse, useDeleteWarehouse } from '@/hooks/useSettings';
import { useUserPreferences, useUpdateUserPreferences } from '@/hooks/useSettings';
import { useAuth } from './AuthContext';

export type Warehouse = string | 'all';

export interface WarehouseInfo {
  id: string;
  name: string;
  city: string;
  address?: string;
  phone?: string;
  email?: string;
}

const initialWarehouses: WarehouseInfo[] = [
  { id: 'marrakech', name: 'Marrakech Warehouse', city: 'Marrakech' },
  { id: 'agadir', name: 'Agadir Warehouse', city: 'Agadir' },
  { id: 'ouarzazate', name: 'Ouarzazate Warehouse', city: 'Ouarzazate' },
];

interface WarehouseContextType {
  activeWarehouse: Warehouse;
  setActiveWarehouse: (warehouse: Warehouse) => Promise<void>;
  warehouseInfo: WarehouseInfo | null;
  isAllWarehouses: boolean;
  warehouses: WarehouseInfo[];
  addWarehouse: (warehouse: Omit<WarehouseInfo, 'id'>) => Promise<WarehouseInfo>;
  updateWarehouse: (id: string, warehouse: Partial<WarehouseInfo>) => Promise<void>;
  deleteWarehouse: (id: string) => Promise<void>;
  isLoading: boolean;
}

const WarehouseContext = createContext<WarehouseContextType | undefined>(undefined);

// Helper function to validate UUID format
const isValidUUID = (str: string | undefined | null): boolean => {
  if (!str) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export const WarehouseProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  
  // Fetch warehouses from database
  const { data: dbWarehouses = [], isLoading: isLoadingWarehouses } = useWarehouses();
  const createMutation = useCreateWarehouse();
  const updateMutation = useUpdateWarehouse();
  const deleteMutation = useDeleteWarehouse();
  
  // Only use userId if it's a valid UUID
  const userId = user?.id && isValidUUID(user.id) ? user.id : '';
  
  // Fetch user preferences for active warehouse
  const { data: userPreferences } = useUserPreferences(userId);
  const updatePreferencesMutation = useUpdateUserPreferences();

  // Convert database warehouses to WarehouseInfo format
  const warehouses: WarehouseInfo[] = useMemo(() => {
    if (dbWarehouses.length > 0) {
      return dbWarehouses.map(w => ({
        id: w.id,
        name: w.name,
        city: w.city,
        address: w.address,
        phone: w.phone,
        email: w.email,
      }));
    }
    
    // Fallback to localStorage if database is not available
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('warehouses');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              return parsed;
            }
          } catch {
            return initialWarehouses;
          }
        }
      } catch (error) {
        console.warn('Error loading warehouses from localStorage:', error);
      }
    }
    return initialWarehouses;
  }, [dbWarehouses]);

  // Sync to localStorage as backup
  useEffect(() => {
    if (typeof window !== 'undefined' && warehouses.length > 0) {
      try {
        localStorage.setItem('warehouses', JSON.stringify(warehouses));
      } catch (error) {
        console.warn('Error saving warehouses to localStorage:', error);
      }
    }
  }, [warehouses]);

  // Initialize active warehouse from user preferences or localStorage
  const [activeWarehouse, setActiveWarehouseState] = useState<Warehouse>(() => {
    // First try user preferences
    if (userPreferences?.active_warehouse_id) {
      return userPreferences.active_warehouse_id;
    }
    
    // Fallback to localStorage
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('activeWarehouse');
        if (saved && saved !== 'all') {
          return saved;
        }
      } catch (error) {
        console.warn('Error loading active warehouse from localStorage:', error);
      }
    }
    
    return warehouses.length > 0 ? warehouses[0].id : 'all';
  });

  // Update active warehouse when user preferences change
  useEffect(() => {
    if (userPreferences?.active_warehouse_id) {
      const prefWarehouse = userPreferences.active_warehouse_id;
      // Verify the warehouse still exists
      if (prefWarehouse === 'all' || warehouses.find(w => w.id === prefWarehouse)) {
        setActiveWarehouseState(prefWarehouse);
      }
    }
  }, [userPreferences, warehouses]);

  // Use ref to track active warehouse to avoid dependency issues
  const activeWarehouseRef = useRef(activeWarehouse);
  activeWarehouseRef.current = activeWarehouse;

  // Update active warehouse if current one doesn't exist (only when warehouses change)
  useEffect(() => {
    const currentActive = activeWarehouseRef.current;
    
    if (!Array.isArray(warehouses) || warehouses.length === 0) {
      if (currentActive !== 'all') {
        setActiveWarehouseState('all');
      }
      return;
    }
    
    if (currentActive !== 'all' && typeof currentActive === 'string') {
      const exists = warehouses.find(w => w.id === currentActive);
      if (!exists && warehouses.length > 0) {
        // Current active warehouse doesn't exist, switch to first available
        setActiveWarehouseState(warehouses[0].id);
      }
    }
  }, [warehouses]);

  // Save active warehouse to user preferences and localStorage
  const setActiveWarehouse = async (warehouse: Warehouse) => {
    setActiveWarehouseState(warehouse);
    
    // Save to localStorage as backup
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('activeWarehouse', warehouse);
      } catch (error) {
        console.warn('Error saving active warehouse to localStorage:', error);
      }
    }
    
    // Save to user preferences if user is logged in with valid UUID
    if (user?.id && isValidUUID(user.id)) {
      try {
        await updatePreferencesMutation.mutateAsync({
          userId: user.id,
          preferences: { active_warehouse_id: warehouse === 'all' ? null : warehouse },
        });
      } catch (error) {
        console.error('Error updating user preferences:', error);
      }
    }
  };
  
  const isAllWarehouses = activeWarehouse === 'all';
  const warehouseInfo = activeWarehouse === 'all' 
    ? null 
    : warehouses.find(w => w.id === activeWarehouse) || (warehouses.length > 0 ? warehouses[0] : null);

  const addWarehouse = async (warehouse: Omit<WarehouseInfo, 'id'>): Promise<WarehouseInfo> => {
    try {
      const result = await createMutation.mutateAsync(warehouse);
      if (!result) {
        throw new Error('Failed to create warehouse');
      }
      
      // Also save to localStorage as backup
      if (typeof window !== 'undefined') {
        try {
          const updated = [...warehouses, result];
          localStorage.setItem('warehouses', JSON.stringify(updated));
        } catch (error) {
          console.warn('Error saving warehouse to localStorage:', error);
        }
      }
      
      return {
        id: result.id,
        name: result.name,
        city: result.city,
        address: result.address,
        phone: result.phone,
        email: result.email,
      };
    } catch (error) {
      console.error('Error adding warehouse:', error);
      throw error;
    }
  };

  const updateWarehouse = async (id: string, updates: Partial<WarehouseInfo>) => {
    try {
      await updateMutation.mutateAsync({ id, warehouse: updates });
      
      // Also update localStorage as backup
      if (typeof window !== 'undefined') {
        try {
          const updated = warehouses.map(w => w.id === id ? { ...w, ...updates } : w);
          localStorage.setItem('warehouses', JSON.stringify(updated));
        } catch (error) {
          console.warn('Error saving warehouse to localStorage:', error);
        }
      }
    } catch (error) {
      console.error('Error updating warehouse:', error);
      throw error;
    }
  };

  const deleteWarehouse = async (id: string) => {
    // Prevent deleting if it's the only warehouse
    if (warehouses.length <= 1) {
      throw new Error('Cannot delete the only warehouse');
    }
    
    try {
      await deleteMutation.mutateAsync(id);
      
      // Also update localStorage as backup
      if (typeof window !== 'undefined') {
        try {
          const updated = warehouses.filter(w => w.id !== id);
          localStorage.setItem('warehouses', JSON.stringify(updated));
        } catch (error) {
          console.warn('Error saving warehouse to localStorage:', error);
        }
      }
      
      // If deleted warehouse was active, switch to first available
      if (activeWarehouse === id && warehouses.length > 1) {
        const remaining = warehouses.filter(w => w.id !== id);
        if (remaining.length > 0) {
          await setActiveWarehouse(remaining[0].id);
        }
      }
    } catch (error) {
      console.error('Error deleting warehouse:', error);
      throw error;
    }
  };

  // Ensure warehouses is always an array with at least initial warehouses
  const safeWarehouses = Array.isArray(warehouses) && warehouses.length > 0 ? warehouses : initialWarehouses;
  const isLoading = isLoadingWarehouses;

  return (
    <WarehouseContext.Provider value={{ 
      activeWarehouse, 
      setActiveWarehouse, 
      warehouseInfo, 
      isAllWarehouses,
      warehouses: safeWarehouses,
      addWarehouse,
      updateWarehouse,
      deleteWarehouse,
      isLoading,
    }}>
      {children}
    </WarehouseContext.Provider>
  );
};

export const useWarehouse = () => {
  const context = useContext(WarehouseContext);
  if (!context) {
    throw new Error('useWarehouse must be used within a WarehouseProvider');
  }
  return context;
};
