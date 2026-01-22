/**
 * Settings Service
 * Handles all database operations for settings using Supabase
 * Includes: Company settings, User preferences, Warehouses, Users, Notifications
 */

import { getSupabaseClient } from '@/lib/supabase';

// ============================================
// COMPANY SETTINGS
// ============================================

export interface CompanySettings {
  id: string;
  name: string;
  legal_form?: string;
  email?: string;
  phone?: string;
  address?: string;
  ice?: string;
  if_number?: string;
  rc?: string;
  tp?: string;
  cnss?: string;
  logo?: string | null;
  footer_text?: string;
  created_at?: string;
  updated_at?: string;
}

// ============================================
// USER PREFERENCES
// ============================================

export interface UserPreferences {
  id: string;
  user_id: string;
  theme_color?: 'navy' | 'indigo' | 'blue' | 'sky' | 'teal' | 'slate' | 'rose' | 'cyan' | 'yellow';
  language?: 'en' | 'fr';
  active_warehouse_id?: string | null;
  browser_notifications_enabled?: boolean;
  low_stock_alerts_enabled?: boolean;
  order_updates_enabled?: boolean;
  created_at?: string;
  updated_at?: string;
}

// ============================================
// WAREHOUSES
// ============================================

export interface Warehouse {
  id: string;
  name: string;
  city: string;
  address?: string;
  phone?: string;
  email?: string;
  created_at?: string;
  updated_at?: string;
}

// ============================================
// USERS
// ============================================

