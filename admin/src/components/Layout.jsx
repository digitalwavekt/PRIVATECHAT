import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, UserCheck, Users, MessageSquare, ScrollText, LogOut, Shield } from 'lucide-react';

const nav = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard'       },
  { to: '/requests',  icon: UserCheck,       label: 'Signup Requests' },
  { to: '/users',     icon: Users,           label: 'Users'           },
  { to: '/messages',  icon: MessageSquare,   label: 'Messages'        },
  { to: '/logs',      icon: ScrollText,      label: 'Audit Logs'      },
];

export default function Layout() {
  const navigate = useNavigate();
  const handleLogout = () => { localStorage.removeItem('pc_admin_token'); navigate('/login'); };

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      {/* Sidebar */}
      <div className="flex flex-col w-60 bg-gray-900 border-r border-gray-800">
        <div className="px-5 py-5 border-b border-gray-800 flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">PrivaChat</p>
            <p className="text-xs text-gray-400">Admin Panel</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-purple-600/20 text-purple-400 border border-purple-600/30'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`
              }>
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-gray-800">
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-900/20 transition-colors font-medium">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 overflow-y-auto bg-gray-950">
        <div className="p-6 max-w-6xl mx-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
