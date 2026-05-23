import { motion } from 'framer-motion';
import { Check, Clock, Loader2 } from 'lucide-react';

const StatusTimeline = ({ stages = [], currentStage = 1, progress = 0 }) => {
  return (
    <div className="relative">
      {/* Progress line background */}
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-dark-700" />
      
      {/* Animated progress line */}
      <motion.div
        className="absolute left-6 top-0 w-0.5 bg-gradient-to-b from-primary-500 to-orange-500"
        initial={{ height: 0 }}
        animate={{ height: `${(currentStage / stages.length) * 100}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />

      <div className="space-y-6">
        {stages.map((stage, index) => {
          const stageNumber = index + 1;
          const isCompleted = stageNumber < currentStage;
          const isCurrent = stageNumber === currentStage;
          const isPending = stageNumber > currentStage;

          return (
            <motion.div
              key={stage.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative flex items-start gap-4"
            >
              {/* Status indicator */}
              <div className="relative z-10">
                {isCompleted && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-12 h-12 bg-green-500/20 border-2 border-green-500 rounded-full flex items-center justify-center"
                  >
                    <Check className="w-5 h-5 text-green-500" />
                  </motion.div>
                )}
                
                {isCurrent && (
                  <motion.div
                    className="relative w-12 h-12"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                  >
                    {/* Pulsing ring */}
                    <motion.div
                      className="absolute inset-0 bg-primary-500/20 rounded-full"
                      animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    
                    {/* Main circle */}
                    <div className="absolute inset-0 bg-gradient-emergency rounded-full flex items-center justify-center shadow-emergency">
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    </div>
                  </motion.div>
                )}
                
                {isPending && (
                  <div className="w-12 h-12 bg-dark-700 border-2 border-dark-600 rounded-full flex items-center justify-center">
                    <Clock className="w-5 h-5 text-dark-500" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pt-2">
                <motion.div
                  className={`glass-card p-4 ${
                    isCurrent ? 'border-primary-500/50 shadow-emergency' : ''
                  }`}
                  animate={isCurrent ? { scale: [1, 1.01, 1] } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3
                      className={`font-semibold ${
                        isCompleted
                          ? 'text-green-400'
                          : isCurrent
                          ? 'text-white'
                          : 'text-dark-400'
                      }`}
                    >
                      {stage.label}
                    </h3>
                    
                    {isCompleted && (
                      <span className="badge-success text-xs">Completed</span>
                    )}
                    {isCurrent && (
                      <span className="badge-warning text-xs">In Progress</span>
                    )}
                    {isPending && (
                      <span className="badge-info text-xs">Pending</span>
                    )}
                  </div>
                  
                  <p
                    className={`text-sm ${
                      isPending ? 'text-dark-500' : 'text-dark-300'
                    }`}
                  >
                    {stage.description}
                  </p>

                  {/* Progress bar for current stage */}
                  {isCurrent && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-dark-400 mb-1">
                        <span>Progress</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-emergency"
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    </div>
                  )}
                </motion.div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default StatusTimeline;
