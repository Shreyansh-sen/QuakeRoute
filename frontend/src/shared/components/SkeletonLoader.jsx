import { motion } from 'framer-motion';

const SkeletonLoader = ({ type = 'card', count = 1, className = '' }) => {
  const shimmer = {
    initial: { x: '-100%' },
    animate: { x: '100%' },
    transition: { repeat: Infinity, duration: 1.5, ease: 'linear' },
  };

  const SkeletonCard = () => (
    <div className={`glass-card p-6 overflow-hidden ${className}`}>
      <div className="relative">
        {/* Shimmer effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-dark-600/20 to-transparent"
          {...shimmer}
        />
        
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 bg-dark-700 rounded-xl animate-pulse" />
          <div className="w-16 h-4 bg-dark-700 rounded animate-pulse" />
        </div>
        
        <div className="space-y-3">
          <div className="w-24 h-8 bg-dark-700 rounded animate-pulse" />
          <div className="w-32 h-4 bg-dark-700 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );

  const SkeletonTable = () => (
    <div className={`glass-card overflow-hidden ${className}`}>
      <div className="relative">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-dark-600/20 to-transparent"
          {...shimmer}
        />
        
        {/* Header */}
        <div className="p-4 border-b border-dark-700 flex gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex-1 h-4 bg-dark-700 rounded animate-pulse" />
          ))}
        </div>
        
        {/* Rows */}
        {[1, 2, 3, 4, 5].map((row) => (
          <div key={row} className="p-4 border-b border-dark-700/50 flex gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex-1 h-4 bg-dark-700/50 rounded animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );

  const SkeletonForm = () => (
    <div className={`glass-card p-6 overflow-hidden ${className}`}>
      <div className="relative">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-dark-600/20 to-transparent"
          {...shimmer}
        />
        
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="w-24 h-4 bg-dark-700 rounded animate-pulse" />
              <div className="w-full h-12 bg-dark-700/50 rounded-xl animate-pulse" />
            </div>
          ))}
          <div className="w-32 h-12 bg-dark-700 rounded-xl animate-pulse mt-4" />
        </div>
      </div>
    </div>
  );

  const SkeletonChart = () => (
    <div className={`glass-card p-6 overflow-hidden ${className}`}>
      <div className="relative">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-dark-600/20 to-transparent"
          {...shimmer}
        />
        
        <div className="w-32 h-6 bg-dark-700 rounded animate-pulse mb-4" />
        <div className="h-64 bg-dark-700/30 rounded-xl animate-pulse flex items-end justify-around gap-2 p-4">
          {[60, 80, 45, 90, 70, 55, 85].map((height, i) => (
            <div
              key={i}
              className="flex-1 bg-dark-600/50 rounded-t animate-pulse"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );

  const SkeletonMap = () => (
    <div className={`glass-card overflow-hidden ${className}`}>
      <div className="relative h-96">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-dark-600/20 to-transparent z-10"
          {...shimmer}
        />
        <div className="absolute inset-0 bg-dark-800 animate-pulse" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto bg-dark-700 rounded-full animate-pulse mb-4" />
            <div className="w-32 h-4 mx-auto bg-dark-700 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );

  const SkeletonText = () => (
    <div className={`space-y-2 ${className}`}>
      <div className="h-4 bg-dark-700 rounded animate-pulse w-full" />
      <div className="h-4 bg-dark-700 rounded animate-pulse w-3/4" />
      <div className="h-4 bg-dark-700 rounded animate-pulse w-5/6" />
    </div>
  );

  const skeletonTypes = {
    card: SkeletonCard,
    table: SkeletonTable,
    form: SkeletonForm,
    chart: SkeletonChart,
    map: SkeletonMap,
    text: SkeletonText,
  };

  const SkeletonComponent = skeletonTypes[type] || SkeletonCard;

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonComponent key={i} />
      ))}
    </>
  );
};

export default SkeletonLoader;
