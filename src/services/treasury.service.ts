/**
 * Treasury Service
 * Handles all database operations for treasury (bank accounts, warehouse cash, payments) using Supabase
 */

import { getSupabaseClient } from '@/lib/supabase';

export interface BankAccount {
  id: string;
  name: string;
  bank: string;
  account_number: string;
  accountNumber?: string; // Alias for UI compatibility
  balance: number;
  created_at?: string;
  updated_at?: string;
}

export interface WarehouseCash {
  id?: string;
  warehouse_id: string;
  warehouseId?: string; // Alias for UI compatibility
  amount: number; // Note: database column is 'amount', not 'cash_amount'
  created_at?: string;
  updated_at?: string;
}

export interface TreasuryPayment {
  id: string;
  invoice_id: string;
  invoiceId?: string; // Alias for UI compatibility
  invoice_number: string;
  invoiceNumber?: string; // Alias for UI compatibility
  entity: string;
  amount: number;
  payment_method: 'cash' | 'check' | 'bank_transfer';
  paymentMethod?: 'cash' | 'check' | 'bank_transfer'; // Alias for UI compatibility
  bank?: string;
  check_number?: string;
  checkNumber?: string; // Alias for UI compatibility
  maturity_date?: string;
  maturityDate?: string; // Alias for UI compatibility
  status: 'in-hand' | 'pending_bank' | 'cleared';
  date: string; // UI field name, maps to payment_date in database
  payment_date?: string; // Database field name
  warehouse?: string;
  warehouse_id?: string; // Database field name
  notes?: string;
  payment_type: 'sales' | 'purchase';
  paymentType?: 'sales' | 'purchase'; // Alias for UI compatibility
  created_at?: string;
  updated_at?: string;
}

