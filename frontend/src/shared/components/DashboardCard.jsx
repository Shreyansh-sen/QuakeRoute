import { motion } from 'framer-motion';
import { useCountUp } from '@shared/hooks';
import { formatNumber } from '@shared/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

const DashboardCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  color = 'primary',
  animate = true,
  className = '',
  portalType = 'user', // 'user' or 'admin'
}) => {
  const animatedValue = useCountUp(typeof value === 'number' ? value : 0, 2000);
  const displayValue = animate && typeof value === 'number' ? animatedValue : value;

  const colorStyles = {
    // User portal colors (cyan/blue theme)
    primary: {
      bg: portalType === 'admin' ? 'bg-purple-500/20' : 'bg-cyan-500/20',
      text: portalType === 'admin' ? 'text-purple-400' : 'text-cyan-400',
      glow: portalType === 'admin' ? 'shadow-purple-500/30' : 'shadow-cyan-500/30',
      gradient: portalType === 'admin' ? 'from-purple-500/20 to-violet-600/10' : 'from-cyan-500/20 to-blue-600/10',
      accent: portalType === 'admin' ? 'bg-purple-500' : 'bg-cyan-500',
    },
    orange: {
      bg: 'bg-orange-500/20',
      text: 'text-orange-400',
      glow: 'shadow-orange-500/30',
      gradient: 'from-orange-500/20 to-orange-600/10',
      accent: 'bg-orange-500',
    },
    green: {
      bg: 'bg-emerald-500/20',
      text: 'text-emerald-400',
      glow: 'shadow-emerald-500/30',
      gradient: 'from-emerald-500/20 to-emerald-600/10',
      accent: 'bg-emerald-500',
    },
    blue: {
      bg: 'bg-blue-500/20',
      text: 'text-blue-400',
      glow: 'shadow-blue-500/30',
      gradient: 'from-blue-500/20 to-blue-600/10',
      accent: 'bg-blue-500',
    },
    purple: {
      bg: 'bg-purple-500/20',
      text: 'text-purple-400',
      glow: 'shadow-purple-500/30',
      gradient: 'from-purple-500/20 to-violet-600/10',
      accent: 'bg-purple-500',
    },
    cyan: {
      bg: 'bg-cyan-500/20',
      text: 'text-cyan-400',
      glow: 'shadow-cyan-500/30',
      gradient: 'from-cyan-500/20 to-blue-600/10',
      accent: 'bg-cyan-500',
    },
  };

  const styles = colorStyles[color] || colorStyles.primary;
  
  const cardBg = portalType === 'admin' 
    ? 'bg-purple-900/30 border-purple-800/50' 
    : 'bg-slate-900/50 border-cyan-800/30';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -5 }}
      transition={{ duration: 0.3 }}
      className={`backdrop-blur-xl ${cardBg} border rounded-2xl p-6 relative overflow-hidden group ${className}`}
    >
      {/* Background gradient effect */}
      <div className={`absolute inset-0 bg-gradient-to-br ${styles.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
      
      {/* Animated corner accent */}
      <motion.div
        className={`absolute top-0 right-0 w-24 h-24 ${styles.bg} rounded-full blur-2xl opacity-50`}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 3, repeat: Infinity }}
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-xl ${styles.bg}`}>
            {Icon && <Icon className={`w-6 h-6 ${styles.text}`} />}
          </div>
          
          {trend !== undefined && (
            <div className={`flex items-center gap-1 text-xs font-medium ${
              trend === 'up' ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {trend === 'up' ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>{trendValue}%</span>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <motion.h3
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-3xl font-bold text-white"
          >
            {typeof displayValue === 'number' ? formatNumber(displayValue) : displayValue}
          </motion.h3>
          <p className="text-sm font-medium text-slate-300">{title}</p>
          {subtitle && (
            <p className="text-xs text-slate-500">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Bottom accent line */}
      <motion.div
        className={`absolute bottom-0 left-0 h-1 ${styles.accent}`}
        initial={{ width: '0%' }}
        animate={{ width: '100%' }}
        transition={{ duration: 1, delay: 0.5 }}
      />
    </motion.div>
  );
};

export default DashboardCard;
