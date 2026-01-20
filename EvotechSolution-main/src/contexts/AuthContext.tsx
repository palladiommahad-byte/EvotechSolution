import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { settingsService } from '@/services/settings.service';
import { useUpdateUserLastLogin } from '@/hooks/useSettings';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'accountant' | 'staff';
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: (statusChange?: boolean) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const updateLastLoginMutation = useUpdateUserLastLogin();

  // Load user from localStorage on mount (fallback)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedUser = localStorage.getItem('auth_user');
        const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
        
        if (storedUser && isAuthenticated) {
          try {
            const parsedUser = JSON.parse(storedUser);
            // Set user immediately from localStorage
            setUser(parsedUser);
            
            // Verify user still exists in database and is active (non-blocking)
            // Only clear user if we're certain they should be logged out
            settingsService.getUserById(parsedUser.id).then(dbUser => {
              if (dbUser && dbUser.status !== 'active') {
                // User exists but is inactive, log out
                setUser(null);
                localStorage.removeItem('auth_user');
                localStorage.removeItem('isAuthenticated');
              }
              // If dbUser is null, keep localStorage user as fallback (user might not exist in DB yet)
            }).catch((error) => {
              // Database error - keep localStorage user as fallback
              // Don't clear user on database errors to prevent login loops
              console.warn('Database verification failed, using localStorage user:', error);
            });
          } catch (parseError) {
            console.error('Error parsing stored user:', parseError);
            // Clear corrupted data
            localStorage.removeItem('auth_user');
            localStorage.removeItem('isAuthenticated');
          }
        }
      } catch (error) {
        console.error('Error loading auth state:', error);
        // Clear potentially corrupted data
        localStorage.removeItem('auth_user');
        localStorage.removeItem('isAuthenticated');
      }
    }
    setLoading(false);
  }, []);

  // Monitor user status changes and log out if status becomes inactive
  useEffect(() => {
    if (!user || loading) return;

    const checkUserStatus = async () => {
      try {
        // Check user status in database
        const dbUser = await settingsService.getUserById(user.id);
        
        // Only log out if user exists in DB and is inactive
        // If user doesn't exist in DB, keep localStorage user (fallback mode)
        if (dbUser && dbUser.status !== 'active') {
          // User exists but is inactive, log them out
          setUser(null);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_user');
            localStorage.removeItem('isAuthenticated');
            localStorage.setItem('statusChangeLogout', 'true');
            localStorage.setItem('statusChangeTimestamp', Date.now().toString());
            
            // Redirect to login page
            window.location.href = '/login';
          }
          return;
        }
        
      } catch (error) {
        // Database error - don't log out user, just log the error
        // This prevents login loops when database is unavailable
        console.warn('Error checking user status (non-critical):', error);
      }
    };

    // Check status every 30 seconds (less frequent to reduce database load)
    // Only check if user is logged in
    const interval = setInterval(() => {
      if (user) {
        checkUserStatus();
      }
    }, 30000);


    // Custom event for same-tab updates
    const handleUserStatusChange = () => {
      if (user) {
        checkUserStatus();
      }
    };
    window.addEventListener('userStatusChanged', handleUserStatusChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('userStatusChanged', handleUserStatusChange);
    };
  }, [user, loading]);

  // Simple hash function for password (same as in Settings)
  const hashPassword = (password: string): string => {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `hash_${Math.abs(hash)}`;
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // Simple validation
      if (!email || !password) {
        return false;
      }

      const hashedPassword = hashPassword(password);

      try {
        // Try to authenticate against database first
        const dbUser = await settingsService.getUserByEmail(email);
        
        if (dbUser && dbUser.password_hash === hashedPassword && dbUser.status === 'active') {
          // Map role_id to role
          const roleMap: Record<string, 'admin' | 'manager' | 'accountant' | 'staff'> = {
            'admin': 'admin',
            'manager': 'manager',
            'accountant': 'accountant',
            'staff': 'staff',
          };
          
          const authenticatedUser: User = {
            id: dbUser.id,
            name: dbUser.name,
            email: dbUser.email || email,
            role: roleMap[dbUser.role_id] || 'staff',
          };

          setUser(authenticatedUser);
          
          // Update last login
          try {
            await updateLastLoginMutation.mutateAsync(dbUser.id);
          } catch (error) {
            console.warn('Error updating last login:', error);
          }
          
          // Store in localStorage as backup
          if (typeof window !== 'undefined') {
            localStorage.setItem('auth_user', JSON.stringify(authenticatedUser));
            localStorage.setItem('isAuthenticated', 'true');
          }
          
          return true;
        }
      } catch (dbError) {
        console.warn('Database authentication failed:', dbError);
      }

      // If no match found, authentication failed
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = (statusChange: boolean = false) => {
    setUser(null);
    
    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_user');
      localStorage.removeItem('isAuthenticated');
      
      // If logout is due to status change, trigger notification
      if (statusChange) {
        localStorage.setItem('statusChangeLogout', 'true');
        localStorage.setItem('statusChangeTimestamp', Date.now().toString());
        
        // Dispatch custom event for status change
        window.dispatchEvent(new CustomEvent('userLoggedOutDueToStatusChange'));
      }
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
