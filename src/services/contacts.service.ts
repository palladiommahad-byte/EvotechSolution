/**
 * Contacts Service
 * Handles all database operations for contacts (clients and suppliers) using Supabase
 */

import { getSupabaseClient } from '@/lib/supabase';

export interface Contact {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  city?: string;
  address?: string;
  ice?: string;
  if_number?: string;
  ifNumber?: string; // Alias for if_number for UI compatibility
  rc?: string;
  contact_type: 'client' | 'supplier';
  status: 'active' | 'inactive';
  total_transactions?: number;
  totalTransactions?: number; // Alias for total_transactions for UI compatibility
  created_at?: string;
  updated_at?: string;
}

export const contactsService = {
  /**
   * Get all contacts with optional filters
   */
  async getAll(filters?: {
    contactType?: 'client' | 'supplier';
    status?: 'active' | 'inactive';
    search?: string;
  }): Promise<Contact[]> {
    try {
      const supabase = getSupabaseClient();
      
      let query = supabase
        .from('contacts')
        .select('*');
      
      // Apply filters
      if (filters?.contactType) {
        query = query.eq('contact_type', filters.contactType);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,company.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }
      
      const { data, error } = await query
        .order('name', { ascending: true });
      
      if (error) {
        console.error('Error fetching contacts:', error);
        return [];
      }
      
      // Map database fields to UI-friendly fields
      return (data || []).map((contact: any) => ({
        ...contact,
        ifNumber: contact.if_number,
        totalTransactions: contact.total_transactions || 0,
      })) as Contact[];
    } catch (error) {
      console.error('Error fetching contacts:', error);
      return [];
    }
  },

  /**
   * Get contact by ID
   */
  async getById(id: string): Promise<Contact | null> {
    try {
      const supabase = getSupabaseClient();
      
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('Error fetching contact:', error);
        return null;
      }
      
      if (!data) return null;
      
      // Map database fields to UI-friendly fields
      return {
        ...data,
        ifNumber: data.if_number,
        totalTransactions: data.total_transactions || 0,
      } as Contact;
    } catch (error) {
      console.error('Error fetching contact:', error);
      return null;
    }
  },

  /**
   * Create a new contact
   */
  async create(contact: Omit<Contact, 'id' | 'created_at' | 'updated_at' | 'total_transactions' | 'totalTransactions'>): Promise<Contact> {
    try {
      const supabase = getSupabaseClient();
      
      // Map UI fields to database fields
      const { ifNumber, totalTransactions, ...dbContact } = contact as any;
      const contactToInsert = {
        ...dbContact,
        if_number: ifNumber || dbContact.if_number,
        total_transactions: totalTransactions || dbContact.total_transactions || 0,
      };
      
      const { data, error } = await supabase
        .from('contacts')
        .insert([contactToInsert])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating contact:', error);
        throw error;
      }
      
      // Map database fields to UI-friendly fields
      return {
        ...data,
        ifNumber: data.if_number,
        totalTransactions: data.total_transactions || 0,
      } as Contact;
    } catch (error) {
      console.error('Error creating contact:', error);
      throw error;
    }
  },

  /**
   * Update a contact
   */
  async update(id: string, contact: Partial<Contact>): Promise<Contact> {
    try {
      const supabase = getSupabaseClient();
      
      // Map UI fields to database fields
      const { ifNumber, totalTransactions, ...dbContact } = contact as any;
      const contactToUpdate: any = {
        ...dbContact,
        updated_at: new Date().toISOString(),
      };
      
      if (ifNumber !== undefined) contactToUpdate.if_number = ifNumber;
      if (totalTransactions !== undefined) contactToUpdate.total_transactions = totalTransactions;
      
      const { data, error } = await supabase
        .from('contacts')
        .update(contactToUpdate)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating contact:', error);
        throw error;
      }
      
      // Map database fields to UI-friendly fields
      return {
        ...data,
        ifNumber: data.if_number,
        totalTransactions: data.total_transactions || 0,
      } as Contact;
    } catch (error) {
      console.error('Error updating contact:', error);
      throw error;
    }
  },

  /**
   * Delete a contact
   */
  async delete(id: string): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting contact:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error deleting contact:', error);
      throw error;
    }
  },

  /**
   * Get clients only
   */
  async getClients(filters?: {
    status?: 'active' | 'inactive';
    search?: string;
  }): Promise<Contact[]> {
    return this.getAll({ ...filters, contactType: 'client' });
  },

  /**
   * Get suppliers only
   */
  async getSuppliers(filters?: {
    status?: 'active' | 'inactive';
    search?: string;
  }): Promise<Contact[]> {
    return this.getAll({ ...filters, contactType: 'supplier' });
  },
};
