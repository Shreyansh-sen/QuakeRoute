import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Radio,
  CheckCircle,
  Clock,
  AlertTriangle,
  Map,
  RefreshCw,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { PageHeader, StatusTimeline, useToast } from '@shared/components';
import { ALLOCATION_STAGES, fadeInUp, staggerContainer } from '@shared/constants';
import { useDisasterStore, useAllocationStore } from '@user/store';
import { disasterService } from '@api';
import { useInterval } from '@shared/hooks';

const AllocationStatus = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const { requestId, disasterNodes } = useDisasterStore();
  const {
    currentRequestId,
    currentStage,
    currentStatus,
    progress,
    isComplete,
    setCurrentRequest,
    updateAllocationStatus,
    isPolling,
    setPolling,
  } = useAllocationStore();

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Use request ID from disaster store if not set in allocation store
  useEffect(() => {
    if (requestId && !currentRequestId) {
      setCurrentRequest(requestId);
    }
  }, [requestId, currentRequestId, setCurrentRequest]);

  // Poll for status updates
  const fetchStatus = async () => {
    const id = currentRequestId || requestId;
    if (!id) return;

    try {
      setPolling(true);
      const response = await disasterService.getAllocationStatus(id);
      updateAllocationStatus(response);

      if (response.isComplete && !isComplete) {
        toast.success('Resource allocation complete! Deployment ready.');
      }
    } catch (error) {
      console.error('Failed to fetch status:', error);
    } finally {
      setPolling(false);
      setIsRefreshing(false);
    }
  };

  // Auto-poll every 3 seconds if not complete
  useInterval(
    () => {
      if (!isComplete) {
        fetchStatus();
      }
    },
    isComplete ? null : 3000
  );

  // Initial fetch
  useEffect(() => {
    fetchStatus();
  }, [currentRequestId]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchStatus();
  };

  // No request ID - show prompt to create one
  if (!currentRequestId && !requestId) {
    return (
      <div className="page-container">
        <PageHeader
          title="Allocation Status"
          subtitle="Track your disaster request progress"
          showBack
          backPath="/"
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-12 text-center max-w-lg mx-auto"
        >
          <div className="w-20 h-20 bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-dark-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">No Active Request</h2>
          <p className="text-dark-400 mb-6">
            You haven't submitted any disaster reports yet. Report a disaster to start tracking its status.
          </p>
          <Link to="/report">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn-primary flex items-center gap-2 mx-auto"
            >
              <AlertTriangle className="w-5 h-5" />
              Report Disaster
            </motion.button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Allocation Status"
        subtitle={`Request ID: ${currentRequestId || requestId}`}
        showBack
        backPath="/"
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </motion.button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Timeline */}
        <div className="lg:col-span-2">
          {/* Status Header Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 mb-6"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  {isComplete ? (
                    <div className="p-2 bg-green-500/20 rounded-lg">
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    </div>
                  ) : (
                    <div className="p-2 bg-primary-500/20 rounded-lg">
                      <Radio className="w-6 h-6 text-primary-500 animate-pulse" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-semibold text-white">{currentStatus}</h2>
                    <p className="text-dark-400 text-sm">
                      Stage {currentStage} of {ALLOCATION_STAGES.length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-3xl font-bold text-white">{progress}%</div>
                <p className="text-dark-400 text-sm">
                  {isComplete ? 'Complete' : 'In Progress'}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-6">
              <div className="h-3 bg-dark-700 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full ${
                    isComplete
                      ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                      : 'bg-gradient-emergency'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            {/* Quantum optimization indicator */}
            {currentStage === 5 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-blue-400 animate-pulse" />
                  <div>
                    <p className="text-blue-400 font-medium">Quantum Optimization Active</p>
                    <p className="text-dark-400 text-sm">
                      Running advanced algorithms to find optimal resource allocation
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-6">Allocation Progress</h3>
            <StatusTimeline
              stages={ALLOCATION_STAGES}
              currentStage={currentStage}
              progress={progress}
            />
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Request Details */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card p-6"
          >
            <h3 className="font-semibold text-white mb-4">Request Details</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-dark-700">
                <span className="text-dark-400">Request ID</span>
                <span className="text-white font-mono text-sm">{currentRequestId || requestId}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-dark-700">
                <span className="text-dark-400">Locations</span>
                <span className="text-white">{disasterNodes?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-dark-700">
                <span className="text-dark-400">Status</span>
                <span className={`${isComplete ? 'badge-success' : 'badge-warning'}`}>
                  {isComplete ? 'Complete' : 'Processing'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-dark-400">Live Updates</span>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isPolling ? 'bg-green-500 animate-pulse' : 'bg-dark-500'}`} />
                  <span className="text-dark-300 text-sm">{isPolling ? 'Active' : 'Idle'}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-6"
          >
            <h3 className="font-semibold text-white mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link to="/allocation-map" className="block">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={!isComplete}
                  className={`w-full py-3 px-4 rounded-xl flex items-center justify-between transition-all ${
                    isComplete
                      ? 'bg-gradient-emergency text-white shadow-emergency'
                      : 'bg-dark-700 text-dark-400 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Map className="w-5 h-5" />
                    <span>View Resource Map</span>
                  </div>
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </Link>

              <Link to="/report" className="block">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 px-4 rounded-xl bg-dark-700 text-white flex items-center justify-between hover:bg-dark-600 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5" />
                    <span>Report New Disaster</span>
                  </div>
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </Link>
            </div>
          </motion.div>

          {/* Estimated Time */}
          {!isComplete && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-6"
            >
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-orange-400" />
                <div>
                  <p className="text-white font-medium">Estimated Time</p>
                  <p className="text-dark-400 text-sm">
                    {Math.ceil((100 - progress) / 3)} seconds remaining
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Completion Message */}
          {isComplete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-6 bg-green-500/10 border-green-500/30"
            >
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                <div>
                  <p className="text-green-400 font-medium">Allocation Complete!</p>
                  <p className="text-dark-300 text-sm mt-1">
                    Resources have been allocated and deployment is ready. View the resource map for details.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AllocationStatus;
