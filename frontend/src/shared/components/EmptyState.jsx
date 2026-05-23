import { motion } from 'framer-motion';
import { FileX, RefreshCw, Search, AlertTriangle, Inbox } from 'lucide-react';

const EmptyState = ({
  type = 'default',
  title,
  description,
  action,
  actionLabel,
  icon: CustomIcon,
}) => {
  const configs = {
    default: {
      icon: Inbox,
      title: 'No data available',
      description: 'There is no data to display at the moment.',
    },
    search: {
      icon: Search,
      title: 'No results found',
      description: 'Try adjusting your search or filter criteria.',
    },
    error: {
      icon: AlertTriangle,
      title: 'Something went wrong',
      description: 'An error occurred while loading the data.',
    },
    empty: {
      icon: FileX,
      title: 'No items yet',
      description: 'Start by adding your first item.',
    },
  };

  const config = configs[type] || configs.default;
  const Icon = CustomIcon || config.icon;
  const displayTitle = title || config.title;
  const displayDescription = description || config.description;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
        className="relative mb-6"
      >
        {/* Background glow */}
        <div className="absolute inset-0 bg-dark-700/50 rounded-full blur-xl scale-150" />
        
        {/* Icon container */}
        <div className="relative w-20 h-20 bg-dark-800 border border-dark-700 rounded-full flex items-center justify-center">
          <Icon className="w-10 h-10 text-dark-400" />
        </div>
        
        {/* Animated rings */}
        <motion.div
          className="absolute inset-0 border-2 border-dark-600 rounded-full"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.div>

      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-xl font-semibold text-white mb-2 text-center"
      >
        {displayTitle}
      </motion.h3>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-dark-400 text-center max-w-md mb-6"
      >
        {displayDescription}
      </motion.p>

      {action && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={action}
          className="btn-primary flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          {actionLabel || 'Try Again'}
        </motion.button>
      )}
    </motion.div>
  );
};

export default EmptyState;
