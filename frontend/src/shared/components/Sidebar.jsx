import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  GitBranch,
  BarChart3,
  AlertTriangle,
  Map,
  Radio,
  Settings,
  HelpCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  Crown,
  Plus,
} from 'lucide-react';
import { useState } from 'react';

const iconMap = {
  LayoutDashboard,
  FileText,
  GitBranch,
  BarChart3,
  AlertTriangle,
  Map,
  Radio,
  Settings,
  HelpCircle,
  Plus,
};

const Sidebar = ({ links = [], isCollapsed = false, onToggle, portalType = 'admin' }) => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(isCollapsed);

  const handleToggle = () => {
    setCollapsed(!collapsed);
    onToggle?.(!collapsed);
  };

  const getIcon = (iconName) => {
    const Icon = iconMap[iconName] || AlertTriangle;
    return Icon;
  };

  // Purple theme for admin
  const theme = {
    gradient: 'bg-gradient-to-r from-purple-500 to-violet-600',
    shadow: 'shadow-lg shadow-purple-500/30',
    accent: 'text-purple-400',
    hoverAccent: 'group-hover:text-purple-400',
    activeBg: 'bg-gradient-to-r from-purple-500 to-violet-600',
    hoverBg: 'hover:bg-purple-700/30',
    border: 'border-purple-800/50',
    bgColor: 'bg-purple-950/80',
  };

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className={`fixed left-0 top-16 bottom-0 z-40 backdrop-blur-xl ${theme.bgColor} border-r ${theme.border} transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="flex flex-col h-full py-6">
        {/* Toggle button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleToggle}
          className={`absolute -right-3 top-8 w-6 h-6 ${theme.gradient} border border-purple-400/50 rounded-full flex items-center justify-center text-white hover:scale-110 transition-all`}
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronLeft className="w-3 h-3" />
          )}
        </motion.button>

        {/* Navigation links */}
        <nav className="flex-1 px-3 space-y-2">
          {links.map((link, index) => {
            const isActive = location.pathname === link.path;
            const Icon = getIcon(link.icon);

            return (
              <motion.div
                key={link.path}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  to={link.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                    isActive
                      ? `${theme.activeBg} text-white ${theme.shadow}`
                      : `text-slate-400 hover:text-white ${theme.hoverBg}`
                  }`}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : theme.hoverAccent}`} />
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="font-medium whitespace-nowrap"
                    >
                      {link.label}
                    </motion.span>
                  )}
                  {isActive && !collapsed && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="ml-auto w-2 h-2 bg-white rounded-full"
                    />
                  )}
                </Link>
              </motion.div>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className={`px-3 space-y-2 border-t ${theme.border} pt-4 mt-4`}>
          <Link
            to="#"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white ${theme.hoverBg} transition-all duration-200`}
          >
            <Settings className="w-5 h-5" />
            {!collapsed && <span className="font-medium">Settings</span>}
          </Link>
          <Link
            to="#"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white ${theme.hoverBg} transition-all duration-200`}
          >
            <HelpCircle className="w-5 h-5" />
            {!collapsed && <span className="font-medium">Help</span>}
          </Link>
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            {!collapsed && <span className="font-medium">Logout</span>}
          </button>
        </div>

        {/* User info */}
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`px-3 pt-4 border-t ${theme.border} mt-4`}
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <div className={`w-10 h-10 ${theme.gradient} rounded-full flex items-center justify-center ${theme.shadow}`}>
                <Crown className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">Admin User</p>
                <p className="text-xs text-purple-300 truncate">admin@quakeroute.com</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.aside>
  );
};

export default Sidebar;
