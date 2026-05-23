import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { 
  AlertTriangle, 
  Menu, 
  X, 
  Bell, 
  Search,
  Radio,
  Shield,
  Waves,
  Zap
} from 'lucide-react';
import { useState } from 'react';

const Navbar = ({ links = [], isAdmin = false, portalType = 'user' }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hasNotifications] = useState(true);
  const location = useLocation();

  // Theme configurations for different portals
  const themes = {
    user: {
      gradient: 'bg-gradient-to-r from-cyan-500 to-blue-600',
      shadow: 'shadow-lg shadow-cyan-500/30',
      accent: 'text-cyan-400',
      accentBg: 'bg-cyan-500/20',
      accentBorder: 'border-cyan-500/30',
      activeBg: 'bg-cyan-500/20',
      activeText: 'text-cyan-400',
      liveColor: 'text-cyan-400',
      liveBg: 'bg-cyan-500/20',
      liveBorder: 'border-cyan-500/30',
    },
    admin: {
      gradient: 'bg-gradient-to-r from-purple-500 to-violet-600',
      shadow: 'shadow-lg shadow-purple-500/30',
      accent: 'text-purple-400',
      accentBg: 'bg-purple-500/20',
      accentBorder: 'border-purple-500/30',
      activeBg: 'bg-purple-500/20',
      activeText: 'text-purple-400',
      liveColor: 'text-purple-400',
      liveBg: 'bg-purple-500/20',
      liveBorder: 'border-purple-500/30',
    },
  };

  const theme = themes[portalType] || themes.user;

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b ${
        isAdmin ? 'bg-purple-950/80 border-purple-800/50' : 'bg-slate-950/80 border-cyan-800/30'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to={isAdmin ? '/admin/dashboard' : '/'} className="flex items-center gap-3">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              className="relative"
            >
              <div className={`w-10 h-10 ${theme.gradient} rounded-xl flex items-center justify-center ${theme.shadow}`}>
                {isAdmin ? (
                  <Shield className="w-5 h-5 text-white" />
                ) : (
                  <Waves className="w-5 h-5 text-white" />
                )}
              </div>
              <motion.div
                className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${isAdmin ? 'bg-purple-400' : 'bg-cyan-400'}`}
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              />
            </motion.div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                QuakeRoute
                {isAdmin ? (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-gradient-to-r from-purple-500 to-violet-600 rounded-md">
                    ADMIN
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 rounded-md">
                    USER
                  </span>
                )}
              </h1>
              <p className={`text-xs ${isAdmin ? 'text-purple-300' : 'text-cyan-300'}`}>
                {isAdmin ? 'Command Center' : 'Disaster Response Platform'}
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? `${theme.activeBg} ${theme.activeText}`
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`p-2 text-slate-400 hover:text-white rounded-lg transition-colors ${
                isAdmin ? 'hover:bg-purple-700/30' : 'hover:bg-cyan-700/30'
              }`}
            >
              <Search className="w-5 h-5" />
            </motion.button>

            {/* Notifications */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`relative p-2 text-slate-400 hover:text-white rounded-lg transition-colors ${
                isAdmin ? 'hover:bg-purple-700/30' : 'hover:bg-cyan-700/30'
              }`}
            >
              <Bell className="w-5 h-5" />
              {hasNotifications && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`absolute top-1 right-1 w-2 h-2 rounded-full ${isAdmin ? 'bg-purple-400' : 'bg-cyan-400'}`}
                />
              )}
            </motion.button>

            {/* Live indicator */}
            <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border ${theme.liveBg} ${theme.liveBorder}`}>
              <Zap className={`w-3 h-3 ${theme.liveColor} animate-pulse`} />
              <span className={`text-xs font-medium ${theme.liveColor}`}>
                {isAdmin ? 'CONTROL' : 'LIVE'}
              </span>
            </div>

            {/* Mobile menu button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`md:hidden p-2 text-slate-400 hover:text-white rounded-lg transition-colors ${
                isAdmin ? 'hover:bg-purple-700/30' : 'hover:bg-cyan-700/30'
              }`}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </motion.button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`md:hidden border-t py-4 ${isAdmin ? 'border-purple-800/50' : 'border-cyan-800/30'}`}
          >
            <div className="flex flex-col gap-2">
              {links.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={`px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? `${theme.activeBg} ${theme.activeText}`
                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </motion.nav>
  );
};

export default Navbar;
