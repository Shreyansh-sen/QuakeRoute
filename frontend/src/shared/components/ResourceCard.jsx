import { motion } from 'framer-motion';
import { MapPin, Package, Users, Clock, ArrowRight, Truck } from 'lucide-react';

const ResourceCard = ({
  resource,
  isSelected = false,
  onSelect,
  allocation = {},
  onAllocationChange,
  showAllocationInputs = false,
}) => {
  const { resourceId, name, type, distance, inventoryAvailable, personnelAvailable, estimatedArrival } = resource;

  const typeColors = {
    medical: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
    food: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
    shelter: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
    water: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
    equipment: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
  };

  const colors = typeColors[type] || typeColors.equipment;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className={`glass-card-hover cursor-pointer transition-all duration-300 ${
        isSelected ? 'border-primary-500 shadow-emergency' : ''
      }`}
      onClick={() => onSelect?.(resourceId)}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${colors.bg}`}>
              <Package className={`w-5 h-5 ${colors.text}`} />
            </div>
            <div>
              <h3 className="font-semibold text-white">{name}</h3>
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${colors.bg} ${colors.text}`}>
                {type?.charAt(0).toUpperCase() + type?.slice(1)}
              </span>
            </div>
          </div>
          
          {isSelected && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center"
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </motion.div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-dark-400" />
            <span className="text-dark-300">{distance}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-dark-400" />
            <span className="text-dark-300">{estimatedArrival}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Package className="w-4 h-4 text-dark-400" />
            <span className="text-dark-300">{inventoryAvailable} units</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-dark-400" />
            <span className="text-dark-300">{personnelAvailable} personnel</span>
          </div>
        </div>

        {/* Allocation inputs */}
        {showAllocationInputs && isSelected && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-dark-700 pt-4 mt-4 space-y-4"
          >
            <div>
              <label className="label-text flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Number of Assets
              </label>
              <input
                type="number"
                min="0"
                max={inventoryAvailable}
                value={allocation.assets || ''}
                onChange={(e) => onAllocationChange?.(resourceId, 'assets', parseInt(e.target.value) || 0)}
                placeholder={`Max: ${inventoryAvailable}`}
                className="input-field"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            
            <div>
              <label className="label-text flex items-center gap-2">
                <Users className="w-4 h-4" />
                Number of Human Resources
              </label>
              <input
                type="number"
                min="0"
                max={personnelAvailable}
                value={allocation.humans || ''}
                onChange={(e) => onAllocationChange?.(resourceId, 'humans', parseInt(e.target.value) || 0)}
                placeholder={`Max: ${personnelAvailable}`}
                className="input-field"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </motion.div>
        )}

        {/* Action hint */}
        {!isSelected && (
          <div className="flex items-center justify-end gap-2 text-primary-400 text-sm mt-2">
            <span>Select resource</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ResourceCard;
