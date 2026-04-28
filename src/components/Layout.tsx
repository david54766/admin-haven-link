import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Award,
  BookOpen,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  User,
  Users,
  Brain,
  BarChart3,
  GraduationCap,
  ClipboardCheck,
  DollarSign,
  CalendarDays,
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import defaultLogo from '@/assets/logo.png';
import { useBranding } from '@/hooks/useBranding';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { profile, isAdmin, isDirector, isSuperAdmin, isPlatformAdmin, actingTenantId, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { branding } = useBranding();
  
  const logo = branding.logo_url || defaultLogo;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const staffNavItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/training', label: 'Training', icon: GraduationCap },
    { href: '/checklists', label: 'Checklists', icon: ClipboardCheck },
    { href: '/documents', label: 'Documents', icon: FileText },
    { href: '/certificates', label: 'Certificates', icon: Award },
    { href: '/reflections', label: 'Self Reflection', icon: Brain },
    { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  ];

  const adminNavItems = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/content', label: 'Content', icon: BookOpen },
    { href: '/admin/checklists', label: 'Checklists', icon: ClipboardCheck },
    { href: '/admin/certificates', label: 'Certificates & Hours', icon: Award },
    { href: '/admin/documents', label: 'Documents', icon: FileText },
    { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
    { href: '/admin/expenses', label: 'Expenses', icon: DollarSign },
    { href: '/admin/calendar', label: 'Calendar', icon: CalendarDays },
    ...((!isPlatformAdmin || actingTenantId) ? [{ href: '/admin/settings', label: 'Settings', icon: Settings }] : []),
  ];

  const isOnAdminRoute = location.pathname.startsWith('/admin');
  
  // Show admin nav when on admin routes, staff nav otherwise
  // Admins can switch between views via the user menu
  const navItems = isOnAdminRoute && isAdmin ? adminNavItems : staffNavItems;

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.href || 
          (item.href !== '/dashboard' && item.href !== '/admin' && location.pathname.startsWith(item.href));
        
        return (
          <Link
            key={item.href}
            to={item.href}
            onClick={onClick}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
              isActive
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container flex h-16 items-center">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="mr-2 md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-4">
              <img src={logo} alt="Little Hands" className="h-12 w-auto mb-6" />
              <nav className="flex flex-col gap-1 pt-4">
                <NavLinks onClick={() => setMobileOpen(false)} />
              </nav>
            </SheetContent>
          </Sheet>

          <Link to="/dashboard" className="mr-6 flex items-center space-x-3">
            <img src={logo} alt={branding.business_name} className="h-10 w-auto" />
            <span className="hidden font-bold text-foreground lg:inline-block">{branding.business_name}</span>
          </Link>

          <nav className="hidden flex-1 items-center gap-1 md:flex">
            <NavLinks />
          </nav>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-2 ring-primary/20 hover:ring-primary/40">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-gradient-to-br from-brand-red to-brand-purple text-white font-semibold">
                      {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex flex-col space-y-1 p-2">
                  <p className="text-sm font-medium leading-none">{profile?.full_name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{profile?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link 
                        to={isOnAdminRoute ? "/dashboard" : "/admin"} 
                        state={isOnAdminRoute ? { fromToggle: true } : undefined}
                        className="flex items-center"
                      >
                        {isOnAdminRoute ? (
                          <>
                            <GraduationCap className="mr-2 h-4 w-4" />
                            Staff View
                          </>
                        ) : (
                          <>
                            <Settings className="mr-2 h-4 w-4" />
                            Admin View
                          </>
                        )}
                      </Link>
                    </DropdownMenuItem>
                    {!isPlatformAdmin && (
                      <DropdownMenuItem asChild>
                        <Link to="/admin/settings" className="flex items-center">
                          <Settings className="mr-2 h-4 w-4" />
                          Settings
                        </Link>
                      </DropdownMenuItem>
                    )}
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6 overflow-x-hidden">{children}</main>
    </div>
  );
}
