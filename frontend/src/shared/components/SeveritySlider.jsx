import { motion } from 'framer-motion';
import { getSeverityColor } from '@shared/constants';

const SeveritySlider = ({ value = 5, onChange, min = 1, max = 10 }) => {
  const color = getSeverityColor(value);
  const percentage = ((value - min) / (max - min)) * 100;

  const getSeverityLabel = (val) => {
    if (val <= 3) return 'Low';
    if (val <= 7) return 'Medium';
    return 'High';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-dark-400">Severity Level</span>
        <motion.div
          key={value}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex items-center gap-2"
        >
          <span
            className="text-2xl font-bold"
            style={{ color }}
          >
            {value}
          </span>
          <span
            className="text-sm font-medium px-2 py-0.5 rounded"
            style={{ backgroundColor: `${color}20`, color }}
          >
            {getSeverityLabel(value)}
          </span>
        </motion.div>
      </div>

      <div className="relative">
        {/* Track background */}
        <div className="h-3 bg-dark-700 rounded-full overflow-hidden">
          {/* Gradient track */}
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-200"
            style={{
              width: `${percentage}%`,
              background: `linear-gradient(90deg, #22c55e 0%, #f97316 50%, #ef4444 100%)`,
            }}
          />
        </div>

        {/* Range input */}
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange?.(parseInt(e.target.value))}
          className="absolute inset-0 w-full h-3 opacity-0 cursor-pointer"
        />

        {/* Custom thumb */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-4 border-white shadow-lg cursor-pointer pointer-events-none"
          style={{
            left: `calc(${percentage}% - 12px)`,
            backgroundColor: color,
            boxShadow: `0 0 20px ${color}80`,
          }}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Scale markers */}
      <div className="flex justify-between px-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
          <motion.button
            key={num}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onChange?.(num)}
            className={`w-6 h-6 text-xs font-medium rounded transition-colors ${
              num === value
                ? 'text-white'
                : num <= 3
                ? 'text-green-400 hover:bg-green-500/20'
                : num <= 7
                ? 'text-orange-400 hover:bg-orange-500/20'
                : 'text-red-400 hover:bg-red-500/20'
            }`}
          >
            {num}
          </motion.button>
        ))}
      </div>

      {/* Severity descriptions */}
      <div className="grid grid-cols-3 gap-2 mt-4">
        <div className="text-center p-2 rounded-lg bg-green-500/10 border border-green-500/20">
          <div className="text-green-400 text-sm font-medium">Low (1-3)</div>
          <div className="text-dark-400 text-xs">Minor impact</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
          <div className="text-orange-400 text-sm font-medium">Medium (4-7)</div>
          <div className="text-dark-400 text-xs">Moderate impact</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-red-500/10 border border-red-500/20">
          <div className="text-red-400 text-sm font-medium">High (8-10)</div>
          <div className="text-dark-400 text-xs">Severe impact</div>
        </div>
      </div>
    </div>
  );
};

export default SeveritySlider;
