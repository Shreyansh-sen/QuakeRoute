import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PageHeader = ({
  title,
  subtitle,
  showBack = false,
  backPath,
  action,
  actionLabel,
  actionIcon: ActionIcon,
  children,
  className = '',
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backPath) {
      navigate(backPath);
    } else {
      navigate(-1);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mb-8 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          {showBack && (
            <motion.button
              whileHover={{ scale: 1.05, x: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleBack}
              className="p-2 text-dark-400 hover:text-white hover:bg-dark-700/50 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
          )}
          
          <div>
            <h1 className="section-title">{title}</h1>
            {subtitle && <p className="section-subtitle">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {children}
          
          {action && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={action}
              className="btn-primary flex items-center gap-2"
            >
              {ActionIcon && <ActionIcon className="w-4 h-4" />}
              {actionLabel}
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default PageHeader;
