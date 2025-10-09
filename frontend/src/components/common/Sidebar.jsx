import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Home, 
  Zap, 
  BarChart3, 
  User, 
  Settings,
  Shield
} from 'lucide-react';
import { clsx } from 'clsx';

const Sidebar = () => {
  const { user } = useAuth();

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: Home,
      description: 'Overview and quick stats'
    },
    {
      name: 'Profile',
      href: '/profile',
      icon: User,
      description: 'Account settings'
    }
  ];

  // Add user-specific links (non-admin users only)
  if (user?.role !== 'admin') {
    navigationItems.splice(1, 0, {
      name: 'Appliances',
      href: '/appliances',
      icon: Zap,
      description: 'Manage your appliances'
    });
  }

  // Add admin-only links
  if (user?.role === 'admin') {
    navigationItems.splice(1, 0, {
      name: 'Analytics',
      href: '/analytics',
      icon: BarChart3,
      description: 'System analytics'
    });
    
    navigationItems.push({
      name: 'Admin Panel',
      href: '/admin',
      icon: Shield,
      description: 'System administration'
    });
  }

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-64 bg-white/80 backdrop-blur-lg border-r border-gray-200 shadow-sm">
      <div className="flex flex-col h-full">
        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group',
                    isActive
                      ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-500'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      size={20}
                      className={clsx(
                        'mr-3 transition-colors',
                        isActive ? 'text-primary-600' : 'text-gray-500 group-hover:text-gray-700'
                      )}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {item.description}
                      </div>
                    </div>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Info Card */}
        <div className="p-4 border-t border-gray-200">
          <div className="bg-gradient-to-r from-primary-50 to-purple-50 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center">
                <User size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.profile?.firstName} {user?.profile?.lastName}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.profile?.address?.city}, {user?.profile?.address?.state}
                </p>
              </div>
            </div>
            
            {user?.role === 'admin' && (
              <div className="mt-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  <Shield size={12} className="mr-1" />
                  Administrator
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;