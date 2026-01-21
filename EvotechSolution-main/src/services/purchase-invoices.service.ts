/**
 * Purchase Invoices Service
 * Handles all database operations for purchase invoices using Supabase
 */

import { getSupabaseClient } from '@/lib/supabase';

export interface PurchaseInvoiceItem {
  id: string;
  purchase_invoice_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface PurchaseInvoice {
  id: string;
  document_id: string;
  supplier_id: string;
  date: string;
  due_date: string | null;
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
  total: number;
  payment_method: 'cash' | 'check' | 'bank_transfer' | null;
  check_number: string | null;
  status: 'draft' | 'received' | 'paid' | 'overdue' | 'cancelled';
  note: string | null;
  attachment_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseInvoiceWithItems extends PurchaseInvoice {
  items: PurchaseInvoiceItem[];
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

export const purchaseInvoicesService = {
  /**
   * Get all purchase invoices with optional filters
   */
  async getAll(filters?: {
    status?: string;
    supplierId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<PurchaseInvoiceWithItems[]> {
    try {
      const supabase = getSupabaseClient();

      // Build query
      let query = supabase
        .from('purchase_invoices')
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
      const { data: purchaseInvoices, error } = await query
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch items and supplier data for each purchase invoice
      const purchaseInvoicesWithItems: PurchaseInvoiceWithItems[] = await Promise.all(
        (purchaseInvoices || []).map(async (pi) => {
          // Fetch items
          const { data: items } = await supabase
            .from('purchase_invoice_items')
            .select('*')
            .eq('purchase_invoice_id', pi.id)
            .order('created_at', { ascending: true });

          // Fetch supplier data
          let supplier = undefined;
          if (pi.supplier_id) {
            const { data: supplierData } = await supabase
              .from('contacts')
              .select('id, name, company, email, phone, ice, if_number, rc')
              .eq('id', pi.supplier_id)
              .single();
            if (supplierData) {
              supplier = supplierData;
            }
          }

          return {
            ...pi,
            items: items || [],
            supplier,
          };
        })
      );

      return purchaseInvoicesWithItems;
    } catch (error) {
      console.error('Error fetching purchase invoices:', error);
      throw error;
    }
  },

  /**
   * Get a single purchase invoice by ID
   */
  async getById(id: string): Promise<PurchaseInvoiceWithItems | null> {
    try {
      const supabase = getSupabaseClient();

      const { data: purchaseInvoice, error } = await supabase
        .from('purchase_invoices')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!purchaseInvoice) return null;

      // Fetch items
      const { data: items } = await supabase
        .from('purchase_invoice_items')
        .select('*')
        .eq('purchase_invoice_id', id)
        .order('created_at', { ascending: true });

      // Fetch supplier data
      let supplier = undefined;
      if (purchaseInvoice.supplier_id) {
        const { data: supplierData } = await supabase
          .from('contacts')
          .select('id, name, company, email, phone, ice, if_number, rc')
          .eq('id', purchaseInvoice.supplier_id)
          .single();
        if (supplierData) {
          supplier = supplierData;
        }
      }

      return {
        ...purchaseInvoice,
        items: items || [],
        supplier,
      };
    } catch (error) {
      console.error('Error fetching purchase invoice:', error);
      throw error;
    }
  },

  /**
   * Create a new purchase invoice
   */
  async create(data: {
    document_id: string;
    supplier_id: string;
    date: string;
    due_date?: string;
    subtotal: number;
    vat_rate?: number;
    vat_amount: number;
    total: number;
    payment_method?: 'cash' | 'check' | 'bank_transfer';
    check_number?: string;
    status?: 'draft' | 'received' | 'paid' | 'overdue' | 'cancelled';
    note?: string;
    attachment_url?: string;
    items: Array<{
      product_id?: string | null;
      description: string;
      quantity: number;
      unit_price: number;
    }>;
  }): Promise<PurchaseInvoiceWithItems> {
    try {
      const supabase = getSupabaseClient();

      // Create purchase invoice
      const { data: purchaseInvoice, error: piError } = await supabase
        .from('purchase_invoices')
        .insert({
          document_id: data.document_id,
          supplier_id: data.supplier_id,
          date: data.date,
          due_date: data.due_date || null,
          subtotal: data.subtotal,
          vat_rate: data.vat_rate || 20.00,
          vat_amount: data.vat_amount,
          total: data.total,
          payment_method: data.payment_method || null,
          check_number: data.payment_method === 'check' ? (data.check_number || null) : null,
          status: data.status || 'draft',
          note: data.note || null,
          attachment_url: data.attachment_url || null,
        })
        .select()
        .single();

      if (piError) throw piError;

      // Create items
      if (data.items && data.items.length > 0) {
        const itemsToInsert = data.items.map(item => ({
          purchase_invoice_id: purchaseInvoice.id,
          product_id: item.product_id || null,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.quantity * item.unit_price,
        }));

        const { error: itemsError } = await supabase
          .from('purchase_invoice_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      // Fetch the complete purchase invoice with items and supplier
      const completePI = await this.getById(purchaseInvoice.id);
      if (!completePI) throw new Error('Failed to fetch created purchase invoice');

      return completePI;
    } catch (error) {
      console.error('Error creating purchase invoice:', error);
      throw error;
    }
  },

  /**
   * Update a purchase invoice
   */
  async update(
    id: string,
    data: {
      date?: string;
      due_date?: string;
      subtotal?: number;
      vat_rate?: number;
      vat_amount?: number;
      total?: number;
      payment_method?: 'cash' | 'check' | 'bank_transfer';
      check_number?: string;
      status?: 'draft' | 'received' | 'paid' | 'overdue' | 'cancelled';
      note?: string;
      attachment_url?: string;
      items?: Array<{
        product_id?: string | null;
        description: string;
        quantity: number;
        unit_price: number;
      }>;
    }
  ): Promise<PurchaseInvoiceWithItems> {
    try {
      const supabase = getSupabaseClient();

      // Update purchase invoice
      const updateData: any = {};
      if (data.date !== undefined) updateData.date = data.date;
      if (data.due_date !== undefined) updateData.due_date = data.due_date || null;
      if (data.subtotal !== undefined) updateData.subtotal = data.subtotal;
      if (data.vat_rate !== undefined) updateData.vat_rate = data.vat_rate;
      if (data.vat_amount !== undefined) updateData.vat_amount = data.vat_amount;
      if (data.total !== undefined) updateData.total = data.total;
      if (data.payment_method !== undefined) updateData.payment_method = data.payment_method || null;
      if (data.check_number !== undefined) updateData.check_number = data.payment_method === 'check' ? (data.check_number || null) : null;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.note !== undefined) updateData.note = data.note || null;
      if (data.attachment_url !== undefined) updateData.attachment_url = data.attachment_url || null;
      updateData.updated_at = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('purchase_invoices')
        .update(updateData)
        .eq('id', id);

      if (updateError) throw updateError;

      // Update items if provided
      if (data.items !== undefined) {
        // Delete existing items
        const { error: deleteError } = await supabase
          .from('purchase_invoice_items')
          .delete()
          .eq('purchase_invoice_id', id);

        if (deleteError) throw deleteError;

        // Insert new items
        if (data.items.length > 0) {
          const itemsToInsert = data.items.map(item => ({
            purchase_invoice_id: id,
            product_id: item.product_id || null,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.quantity * item.unit_price,
          }));

          const { error: itemsError } = await supabase
            .from('purchase_invoice_items')
            .insert(itemsToInsert);

          if (itemsError) throw itemsError;
        }
      }

      // Fetch the updated purchase invoice
      const updatedPI = await this.getById(id);
      if (!updatedPI) throw new Error('Failed to fetch updated purchase invoice');

      return updatedPI;
    } catch (error) {
      console.error('Error updating purchase invoice:', error);
      throw error;
    }
  },

  /**
   * Delete a purchase invoice
   */
  async delete(id: string): Promise<void> {
    try {
      const supabase = getSupabaseClient();

      // Delete purchase invoice (items will be deleted via CASCADE)
      const { error } = await supabase
        .from('purchase_invoices')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting purchase invoice:', error);
      throw error;
    }
  },
};
