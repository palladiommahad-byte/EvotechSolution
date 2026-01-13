/**
 * Purchase Orders Service
 * Handles all database operations for purchase orders using Supabase
 */

import { getSupabaseClient } from '@/lib/supabase';

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface PurchaseOrder {
  id: string;
  document_id: string;
  supplier_id: string;
  date: string;
  subtotal: number;
  status: 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled';
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderWithItems extends PurchaseOrder {
  items: PurchaseOrderItem[];
  supplier?: {
    id: string;
    name: string;
    company: string;
    email: string;
    phone: string;
    ice: string | null;
    if_number: string | null;
    rc: string | null;
  };
}

export const purchaseOrdersService = {
  /**
   * Get all purchase orders with optional filters
   */
  async getAll(filters?: {
    status?: string;
    supplierId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<PurchaseOrderWithItems[]> {
    try {
      const supabase = getSupabaseClient();
      
      // Build query
      let query = supabase
        .from('purchase_orders')
        .select('*');
      
      // Apply filters
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.supplierId) {
        query = query.eq('supplier_id', filters.supplierId);
      }
      if (filters?.startDate) {
        query = query.gte('date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('date', filters.endDate);
      }
      
      // Order and execute
      const { data: purchaseOrders, error } = await query
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Fetch items and supplier data for each purchase order
      const purchaseOrdersWithItems: PurchaseOrderWithItems[] = await Promise.all(
        (purchaseOrders || []).map(async (po) => {
          // Fetch items
          const { data: items } = await supabase
            .from('purchase_order_items')
            .select('*')
            .eq('purchase_order_id', po.id)
            .order('created_at', { ascending: true });
          
          // Fetch supplier data
          let supplier = undefined;
          if (po.supplier_id) {
            const { data: supplierData } = await supabase
              .from('contacts')
              .select('id, name, company, email, phone, ice, if_number, rc')
              .eq('id', po.supplier_id)
              .single();
            if (supplierData) {
              supplier = supplierData;
            }
          }
          
          return {
            ...po,
            items: items || [],
            supplier,
          };
        })
      );
      
      return purchaseOrdersWithItems;
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      throw error;
    }
  },

  /**
   * Get a single purchase order by ID
   */
  async getById(id: string): Promise<PurchaseOrderWithItems | null> {
    try {
      const supabase = getSupabaseClient();
      
      const { data: purchaseOrder, error } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      if (!purchaseOrder) return null;
      
      // Fetch items
      const { data: items } = await supabase
        .from('purchase_order_items')
        .select('*')
        .eq('purchase_order_id', id)
        .order('created_at', { ascending: true });
      
      // Fetch supplier data
      let supplier = undefined;
      if (purchaseOrder.supplier_id) {
        const { data: supplierData } = await supabase
          .from('contacts')
          .select('id, name, company, email, phone, ice, if_number, rc')
          .eq('id', purchaseOrder.supplier_id)
          .single();
        if (supplierData) {
          supplier = supplierData;
        }
      }
      
      return {
        ...purchaseOrder,
        items: items || [],
        supplier,
      };
    } catch (error) {
      console.error('Error fetching purchase order:', error);
      throw error;
    }
  },

  /**
   * Create a new purchase order
   */
  async create(data: {
    document_id: string;
    supplier_id: string;
    date: string;
    subtotal: number;
    status?: 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled';
    note?: string;
    items: Array<{
      product_id?: string | null;
      description: string;
      quantity: number;
      unit_price: number;
    }>;
  }): Promise<PurchaseOrderWithItems> {
    try {
      const supabase = getSupabaseClient();
      
      // Create purchase order
      const { data: purchaseOrder, error: poError } = await supabase
        .from('purchase_orders')
        .insert({
          document_id: data.document_id,
          supplier_id: data.supplier_id,
          date: data.date,
          subtotal: data.subtotal,
          status: data.status || 'draft',
          note: data.note || null,
        })
        .select()
        .single();
      
      if (poError) throw poError;
      
      // Create items
      if (data.items && data.items.length > 0) {
        const itemsToInsert = data.items.map(item => ({
          purchase_order_id: purchaseOrder.id,
          product_id: item.product_id || null,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.quantity * item.unit_price,
        }));
        
        const { error: itemsError } = await supabase
          .from('purchase_order_items')
          .insert(itemsToInsert);
        
        if (itemsError) throw itemsError;
      }
      
      // Fetch the complete purchase order with items and supplier
      const completePO = await this.getById(purchaseOrder.id);
      if (!completePO) throw new Error('Failed to fetch created purchase order');
      
      return completePO;
    } catch (error) {
      console.error('Error creating purchase order:', error);
      throw error;
    }
  },

  /**
   * Update a purchase order
   */
  async update(
    id: string,
    data: {
      date?: string;
      subtotal?: number;
      status?: 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled';
      note?: string;
      items?: Array<{
        product_id?: string | null;
        description: string;
        quantity: number;
        unit_price: number;
      }>;
    }
  ): Promise<PurchaseOrderWithItems> {
    try {
      const supabase = getSupabaseClient();
      
      // Update purchase order
      const updateData: any = {};
      if (data.date !== undefined) updateData.date = data.date;
      if (data.subtotal !== undefined) updateData.subtotal = data.subtotal;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.note !== undefined) updateData.note = data.note || null;
      updateData.updated_at = new Date().toISOString();
      
      const { error: updateError } = await supabase
        .from('purchase_orders')
        .update(updateData)
        .eq('id', id);
      
      if (updateError) throw updateError;
      
      // Update items if provided
      if (data.items !== undefined) {
        // Delete existing items
        const { error: deleteError } = await supabase
          .from('purchase_order_items')
          .delete()
          .eq('purchase_order_id', id);
        
        if (deleteError) throw deleteError;
        
        // Insert new items
        if (data.items.length > 0) {
          const itemsToInsert = data.items.map(item => ({
            purchase_order_id: id,
            product_id: item.product_id || null,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.quantity * item.unit_price,
          }));
          
          const { error: itemsError } = await supabase
            .from('purchase_order_items')
            .insert(itemsToInsert);
          
          if (itemsError) throw itemsError;
        }
      }
      
      // Fetch the updated purchase order
      const updatedPO = await this.getById(id);
      if (!updatedPO) throw new Error('Failed to fetch updated purchase order');
      
      return updatedPO;
    } catch (error) {
      console.error('Error updating purchase order:', error);
      throw error;
    }
  },

  /**
   * Delete a purchase order
   */
  async delete(id: string): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      
      // Delete purchase order (items will be deleted via CASCADE)
      const { error } = await supabase
        .from('purchase_orders')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting purchase order:', error);
      throw error;
    }
  },
};
