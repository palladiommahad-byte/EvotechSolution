/**
 * Products Service
 * Handles all database operations for products using Supabase
 */

import { getSupabaseClient } from '@/lib/supabase';

// Database interface (snake_case)
export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category?: string;
  unit?: string;
  price: number;
  stock: number;
  min_stock?: number;
  minStock?: number; // UI alias
  image?: string;
  status?: 'in_stock' | 'low_stock' | 'out_of_stock';
  last_movement?: string;
  lastMovement?: string; // UI alias
  is_deleted?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface StockItem {
  id: string;
  product_id: string;
  warehouse_id: string;
  quantity: number;
  min_quantity?: number;
  movement?: 'up' | 'down' | 'stable';
  last_updated?: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  quantity: number;
  type: string;
  reference_id?: string;
  description?: string;
  created_at: string;
}

export const productsService = {
  /**
   * Get all products
   */
  async getAll(): Promise<Product[]> {
    try {
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_deleted', false)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching products:', error);
        return [];
      }

      // Map to include both snake_case and camelCase aliases
      return (data || []).map(product => ({
        ...product,
        minStock: product.min_stock,
        lastMovement: product.last_movement,
      })) as Product[];
    } catch (error) {
      console.error('Error fetching products:', error);
      return [];
    }
  },

  /**
   * Get product by ID
   */
  async getById(id: string): Promise<Product | null> {
    try {
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .eq('is_deleted', false)
        .single();

      if (error) {
        console.error('Error fetching product:', error);
        return null;
      }

      return data ? {
        ...data,
        minStock: data.min_stock,
        lastMovement: data.last_movement,
      } : null;
    } catch (error) {
      console.error('Error fetching product:', error);
      return null;
    }
  },

  /**
   * Get product by SKU
   */
  async getBySku(sku: string): Promise<Product | null> {
    try {
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('sku', sku)
        .eq('is_deleted', false)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        console.error('Error fetching product by SKU:', error);
        return null;
      }

      return data ? {
        ...data,
        minStock: data.min_stock,
        lastMovement: data.last_movement,
      } : null;
    } catch (error) {
      console.error('Error fetching product by SKU:', error);
      return null;
    }
  },

  /**
   * Create a new product
   */
  async create(product: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'minStock' | 'lastMovement'> & { min_stock?: number; last_movement?: string }): Promise<Product> {
    try {
      const supabase = getSupabaseClient();

      // Map camelCase to snake_case for database
      const productToInsert = {
        sku: product.sku,
        name: product.name,
        description: product.description,
        category: product.category || '',
        unit: product.unit || 'Piece',
        price: product.price,
        stock: product.stock || 0,
        min_stock: product.min_stock || 0,
        image: product.image,
        status: product.status || 'in_stock',
        last_movement: product.last_movement || new Date().toISOString().split('T')[0],
        is_deleted: false,
      };

      // Calculate status based on stock vs min_stock
      if (productToInsert.stock === 0) {
        productToInsert.status = 'out_of_stock';
      } else if (productToInsert.min_stock > 0 && productToInsert.stock <= productToInsert.min_stock) {
        productToInsert.status = 'low_stock';
      } else {
        productToInsert.status = 'in_stock';
      }

      const { data, error } = await supabase
        .from('products')
        .insert([productToInsert])
        .select()
        .single();

      if (error) {
        console.error('Error creating product:', error);
        throw error;
      }

      return {
        ...data,
        minStock: data.min_stock,
        lastMovement: data.last_movement,
      };
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  },

  /**
   * Update a product
   */
  async update(id: string, product: Partial<Product> & { min_stock?: number; minStock?: number; last_movement?: string; lastMovement?: string }): Promise<Product> {
    try {
      const supabase = getSupabaseClient();

      // Map camelCase to snake_case for database
      const productToUpdate: any = {
        ...product,
        updated_at: new Date().toISOString(),
      };

      // Handle minStock -> min_stock mapping
      if ('minStock' in product && !('min_stock' in product)) {
        productToUpdate.min_stock = product.minStock;
        delete productToUpdate.minStock;
      }

      // Handle lastMovement -> last_movement mapping
      if ('lastMovement' in product && !('last_movement' in product)) {
        productToUpdate.last_movement = product.lastMovement;
        delete productToUpdate.lastMovement;
      }

      // Calculate status if stock or min_stock changed
      if ('stock' in productToUpdate || 'min_stock' in productToUpdate) {
        const currentStock = productToUpdate.stock ?? (await this.getById(id))?.stock ?? 0;
        const currentMinStock = productToUpdate.min_stock ?? (await this.getById(id))?.min_stock ?? 0;

        if (currentStock === 0) {
          productToUpdate.status = 'out_of_stock';
        } else if (currentMinStock > 0 && currentStock <= currentMinStock) {
          productToUpdate.status = 'low_stock';
        } else {
          productToUpdate.status = 'in_stock';
        }
      }

      const { data, error } = await supabase
        .from('products')
        .update(productToUpdate)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating product:', error);
        throw error;
      }

      return {
        ...data,
        minStock: data.min_stock,
        lastMovement: data.last_movement,
      };
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  },

  /**
   * Delete a product
   */
  async delete(id: string): Promise<void> {
    try {
      const supabase = getSupabaseClient();

      const { error } = await supabase
        .from('products')
        .update({ is_deleted: true })
        .eq('id', id);

      if (error) {
        console.error('Error deleting product:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  },

  /**
   * Get stock items for a product
   */
  async getStockItems(productId: string): Promise<StockItem[]> {
    try {
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from('stock_items')
        .select('*')
        .eq('product_id', productId);

      if (error) {
        console.error('Error fetching stock items:', error);
        return [];
      }

      return (data || []) as StockItem[];
    } catch (error) {
      console.error('Error fetching stock items:', error);
      return [];
    }
  },

  /**
   * Get all stock items grouped by product
   */
  async getAllStockItems(): Promise<StockItem[]> {
    try {
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from('stock_items')
        .select('*')
        .order('product_id', { ascending: true });

      if (error) {
        console.error('Error fetching stock items:', error);
        return [];
      }

      return (data || []) as StockItem[];
    } catch (error) {
      console.error('Error fetching stock items:', error);
      return [];
    }
  },

  /**
   * Update stock for a product (updates products.stock field)
   */
  async updateStock(productId: string, quantity: number): Promise<void> {
    try {
      const supabase = getSupabaseClient();

      const { error } = await supabase
        .from('products')
        .update({ stock: quantity })
        .eq('id', productId);

      if (error) {
        console.error('Error updating stock:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error updating stock:', error);
      throw error;
    }
  },

  /**
   * Update stock item for a specific warehouse
   */
  async updateStockItem(productId: string, warehouseId: string, quantity: number, minQuantity?: number, movement?: 'up' | 'down' | 'stable'): Promise<StockItem> {
    try {
      const supabase = getSupabaseClient();

      // Use upsert to create or update
      const { data, error } = await supabase
        .from('stock_items')
        .upsert({
          product_id: productId,
          warehouse_id: warehouseId,
          quantity,
          min_quantity: minQuantity,
          movement: movement || 'stable',
          last_updated: new Date().toISOString(),
        }, {
          onConflict: 'product_id,warehouse_id'
        })
        .select()
        .single();

      if (error) {
        console.error('Error updating stock item:', error);
        throw error;
      }

      return data as StockItem;
    } catch (error) {
      console.error('Error updating stock item:', error);
      throw error;
    }
  },

  /**
   * Search products by name or SKU
   */
  async search(query: string): Promise<Product[]> {
    try {
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_deleted', false)
        .or(`name.ilike.%${query}%,sku.ilike.%${query}%`)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error searching products:', error);
        return [];
      }

      return (data || []).map(product => ({
        ...product,
        minStock: product.min_stock,
        lastMovement: product.last_movement,
      })) as Product[];
    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    }
  },

  /**
   * Get products by category
   */
  async getByCategory(category: string): Promise<Product[]> {
    try {
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('category', category)
        .eq('is_deleted', false)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching products by category:', error);
        return [];
      }

      return (data || []).map(product => ({
        ...product,
        minStock: product.min_stock,
        lastMovement: product.last_movement,
      })) as Product[];
    } catch (error) {
      console.error('Error fetching products by category:', error);
      return [];
    }
  },

  /**
   * Get low stock products
   */
  async getLowStock(): Promise<Product[]> {
    try {
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_deleted', false)
        .not('min_stock', 'is', null)
        .filter('stock', 'lte', 'min_stock')
        .order('stock', { ascending: true });

      if (error) {
        console.error('Error fetching low stock products:', error);
        return [];
      }

      return (data || []).map(product => ({
        ...product,
        minStock: product.min_stock,
        lastMovement: product.last_movement,
      })) as Product[];
    } catch (error) {
      console.error('Error fetching low stock products:', error);
      return [];
    }
  },

  /**
   * Get stock movements
   */
  async getMovements(limit = 50): Promise<StockMovement[]> {
    try {
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from('stock_movements')
        .select(`
          *,
          product:products(name, sku)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching stock movements:', error);
        return [];
      }

      return (data || []) as any[];
    } catch (error) {
      console.error('Error fetching stock movements:', error);
      return [];
    }
  },
};