export interface User {
  id: string;
  email?: string;
  name: string;
  password_hash: string;
  role_id: 'admin' | 'manager' | 'accountant' | 'staff';
  status: 'active' | 'inactive';
  last_login?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

// ============================================
// NOTIFICATIONS
// ============================================

export interface Notification {
  id: string;
  user_id?: string | null;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  action_url?: string;
  action_label?: string;
  created_at?: string;
  read_at?: string;
}

// ============================================
// SETTINGS SERVICE
// ============================================

export const settingsService = {
  // ============================================
  // COMPANY SETTINGS
  // ============================================

  /**
   * Get company settings
   * Since there's only one company_settings row, we get the first one
   */
  async getCompanySettings(): Promise<CompanySettings | null> {
    try {
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching company settings:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching company settings:', error);
      return null;
    }
  },

  /**
   * Update company settings
   * Updates the single company_settings row
   */
  async updateCompanySettings(settings: Partial<CompanySettings>): Promise<CompanySettings | null> {
    try {
      const supabase = getSupabaseClient();

      // First, check if settings exist
      const existing = await this.getCompanySettings();

      if (!existing) {
        // Create if doesn't exist
        const { data, error } = await supabase
          .from('company_settings')
          .insert({
            name: settings.name || 'Company Name',
            legal_form: settings.legal_form,
            email: settings.email,
            phone: settings.phone,
            address: settings.address,
            ice: settings.ice,
            if_number: settings.if_number,
            rc: settings.rc,
            tp: settings.tp,
            cnss: settings.cnss,
            logo: settings.logo,
            footer_text: settings.footer_text,
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating company settings:', error);
          return null;
        }

        return data;
      } else {
        // Update existing
        const { data, error } = await supabase
          .from('company_settings')
          .update({
            ...settings,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) {
          console.error('Error updating company settings:', error);
          return null;
        }

        return data;
      }
    } catch (error) {
      console.error('Error updating company settings:', error);
      return null;
    }
  },

  // ============================================
  // USER PREFERENCES
  // ============================================

  /**
   * Get user preferences by user ID
   */
  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      // Validate UUID format before querying
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!userId || !uuidRegex.test(userId)) {
        console.warn('Invalid UUID format for user_id:', userId);
        return null;
      }

      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // If not found, return null (preferences will be created on first update)
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('Error fetching user preferences:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      return null;
    }
  },

  /**
   * Update user preferences
   * Creates preferences if they don't exist
   */
  async updateUserPreferences(
    userId: string,
    preferences: Partial<UserPreferences>
  ): Promise<UserPreferences | null> {
    try {
      const supabase = getSupabaseClient();

      // Check if preferences exist
      const existing = await this.getUserPreferences(userId);

      if (!existing) {
        // Create new preferences
        const { data, error } = await supabase
          .from('user_preferences')
          .insert({
            user_id: userId,
            theme_color: preferences.theme_color || 'navy',
            language: preferences.language || 'en',
            active_warehouse_id: preferences.active_warehouse_id,
            browser_notifications_enabled: preferences.browser_notifications_enabled ?? true,
            low_stock_alerts_enabled: preferences.low_stock_alerts_enabled ?? true,
            order_updates_enabled: preferences.order_updates_enabled ?? true,
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating user preferences:', error);
          return null;
        }

        return data;
      } else {
        // Update existing preferences
        const { data, error } = await supabase
          .from('user_preferences')
          .update({
            ...preferences,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) {
          console.error('Error updating user preferences:', error);
          return null;
        }

        return data;
      }
    } catch (error) {
      console.error('Error updating user preferences:', error);
      return null;
    }
  },

  // ============================================
  // WAREHOUSES
  // ============================================

  /**
   * Get all warehouses
   */
  async getWarehouses(): Promise<Warehouse[]> {
    try {
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching warehouses:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching warehouses:', error);
      return [];
    }
  },

  /**
   * Get warehouse by ID
   */
  async getWarehouseById(id: string): Promise<Warehouse | null> {
    try {
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching warehouse:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching warehouse:', error);
      return null;
    }
  },

  /**
   * Create warehouse
   */
  async createWarehouse(warehouse: Omit<Warehouse, 'id' | 'created_at' | 'updated_at'>): Promise<Warehouse | null> {
    try {
      const supabase = getSupabaseClient();

      // Generate ID from name (lowercase, replace spaces with hyphens)
      const id = warehouse.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

      const { data, error } = await supabase
        .from('warehouses')
        .insert({
          id,
          name: warehouse.name,
          city: warehouse.city,
          address: warehouse.address,
          phone: warehouse.phone,
          email: warehouse.email,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating warehouse:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error creating warehouse:', error);
      return null;
    }
  },

  /**
   * Update warehouse
   */
  async updateWarehouse(id: string, warehouse: Partial<Omit<Warehouse, 'id' | 'created_at'>>): Promise<Warehouse | null> {
    try {
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from('warehouses')
        .update({
          ...warehouse,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating warehouse:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error updating warehouse:', error);
      return null;
    }
  },

  /**
   * Delete warehouse
   */
  async deleteWarehouse(id: string): Promise<boolean> {
    try {
      const supabase = getSupabaseClient();

      const { error } = await supabase
        .from('warehouses')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting warehouse:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting warehouse:', error);
      return false;
    }
  },

  // ============================================
  // USERS
  // ============================================

  /**
   * Get all users
   */
  async getUsers(): Promise<User[]> {
    try {
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching users:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  },

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<User | null> {
    try {
      // Validate UUID format before querying
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!id || !uuidRegex.test(id)) {
        console.warn('Invalid UUID format for user id:', id);
        return null;
      }

      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching user:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  },

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // User not found
        }
        console.error('Error fetching user by email:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching user by email:', error);
      return null;
    }
  },

  /**
   * Create user
   * Note: Password should be hashed before calling this function
   */
  async createUser(user: Omit<User, 'id' | 'created_at' | 'updated_at' | 'last_login'>): Promise<User | null> {
    try {
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from('users')
        .insert({
          email: user.email,
          name: user.name,
          password_hash: user.password_hash,
          role_id: user.role_id,
          status: user.status || 'active',
          created_by: user.created_by,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating user:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error creating user:', error);
      return null;
    }
  },

  /**
   * Update user
   */
  async updateUser(id: string, user: Partial<Omit<User, 'id' | 'created_at'>>): Promise<User | null> {
    try {
      const supabase = getSupabaseClient();

      const updateData: any = {
        ...user,
        updated_at: new Date().toISOString(),
      };

      // Don't update password_hash if not provided
      if (!user.password_hash) {
        delete updateData.password_hash;
      }

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating user:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error updating user:', error);
      return null;
    }
  },

  /**
   * Delete user
   */
  async deleteUser(id: string): Promise<boolean> {
    try {
      const supabase = getSupabaseClient();

      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting user:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  },

  /**
   * Update user last login
   */
  async updateUserLastLogin(id: string): Promise<boolean> {
    try {
      const supabase = getSupabaseClient();

      const { error } = await supabase
        .from('users')
        .update({
          last_login: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('Error updating user last login:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating user last login:', error);
      return false;
    }
  },

  // ============================================
  // NOTIFICATIONS
  // ============================================

  /**
   * Get notifications for a user (or all if userId is null)
   */
  async getNotifications(userId?: string | null): Promise<Notification[]> {
    try {
      // Validate UUID format if userId is provided
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const validUserId = userId && uuidRegex.test(userId) ? userId : null;

      const supabase = getSupabaseClient();

      let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (validUserId) {
        query = query.or(`user_id.eq.${validUserId},user_id.is.null`);
      } else {
        query = query.is('user_id', null);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  },

  /**
   * Get unread notifications count for a user
   */
  async getUnreadNotificationsCount(userId?: string | null): Promise<number> {
    try {
      // Validate UUID format if userId is provided
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const validUserId = userId && uuidRegex.test(userId) ? userId : null;

      const supabase = getSupabaseClient();

      let query = supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('read', false);

      if (validUserId) {
        query = query.or(`user_id.eq.${validUserId},user_id.is.null`);
      } else {
        query = query.is('user_id', null);
      }

      const { count, error } = await query;

      if (error) {
        console.error('Error fetching unread notifications count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error fetching unread notifications count:', error);
      return 0;
    }
  },

  /**
   * Create notification
   */
  async createNotification(notification: Omit<Notification, 'id' | 'created_at' | 'read_at'>): Promise<Notification | null> {
    try {
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: notification.user_id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          read: notification.read || false,
          action_url: notification.action_url,
          action_label: notification.action_label,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating notification:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error creating notification:', error);
      return null;
    }
  },

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(id: string): Promise<boolean> {
    try {
      const supabase = getSupabaseClient();

      const { error } = await supabase
        .from('notifications')
        .update({
          read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('Error marking notification as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  },

  /**
   * Mark all notifications as read for a user
   */
  async markAllNotificationsAsRead(userId?: string | null): Promise<boolean> {
    try {
      const supabase = getSupabaseClient();

      let query = supabase
        .from('notifications')
        .update({
          read: true,
          read_at: new Date().toISOString(),
        })
        .eq('read', false);

      if (userId) {
        query = query.or(`user_id.eq.${userId},user_id.is.null`);
      } else {
        query = query.is('user_id', null);
      }

      const { error } = await query;

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  },

  /**
   * Delete notification
   */
  async deleteNotification(id: string): Promise<boolean> {
    try {
      const supabase = getSupabaseClient();

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting notification:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
  },

  /**
   * Delete all notifications for a user
   */
  async deleteAllNotifications(userId?: string | null): Promise<boolean> {
    try {
      const supabase = getSupabaseClient();

      let query = supabase
        .from('notifications')
        .delete();

      if (userId) {
        query = query.or(`user_id.eq.${userId},user_id.is.null`);
      } else {
        query = query.is('user_id', null);
      }

      const { error } = await query;

      if (error) {
        console.error('Error deleting all notifications:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      return false;
    }
  },
};
