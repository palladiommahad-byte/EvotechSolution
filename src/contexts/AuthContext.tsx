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
        
        // If dbUser is null, fallback to localStorage check
        if (!dbUser) {
          try {
            const saved = localStorage.getItem('teamUsers');
            if (saved) {
              const teamUsers = JSON.parse(saved);
              const currentTeamUser = teamUsers.find((tu: any) => 
                tu.id === user.id || tu.email === user.email
              );

              if (currentTeamUser && currentTeamUser.status === 'inactive') {
                setUser(null);
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('auth_user');
                  localStorage.removeItem('isAuthenticated');
                  localStorage.setItem('statusChangeLogout', 'true');
                  localStorage.setItem('statusChangeTimestamp', Date.now().toString());
                  window.location.href = '/login';
                }
              }
            }
          } catch (localError) {
            console.error('Error checking localStorage user status:', localError);
          }
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

    // Also listen for storage changes (when admin updates user status)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'teamUsers' && user) {
        checkUserStatus();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Custom event for same-tab updates
    const handleUserStatusChange = () => {
      if (user) {
        checkUserStatus();
      }
    };
    window.addEventListener('userStatusChanged', handleUserStatusChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
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
        console.warn('Database authentication failed, trying localStorage fallback:', dbError);
      }

      // Fallback to localStorage if database fails
      if (typeof window !== 'undefined') {
        try {
          const saved = localStorage.getItem('teamUsers');
          let teamUsers: any[] = [];
          
          if (saved) {
            teamUsers = JSON.parse(saved);
          }
          
          // Fallback to initial users if localStorage is empty or doesn't have the user
          if (teamUsers.length === 0 || !teamUsers.some((tu: any) => tu.email === email)) {
            // Use initial default users
            const initialUsers = [
              { id: '1', name: 'Admin User', email: 'admin@evotech.ma', password: hashPassword('Admin1234'), role: 'admin', status: 'active' },
              { id: '2', name: 'Ahmed Manager', email: 'ahmed@evotech.ma', password: hashPassword('password123'), role: 'manager', status: 'active' },
              { id: '3', name: 'Sara Accountant', email: 'sara@evotech.ma', password: hashPassword('password123'), role: 'accountant', status: 'active' },
              { id: '4', name: 'Karim Staff', email: 'karim@evotech.ma', password: hashPassword('password123'), role: 'staff', status: 'inactive' },
            ];
            teamUsers = initialUsers;
            // Save initial users to localStorage
            localStorage.setItem('teamUsers', JSON.stringify(initialUsers));
          }
          
          // Special handling for admin password update
          let matchedUser = null;
          if (email === 'admin@evotech.ma') {
            const adminUser = teamUsers.find((tu: any) => tu.email === 'admin@evotech.ma' && tu.role === 'admin');
            const newAdminHash = hashPassword('Admin1234');
            
            // If input password matches new admin password (Admin1234), update and authenticate
            if (adminUser && hashedPassword === newAdminHash) {
              adminUser.password = newAdminHash;
              // Update in localStorage
              const updatedUsers = teamUsers.map((tu: any) => 
                tu.id === adminUser.id ? adminUser : tu
              );
              localStorage.setItem('teamUsers', JSON.stringify(updatedUsers));
              matchedUser = adminUser;
            } else if (adminUser && adminUser.password === hashedPassword) {
              // Password already matches stored hash
              matchedUser = adminUser;
            }
          }
          
          // If no match found yet, check normally
          if (!matchedUser) {
            matchedUser = teamUsers.find((tu: any) => 
              tu.email === email && 
              tu.password === hashedPassword &&
              tu.status === 'active'
            );
          }
          
          if (matchedUser) {
            const authenticatedUser: User = {
              id: matchedUser.id,
              name: matchedUser.name,
              email: matchedUser.email,
              role: matchedUser.role,
            };

            setUser(authenticatedUser);
            
            // Store in localStorage
            localStorage.setItem('auth_user', JSON.stringify(authenticatedUser));
            localStorage.setItem('isAuthenticated', 'true');
            
            return true;
          }
        } catch (error) {
          console.error('Error reading team users:', error);
        }
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
