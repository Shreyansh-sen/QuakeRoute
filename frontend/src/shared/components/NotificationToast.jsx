import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useEffect, useState, createContext, useContext, useCallback } from 'react';

// Toast Context
const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Toast Provider
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { ...toast, id }]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const success = useCallback(
    (message, options = {}) => addToast({ type: 'success', message, ...options }),
    [addToast]
  );

  const error = useCallback(
    (message, options = {}) => addToast({ type: 'error', message, ...options }),
    [addToast]
  );

  const warning = useCallback(
    (message, options = {}) => addToast({ type: 'warning', message, ...options }),
    [addToast]
  );

  const info = useCallback(
    (message, options = {}) => addToast({ type: 'info', message, ...options }),
    [addToast]
  );

  return (
    <ToastContext.Provider value={{ success, error, warning, info, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

// Toast Container
const ToastContainer = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
};

// Single Toast
const Toast = ({ id, type, message, title, duration = 5000, onClose }) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        onClose();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [duration, onClose]);

  const configs = {
    success: {
      icon: CheckCircle,
      bg: 'bg-green-500/20',
      border: 'border-green-500/30',
      text: 'text-green-400',
      progress: 'bg-green-500',
    },
    error: {
      icon: XCircle,
      bg: 'bg-red-500/20',
      border: 'border-red-500/30',
      text: 'text-red-400',
      progress: 'bg-red-500',
    },
    warning: {
      icon: AlertTriangle,
      bg: 'bg-orange-500/20',
      border: 'border-orange-500/30',
      text: 'text-orange-400',
      progress: 'bg-orange-500',
    },
    info: {
      icon: Info,
      bg: 'bg-blue-500/20',
      border: 'border-blue-500/30',
      text: 'text-blue-400',
      progress: 'bg-blue-500',
    },
  };

  const config = configs[type] || configs.info;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={`pointer-events-auto min-w-[320px] max-w-md glass-card ${config.bg} border ${config.border} overflow-hidden`}
    >
      <div className="p-4 flex items-start gap-3">
        <Icon className={`w-5 h-5 ${config.text} flex-shrink-0 mt-0.5`} />
        
        <div className="flex-1 min-w-0">
          {title && <p className="font-semibold text-white mb-1">{title}</p>}
          <p className="text-sm text-dark-200">{message}</p>
        </div>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="p-1 text-dark-400 hover:text-white hover:bg-dark-700/50 rounded transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-dark-700/50">
        <motion.div
          className={`h-full ${config.progress}`}
          initial={{ width: '100%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.05 }}
        />
      </div>
    </motion.div>
  );
};

export default Toast;