export const treasuryService = {
  /**
   * Bank Accounts CRUD
   */
  async getAllBankAccounts(): Promise<BankAccount[]> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('treasury_bank_accounts')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching bank accounts:', error);
        return [];
      }

      return (data || []).map((account: any) => ({
        ...account,
        accountNumber: account.account_number,
      })) as BankAccount[];
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
      return [];
    }
  },

  async getBankAccountById(id: string): Promise<BankAccount | null> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('treasury_bank_accounts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        console.error('Error fetching bank account:', error);
        return null;
      }

      if (!data) return null;
      return {
        ...data,
        accountNumber: data.account_number,
      } as BankAccount;
    } catch (error) {
      console.error('Error fetching bank account:', error);
      return null;
    }
  },

  async createBankAccount(account: Omit<BankAccount, 'id' | 'created_at' | 'updated_at' | 'accountNumber'>): Promise<BankAccount> {
    try {
      const supabase = getSupabaseClient();
      const { accountNumber, ...dbAccount } = account as any;
      const accountToInsert = {
        ...dbAccount,
        account_number: accountNumber || dbAccount.account_number,
      };

      const { data, error } = await supabase
        .from('treasury_bank_accounts')
        .insert([accountToInsert])
        .select()
        .single();

      if (error) {
        console.error('Error creating bank account:', error);
        throw error;
      }

      return {
        ...data,
        accountNumber: data.account_number,
      } as BankAccount;
    } catch (error) {
      console.error('Error creating bank account:', error);
      throw error;
    }
  },

  async updateBankAccount(id: string, account: Partial<BankAccount>): Promise<BankAccount> {
    try {
      const supabase = getSupabaseClient();
      const { accountNumber, ...dbAccount } = account as any;
      const accountToUpdate: any = {
        ...dbAccount,
        updated_at: new Date().toISOString(),
      };

      if (accountNumber !== undefined) accountToUpdate.account_number = accountNumber;

      const { data, error } = await supabase
        .from('treasury_bank_accounts')
        .update(accountToUpdate)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating bank account:', error);
        throw error;
      }

      return {
        ...data,
        accountNumber: data.account_number,
      } as BankAccount;
    } catch (error) {
      console.error('Error updating bank account:', error);
      throw error;
    }
  },

  async deleteBankAccount(id: string): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('treasury_bank_accounts')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting bank account:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error deleting bank account:', error);
      throw error;
    }
  },

  /**
   * Warehouse Cash CRUD
   */
  async getAllWarehouseCash(): Promise<WarehouseCash[]> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('treasury_warehouse_cash')
        .select('*')
        .order('warehouse_id', { ascending: true });

      if (error) {
        console.error('Error fetching warehouse cash:', error);
        return [];
      }

      return (data || []).map((cash: any) => ({
        ...cash,
        warehouseId: cash.warehouse_id,
      })) as WarehouseCash[];
    } catch (error) {
      console.error('Error fetching warehouse cash:', error);
      return [];
    }
  },

  async updateWarehouseCash(warehouseId: string, amount: number): Promise<WarehouseCash> {
    try {
      const supabase = getSupabaseClient();

      // First, try to update if exists
      const { data: updatedData, error: updateError } = await supabase
        .from('treasury_warehouse_cash')
        .update({
          amount: amount,
          updated_at: new Date().toISOString(),
        })
        .eq('warehouse_id', warehouseId)
        .select()
        .single();

      if (updateError && updateError.code !== 'PGRST116') {
        console.error(`Error updating warehouse cash for ${warehouseId}:`, updateError);
        throw updateError;
      }

      if (updatedData) {
        return {
          ...updatedData,
          warehouseId: updatedData.warehouse_id,
        } as WarehouseCash;
      } else {
        // If no row was updated, insert a new one
        const { data: insertedData, error: insertError } = await supabase
          .from('treasury_warehouse_cash')
          .insert({
            warehouse_id: warehouseId,
            amount: amount,
          })
          .select()
          .single();

        if (insertError) {
          console.error(`Error inserting warehouse cash for ${warehouseId}:`, insertError);
          throw insertError;
        }

        return {
          ...insertedData,
          warehouseId: insertedData.warehouse_id,
        } as WarehouseCash;
      }
    } catch (error) {
      console.error(`Error updating/inserting warehouse cash for ${warehouseId}:`, error);
      throw error;
    }
  },

  /**
   * Payments CRUD
   */
  async getAllPayments(paymentType?: 'sales' | 'purchase'): Promise<TreasuryPayment[]> {
    try {
      const supabase = getSupabaseClient();
      let query = supabase
        .from('treasury_payments')
        .select('*');

      if (paymentType) {
        query = query.eq('payment_type', paymentType);
      }

      const { data, error } = await query
        .order('payment_date', { ascending: false });

      if (error) {
        console.error('Error fetching payments:', error);
        return [];
      }

      return (data || []).map((payment: any) => ({
        ...payment,
        invoiceId: payment.invoice_id,
        invoiceNumber: payment.invoice_number,
        paymentMethod: payment.payment_method,
        checkNumber: payment.check_number,
        maturityDate: payment.maturity_date,
        paymentType: payment.payment_type,
        date: payment.payment_date || payment.date, // Map payment_date to date for UI
        warehouse: payment.warehouse_id || payment.warehouse,
      })) as TreasuryPayment[];
    } catch (error) {
      console.error('Error fetching payments:', error);
      return [];
    }
  },

  async getPaymentById(id: string): Promise<TreasuryPayment | null> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('treasury_payments')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        console.error('Error fetching payment:', error);
        return null;
      }

      if (!data) return null;
      return {
        ...data,
        invoiceId: data.invoice_id,
        invoiceNumber: data.invoice_number,
        paymentMethod: data.payment_method,
        checkNumber: data.check_number,
        maturityDate: data.maturity_date,
        paymentType: data.payment_type,
        date: data.payment_date || data.date,
        warehouse: data.warehouse_id || data.warehouse,
      } as TreasuryPayment;
    } catch (error) {
      console.error('Error fetching payment:', error);
      return null;
    }
  },

  async createPayment(payment: Omit<TreasuryPayment, 'id' | 'created_at' | 'updated_at' | 'invoiceId' | 'invoiceNumber' | 'paymentMethod' | 'checkNumber' | 'maturityDate' | 'paymentType' | 'payment_date' | 'warehouse_id'>): Promise<TreasuryPayment> {
    try {
      const supabase = getSupabaseClient();
      const {
        invoiceId,
        invoiceNumber,
        paymentMethod,
        checkNumber,
        maturityDate,
        paymentType,
        date,
        warehouse,
        ...dbPayment
      } = payment as any;

      const paymentToInsert = {
        ...dbPayment,
        invoice_id: invoiceId || dbPayment.invoice_id,
        invoice_number: invoiceNumber || dbPayment.invoice_number,
        payment_method: paymentMethod || dbPayment.payment_method,
        check_number: checkNumber || dbPayment.check_number,
        maturity_date: maturityDate || dbPayment.maturity_date,
        payment_type: paymentType || dbPayment.payment_type,
        payment_date: date || dbPayment.payment_date || dbPayment.date,
        warehouse_id: warehouse || dbPayment.warehouse_id,
      };

      const { data, error } = await supabase
        .from('treasury_payments')
        .insert([paymentToInsert])
        .select()
        .single();

      if (error) {
        console.error('Error creating payment:', error);
        throw error;
      }

      return {
        ...data,
        invoiceId: data.invoice_id,
        invoiceNumber: data.invoice_number,
        paymentMethod: data.payment_method,
        checkNumber: data.check_number,
        maturityDate: data.maturity_date,
        paymentType: data.payment_type,
        date: data.payment_date || data.date,
        warehouse: data.warehouse_id || data.warehouse,
      } as TreasuryPayment;
    } catch (error) {
      console.error('Error creating payment:', error);
      throw error;
    }
  },

  async updatePayment(id: string, payment: Partial<TreasuryPayment>): Promise<TreasuryPayment> {
    try {
      const supabase = getSupabaseClient();
      const {
        invoiceId,
        invoiceNumber,
        paymentMethod,
        checkNumber,
        maturityDate,
        paymentType,
        date,
        warehouse,
        ...dbPayment
      } = payment as any;

      const paymentToUpdate: any = {
        ...dbPayment,
        updated_at: new Date().toISOString(),
      };

      if (invoiceId !== undefined) paymentToUpdate.invoice_id = invoiceId;
      if (invoiceNumber !== undefined) paymentToUpdate.invoice_number = invoiceNumber;
      if (paymentMethod !== undefined) paymentToUpdate.payment_method = paymentMethod;
      if (checkNumber !== undefined) paymentToUpdate.check_number = checkNumber;
      if (maturityDate !== undefined) paymentToUpdate.maturity_date = maturityDate;
      if (paymentType !== undefined) paymentToUpdate.payment_type = paymentType;
      if (date !== undefined) paymentToUpdate.payment_date = date;
      if (warehouse !== undefined) paymentToUpdate.warehouse_id = warehouse;

      const { data, error } = await supabase
        .from('treasury_payments')
        .update(paymentToUpdate)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating payment:', error);
        throw error;
      }

      return {
        ...data,
        invoiceId: data.invoice_id,
        invoiceNumber: data.invoice_number,
        paymentMethod: data.payment_method,
        checkNumber: data.check_number,
        maturityDate: data.maturity_date,
        paymentType: data.payment_type,
        date: data.payment_date || data.date,
        warehouse: data.warehouse_id || data.warehouse,
      } as TreasuryPayment;
    } catch (error) {
      console.error('Error updating payment:', error);
      throw error;
    }
  },

  async deletePayment(id: string): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('treasury_payments')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting payment:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error deleting payment:', error);
      throw error;
    }
  },

  async updatePaymentStatus(id: string, status: TreasuryPayment['status']): Promise<TreasuryPayment> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('treasury_payments')
        .update({
          status: status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating payment status:', error);
        throw error;
      }

      return {
        ...data,
        invoiceId: data.invoice_id,
        invoiceNumber: data.invoice_number,
        paymentMethod: data.payment_method,
        checkNumber: data.check_number,
        maturityDate: data.maturity_date,
        paymentType: data.payment_type,
        date: data.payment_date || data.date,
        warehouse: data.warehouse_id || data.warehouse,
      } as TreasuryPayment;
    } catch (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  },
};
