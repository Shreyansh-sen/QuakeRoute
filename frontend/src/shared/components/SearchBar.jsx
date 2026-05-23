import { motion } from 'framer-motion';
import { Search, X, Filter } from 'lucide-react';
import { useState } from 'react';

const SearchBar = ({
  value = '',
  onChange,
  placeholder = 'Search...',
  onClear,
  showFilter = false,
  onFilterClick,
  className = '',
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative ${className}`}
    >
      <div
        className={`relative flex items-center gap-2 bg-dark-800/50 border rounded-xl transition-all duration-200 ${
          isFocused
            ? 'border-primary-500 ring-2 ring-primary-500/20'
            : 'border-dark-600 hover:border-dark-500'
        }`}
      >
        <Search className="w-5 h-5 text-dark-400 ml-4" />
        
        <input
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="flex-1 py-3 pr-4 bg-transparent text-white placeholder-dark-400 focus:outline-none"
        />

        {value && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={onClear}
            className="p-1.5 mr-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </motion.button>
        )}

        {showFilter && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onFilterClick}
            className="p-2 mr-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
          >
            <Filter className="w-5 h-5" />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};

export default SearchBar;
