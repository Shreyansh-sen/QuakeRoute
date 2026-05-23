import { motion, AnimatePresence } from 'framer-motion';
import { X, Filter, ChevronDown } from 'lucide-react';
import { useState } from 'react';

const FilterPanel = ({
  isOpen,
  onClose,
  filters = [],
  values = {},
  onChange,
  onClear,
  onApply,
}) => {
  const [localValues, setLocalValues] = useState(values);

  const handleChange = (key, value) => {
    const newValues = { ...localValues, [key]: value };
    setLocalValues(newValues);
    onChange?.(key, value);
  };

  const handleClear = () => {
    const cleared = {};
    filters.forEach((filter) => {
      cleared[filter.key] = filter.type === 'checkbox' ? false : '';
    });
    setLocalValues(cleared);
    onClear?.();
  };

  const handleApply = () => {
    onApply?.(localValues);
    onClose?.();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-dark-950/50 backdrop-blur-sm z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md z-50 glass-card border-l border-y-0 border-r-0 rounded-none"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-dark-700">
              <div className="flex items-center gap-3">
                <Filter className="w-5 h-5 text-primary-400" />
                <h2 className="text-lg font-semibold text-white">Filters</h2>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Filter Options */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {filters.map((filter) => (
                <div key={filter.key} className="space-y-3">
                  <label className="label-text">{filter.label}</label>

                  {filter.type === 'select' && (
                    <div className="relative">
                      <select
                        value={localValues[filter.key] || ''}
                        onChange={(e) => handleChange(filter.key, e.target.value)}
                        className="select-field pr-10"
                      >
                        <option value="">All</option>
                        {filter.options?.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400 pointer-events-none" />
                    </div>
                  )}

                  {filter.type === 'checkbox' && (
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={localValues[filter.key] || false}
                          onChange={(e) => handleChange(filter.key, e.target.checked)}
                          className="peer sr-only"
                        />
                        <div className="w-5 h-5 border-2 border-dark-500 rounded peer-checked:bg-primary-500 peer-checked:border-primary-500 transition-colors" />
                        <svg
                          className="absolute top-0.5 left-0.5 w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                      <span className="text-dark-300 group-hover:text-white transition-colors">
                        {filter.checkboxLabel || filter.label}
                      </span>
                    </label>
                  )}

                  {filter.type === 'range' && (
                    <div className="space-y-2">
                      <input
                        type="range"
                        min={filter.min || 0}
                        max={filter.max || 100}
                        value={localValues[filter.key] || filter.min || 0}
                        onChange={(e) => handleChange(filter.key, parseInt(e.target.value))}
                        className="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
                      />
                      <div className="flex justify-between text-xs text-dark-400">
                        <span>{filter.min || 0}</span>
                        <span className="text-primary-400 font-medium">
                          {localValues[filter.key] || filter.min || 0}
                        </span>
                        <span>{filter.max || 100}</span>
                      </div>
                    </div>
                  )}

                  {filter.type === 'chips' && (
                    <div className="flex flex-wrap gap-2">
                      {filter.options?.map((option) => {
                        const isSelected = localValues[filter.key] === option.value;
                        return (
                          <motion.button
                            key={option.value}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() =>
                              handleChange(filter.key, isSelected ? '' : option.value)
                            }
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              isSelected
                                ? 'bg-primary-500 text-white'
                                : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                            }`}
                          >
                            {option.label}
                          </motion.button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-dark-700 flex gap-3">
              <button onClick={handleClear} className="btn-secondary flex-1">
                Clear All
              </button>
              <button onClick={handleApply} className="btn-primary flex-1">
                Apply Filters
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default FilterPanel;
