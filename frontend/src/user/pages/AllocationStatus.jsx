import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
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
import { ALLOCATION_STAGES } from '@shared/constants';
import { useDisasterStore, useAllocationStore } from '@user/store';
import { disasterService } from '@api';

const AllocationStatus = () => {
  const toast = useToast();
  const { requestId } = useDisasterStore();
  const {
    currentRequestId,
    isComplete,
    setCurrentRequest,
    updateAllocationStatus,
    setAllocatedResources,
  } = useAllocationStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [optimizationData, setOptimizationData] = useState(null);
  const [disasters, setDisasters] = useState([]);

  const disasterIds = (() => {
    if (requestId) return requestId.split(',').map(Number).filter(Boolean);
    try {
      return JSON.parse(localStorage.getItem('quakeroute_disaster_ids') || '[]');
    } catch {
      return [];
    }
  })();

  const hasRequest = disasterIds.length > 0 || currentRequestId;

  const checkOptimizationResults = useCallback(async () => {
    try {
      const response = await disasterService.getOptimizationResults();
      if (response && response.status === 'ready' && response.result) {
        const data = response.result;
        setOptimizationData(data);
        const primary = data.greedy ? data.greedy.result : (data.dijkstra ? data.dijkstra.result : null);
        if (primary) {
          updateAllocationStatus({ stage: 7, status: 'Deployment Ready', progress: 100, isComplete: true });
          if (primary.allocations) setAllocatedResources(primary.allocations);
          return true;
        }
      }
      return false;
    } catch (err) {
      return false;
    }
  }, [updateAllocationStatus, setAllocatedResources]);

  const fetchDisasters = useCallback(async () => {
    if (disasterIds.length === 0) return;
    try {
      const results = await Promise.all(
        disasterIds.map((id) => disasterService.getDisaster(id).catch(() => null))
      );
      setDisasters(results.filter(Boolean));
    } catch (err) {
      // ignore
    }
  }, [disasterIds.join(',')]);

  useEffect(() => {
    if (!hasRequest) return;
    if (!currentRequestId && requestId) setCurrentRequest(requestId);
    if (!isComplete) {
      checkOptimizationResults().then((found) => {
        if (!found)
          updateAllocationStatus({ stage: 1, status: 'Disaster Registered', progress: 14, isComplete: false });
      });
    }
    fetchDisasters();
  }, [hasRequest]);

  useEffect(() => {
    if (isComplete) return;
    const interval = setInterval(async () => {
      const found = await checkOptimizationResults();
      if (found) {
        clearInterval(interval);
        toast.success('Allocation complete! View the map.');
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [isComplete, checkOptimizationResults]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await checkOptimizationResults();
    await fetchDisasters();
    setIsRefreshing(false);
  };

  if (!hasRequest) {
    return (
      <div className="page-container">
        <PageHeader title="Allocation Status" subtitle="Track your disaster request progress" showBack backPath="/" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-12 text-center max-w-lg mx-auto">
          <div className="w-20 h-20 bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-dark-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">No Active Request</h2>
          <p className="text-dark-400 mb-6">Submit a disaster report first.</p>
          <Link to="/report">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn-primary flex items-center gap-2 mx-auto">
              <AlertTriangle className="w-5 h-5" /> Report Disaster
            </motion.button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader title="Allocation Status" subtitle={`Tracking ${disasterIds.length} disaster site(s)`} showBack backPath="/">
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleRefresh} disabled={isRefreshing} className="btn-secondary flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh
        </motion.button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 mb-6">
            <div className="flex items-center gap-3 mb-2">
              {isComplete ? (
                <div className="p-2 bg-green-500/20 rounded-lg"><CheckCircle className="w-6 h-6 text-green-500" /></div>
              ) : (
                <div className="p-2 bg-primary-500/20 rounded-lg"><Radio className="w-6 h-6 text-primary-500 animate-pulse" /></div>
              )}
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {isComplete ? 'Deployment Ready' : 'Waiting for Admin Processing'}
                </h2>
                <p className="text-dark-400 text-sm">
                  {isComplete ? 'Resources allocated and routes optimized' : 'Admin will assign resources and run optimization.'}
                </p>
              </div>
            </div>
            <div className="mt-6">
              <div className="h-3 bg-dark-700 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full ${isComplete ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 'bg-gradient-emergency'}`}
                  initial={{ width: 0 }}
                  animate={{ width: isComplete ? '100%' : '14%' }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="text-dark-500 text-sm mt-2">
                {isComplete ? 'All stages complete' : 'Stage 1 of 7 \u2014 Waiting for admin...'}
              </p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Allocation Progress</h3>
            <StatusTimeline stages={ALLOCATION_STAGES} currentStage={isComplete ? 8 : 1} progress={isComplete ? 100 : 14} />
          </motion.div>

          {isComplete && optimizationData && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6 mt-6 bg-green-500/5 border-green-500/30">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-green-400" /> Optimization Results &mdash; Algorithm Comparison
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {['greedy', 'dijkstra', 'qaoa'].map((algo) => {
                  const algoData = optimizationData[algo];
                  if (!algoData || !algoData.result) return null;
                  const result = algoData.result;
                  const colors = { greedy: { bg: 'orange', text: 'text-orange-400' }, dijkstra: { bg: 'blue', text: 'text-blue-400' }, qaoa: { bg: 'purple', text: 'text-purple-400' } };
                  const labels = { greedy: '\ud83d\ude80 Greedy', dijkstra: '\ud83e\udded Dijkstra', qaoa: '\u269b\ufe0f Quantum QAOA' };
                  const c = colors[algo];
                  return (
                    <div key={algo} className={`p-4 rounded-xl border bg-${c.bg}-500/5 border-${c.bg}-500/30`}>
                      <h4 className={`font-bold mb-3 ${c.text}`}>
                        {labels[algo]}
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="p-2 bg-dark-800/50 rounded text-center">
                          <p className={`text-lg font-bold ${c.text}`}>
                            {result.coverage_percentage != null ? result.coverage_percentage.toFixed(1) : '0'}%
                          </p>
                          <p className="text-dark-400 text-xs">Coverage</p>
                        </div>
                        <div className="p-2 bg-dark-800/50 rounded text-center">
                          <p className="text-lg font-bold text-white">{result.allocations ? result.allocations.length : 0}</p>
                          <p className="text-dark-400 text-xs">Allocations</p>
                        </div>
                        <div className="p-2 bg-dark-800/50 rounded text-center">
                          <p className="text-lg font-bold text-white">{((result.total_distance || 0) / 1000).toFixed(1)} km</p>
                          <p className="text-dark-400 text-xs">Distance</p>
                        </div>
                        <div className="p-2 bg-dark-800/50 rounded text-center">
                          <p className="text-lg font-bold text-white">{((result.total_time || 0) / 60).toFixed(0)} min</p>
                          <p className="text-dark-400 text-xs">Time</p>
                        </div>
                      </div>
                      {result.allocations && result.allocations.map((alloc, i) => (
                        <div key={i} className="mt-2 p-2 bg-dark-800/30 rounded text-xs flex justify-between">
                          <span className="text-white">
                            D#{alloc.disaster_id} &larr; R#{alloc.resource_center_id}{' '}
                            <span className="text-dark-400 capitalize">{(alloc.resource_type || '').replace(/_/g, ' ')}</span>
                          </span>
                          <span className="text-dark-400">{(alloc.distance_meters / 1000).toFixed(1)}km</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>

              {(() => {
                const algos = ['greedy', 'dijkstra', 'qaoa'].filter(a => optimizationData[a] && optimizationData[a].result);
                if (algos.length < 2) return null;
                const labels = { greedy: 'Greedy \ud83d\ude80', dijkstra: 'Dijkstra \ud83e\udded', qaoa: 'Quantum QAOA \u269b\ufe0f' };
                const best = algos.reduce((a, b) => {
                  const ra = optimizationData[a].result;
                  const rb = optimizationData[b].result;
                  if (ra.coverage_percentage > rb.coverage_percentage) return a;
                  if (ra.coverage_percentage === rb.coverage_percentage && ra.total_distance < rb.total_distance) return a;
                  return b;
                });
                return (
                  <div className="p-3 bg-primary-500/10 border border-primary-500/30 rounded-lg text-sm">
                    <span className="text-primary-400 font-bold">
                      Winner: {labels[best]}
                    </span>
                    <span className="text-dark-400 ml-4">
                      {algos.map(a => `${a}: ${optimizationData[a].result.coverage_percentage.toFixed(1)}%`).join(' \u00b7 ')}
                    </span>
                  </div>
                );
              })()}
            </motion.div>
          )}
        </div>

        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-6">
            <h3 className="font-semibold text-white mb-4">Request Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-dark-700">
                <span className="text-dark-400">Disaster IDs</span>
                <span className="text-white font-mono text-sm">{disasterIds.join(', ')}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-dark-700">
                <span className="text-dark-400">Sites</span>
                <span className="text-white">{disasterIds.length}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-dark-400">Status</span>
                <span className={isComplete ? 'badge-success' : 'badge-warning'}>
                  {isComplete ? 'Complete' : 'Pending'}
                </span>
              </div>
            </div>
          </motion.div>

          {disasters.length > 0 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="glass-card">
              <div className="p-4 border-b border-dark-700">
                <h3 className="font-semibold text-white">Your Disaster Reports</h3>
              </div>
              <div className="divide-y divide-dark-700/50">
                {disasters.map((d) => (
                  <div key={d.id} className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 bg-red-500 rounded-full" />
                      <span className="text-white text-sm capitalize">{(d.disaster_type || '').replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-dark-500 text-xs">
                      Severity: {d.severity}/10 &middot; {(d.affected_population || 0).toLocaleString()} affected
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
            <h3 className="font-semibold text-white mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link to="/allocation-map" className="block">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={!isComplete}
                  className={`w-full py-3 px-4 rounded-xl flex items-center justify-between transition-all ${isComplete ? 'bg-gradient-emergency text-white shadow-emergency' : 'bg-dark-700 text-dark-400 cursor-not-allowed'}`}>
                  <div className="flex items-center gap-3"><Map className="w-5 h-5" /><span>View Resource Map</span></div>
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </Link>
              <Link to="/report" className="block">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="w-full py-3 px-4 rounded-xl bg-dark-700 text-white flex items-center justify-between hover:bg-dark-600 transition-colors">
                  <div className="flex items-center gap-3"><AlertTriangle className="w-5 h-5" /><span>Report New Disaster</span></div>
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </Link>
            </div>
          </motion.div>

          {!isComplete && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-orange-400 animate-pulse" />
                <div>
                  <p className="text-white font-medium">Waiting for Admin</p>
                  <p className="text-dark-400 text-sm">Polling backend every 3 seconds...</p>
                </div>
              </div>
            </motion.div>
          )}

          {isComplete && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-6 bg-green-500/10 border-green-500/30">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                <div>
                  <p className="text-green-400 font-medium">Allocation Complete!</p>
                  <p className="text-dark-300 text-sm mt-1">View the resource map for deployment details.</p>
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
