import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useWarehouse, Warehouse } from '@/contexts/WarehouseContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { toast } from '@/hooks/use-toast';

interface TeamUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'accountant' | 'staff';
  status: 'active' | 'inactive';
}
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Bell, Search, User, MapPin, Check, Building2, Settings, LogOut, UserCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './LanguageSwitcher';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';

export const TopHeader = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { activeWarehouse, setActiveWarehouse, warehouseInfo, isAllWarehouses, warehouses } = useWarehouse();
  const { user: authUser, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const [teamUser, setTeamUser] = useState<TeamUser | null>(null);

  // Load team user from localStorage (Users & Roles)
  useEffect(() => {
    if (typeof window !== 'undefined' && authUser) {
      try {
        const saved = localStorage.getItem('teamUsers');
        if (saved) {
          const teamUsers: TeamUser[] = JSON.parse(saved);
          // Match by email first, then by ID
          const matchedUser = teamUsers.find(
            tu => tu.email === authUser.email || tu.id === authUser.id
          );
          if (matchedUser) {
            setTeamUser(matchedUser);
          }
        }
      } catch (error) {
        console.error('Error loading team user from localStorage:', error);
      }
    }
  }, [authUser]);

  // Use team user data if available, otherwise fall back to auth user
  const displayUser = teamUser || authUser;
  const displayName = displayUser?.name || 'User';
  const displayEmail = displayUser?.email || authUser?.email || '';
  const displayRole = displayUser?.role || authUser?.role || '';

  const handleLogout = () => {
    logout();
    toast({
      title: t('auth.loggedOut'),
      description: t('auth.loggedOutDescription'),
    });
    navigate('/login', { replace: true });
  };

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
      {/* Search */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('common.search')}
            className="pl-10 bg-section border-border"
          />
        </div>
      </div>

      {/* Language Switcher & Warehouse Switcher */}
      <div className="flex items-center gap-4">
        <LanguageSwitcher />
          <Select value={activeWarehouse} onValueChange={(value) => setActiveWarehouse(value as Warehouse)}>
          <SelectTrigger className="w-[200px] border-border bg-section hover:bg-section/80 focus:ring-2 focus:ring-primary/20">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
              <SelectValue placeholder={t('common.selectWarehouse')} className="font-medium text-foreground">
                {isAllWarehouses ? t('common.allWarehouses') : warehouseInfo?.city}
              </SelectValue>
            </div>
            </SelectTrigger>
          <SelectContent className="w-[280px] p-1">
            <div className="px-3 py-2 mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
              Select Warehouse
            </div>
            
            {/* All Warehouses Option */}
            <SelectItem 
              value="all"
              className={cn(
                "cursor-pointer rounded-md px-3 py-2.5 my-0.5",
                isAllWarehouses && "bg-primary/5",
                "[&>span:first-child]:hidden"
              )}
            >
              <div className="flex items-center gap-3 w-full">
                <div className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                  isAllWarehouses ? "bg-primary/10" : "bg-muted/50"
                )}>
                  <Building2 className={cn(
                    "w-4 h-4 transition-colors",
                    isAllWarehouses ? "text-primary" : "text-muted-foreground"
                  )} />
                </div>
                <div className="flex items-center justify-between flex-1 min-w-0 gap-2">
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className={cn(
                      "font-semibold text-sm leading-tight truncate",
                      isAllWarehouses ? "text-primary" : "text-foreground"
                    )}>
                      All Warehouses
                    </span>
                    <span className="text-xs text-muted-foreground truncate leading-tight mt-0.5">
                      View all locations
                    </span>
                  </div>
                  {isAllWarehouses && (
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  )}
                </div>
              </div>
            </SelectItem>

            {/* Individual Warehouses */}
            {warehouses.map((warehouse) => {
              const isActive = warehouse.id === activeWarehouse;
              return (
                <SelectItem 
                  key={warehouse.id} 
                  value={warehouse.id}
                  className={cn(
                    "cursor-pointer rounded-md px-3 py-2.5 my-0.5",
                    isActive && "bg-primary/5",
                    "[&>span:first-child]:hidden"
                  )}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                      isActive ? "bg-primary/10" : "bg-muted/50"
                    )}>
                      <Building2 className={cn(
                        "w-4 h-4 transition-colors",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <div className="flex items-center justify-between flex-1 min-w-0 gap-2">
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className={cn(
                          "font-semibold text-sm leading-tight truncate",
                          isActive ? "text-primary" : "text-foreground"
                        )}>
                          {warehouse.city}
                        </span>
                        <span className="text-xs text-muted-foreground truncate leading-tight mt-0.5">
                          {warehouse.name}
                        </span>
                      </div>
                      {isActive && (
                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      )}
                    </div>
                  </div>
                </SelectItem>
              );
            })}
            </SelectContent>
          </Select>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <NotificationDropdown>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-muted-foreground hover:text-foreground relative"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center text-xs p-0"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </Button>
          </NotificationDropdown>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground relative">
                <Avatar className="w-8 h-8 border-2 border-border hover:border-primary/50 transition-colors">
                  <AvatarImage src={undefined} alt={displayName} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <User className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{displayName}</p>
                  <p className="text-xs leading-none text-muted-foreground capitalize">{displayRole}</p>
                  {displayEmail && (
                    <p className="text-xs leading-none text-muted-foreground">{displayEmail}</p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/settings')}>
                <UserCircle className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="cursor-pointer text-destructive focus:text-destructive" 
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
