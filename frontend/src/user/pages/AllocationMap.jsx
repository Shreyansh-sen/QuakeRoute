import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Map,
  AlertTriangle,
  Package,
  Route,
  Clock,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { PageHeader, NodeMap, SkeletonLoader, useToast } from '@shared/components';
import { formatNumber, formatDistance } from '@shared/utils';
import { useDisasterStore, useAllocationStore } from '@user/store';
import { disasterService, adminService } from '@api';

const AllocationMap = () => {
  const toast = useToast();
  const { disasterNodes, requestId } = useDisasterStore();
  const { currentRequestId, isComplete } = useAllocationStore();

  const [resourceNodes, setResourceNodes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connections, setConnections] = useState([]);
  const [optimizationData, setOptimizationData] = useState(null);

  // Fetch real data from backend API
  const fetchResources = async () => {
    try {
      setIsLoading(true);

      // Fetch optimization results from backend
      const optResponse = await disasterService.getOptimizationResults();
      if (optResponse && optResponse.status === 'ready' && optResponse.result) {
        setOptimizationData(optResponse.result);
        const primary = optResponse.result.greedy || optResponse.result.dijkstra;
        const result = primary ? primary.result : null;

        if (result && result.allocations) {
          // Build connections from allocations
          const newConnections = result.allocations.map((alloc) => ({
            disasterId: alloc.disaster_id,
            resourceId: alloc.resource_center_id,
            resourceType: alloc.resource_type,
            distance: alloc.distance_meters,
            time: alloc.travel_time_seconds,
          }));
          setConnections(newConnections);
        }
      }

      // Also fetch resource centers from API
      try {
        const resources = await adminService.listResources();
        const mapped = (resources || []).map((r) => ({
          resourceId: r.id,
          name: r.name,
          type: r.resource_type,
          distance: 'N/A',
          estimatedArrival: 'N/A',
          inventoryAvailable: Object.values(r.inventory || {}).reduce((a, b) => a + b, 0),
          personnelAvailable: r.inventory?.doctors || r.inventory?.rescue_team || 0,
          lat: r.latitude,
          lng: r.longitude,
        }));
        setResourceNodes(mapped);
      } catch (err) {
        console.error('Failed to fetch resources:', err);
      }
    } catch (error) {
      console.error('Failed to fetch allocation data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [currentRequestId, requestId]);

  // No request - show prompt
  if (!currentRequestId && !requestId) {
    return (
      <div className="page-container">
        <PageHeader
          title="Resource Allocation Map"
          subtitle="Visualize disaster and resource nodes"
          showBack
          backPath="/"
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-12 text-center max-w-lg mx-auto"
        >
          <div className="w-20 h-20 bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-6">
            <Map className="w-10 h-10 text-dark-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">No Active Allocation</h2>
          <p className="text-dark-400 mb-6">
            Submit a disaster report first to see the resource allocation map.
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
        title="Resource Allocation Map"
        subtitle="Real-time view of disaster zones and resource deployment"
        showBack
        backPath="/allocation-status"
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={fetchResources}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </motion.button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Map - Main Area */}
        <div className="lg:col-span-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {isLoading ? (
              <SkeletonLoader type="map" className="h-[600px]" />
            ) : (
              <NodeMap
                disasterNodes={disasterNodes}
                resourceNodes={resourceNodes}
                connections={connections}
                height="600px"
                animated={true}
              />
            )}
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Summary */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card p-4"
          >
            <h3 className="font-semibold text-white mb-4">Allocation Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span className="text-dark-300">Disaster Zones</span>
                </div>
                <span className="text-red-400 font-bold">{disasterNodes.length}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-400" />
                  <span className="text-dark-300">Resource Centers</span>
                </div>
                <span className="text-blue-400 font-bold">{resourceNodes.length}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                <div className="flex items-center gap-2">
                  <Route className="w-4 h-4 text-orange-400" />
                  <span className="text-dark-300">Active Routes</span>
                </div>
                <span className="text-orange-400 font-bold">{connections.length}</span>
              </div>
            </div>
          </motion.div>

          {/* Disaster Zones List */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card"
          >
            <div className="p-4 border-b border-dark-700">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <span className="w-3 h-3 bg-red-500 rounded-full" />
                Disaster Zones
              </h3>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {disasterNodes.map((node, index) => (
                <div
                  key={node.id || index}
                  className="p-3 border-b border-dark-700/50 last:border-0"
                >
                  <p className="text-white font-medium truncate">{node.disasterType}</p>
                  <p className="text-dark-400 text-sm truncate">{node.address}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-dark-500">
                    <span>Severity: {node.severity}/10</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Resource Centers List */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card"
          >
            <div className="p-4 border-b border-dark-700">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <span className="w-3 h-3 bg-blue-500 rounded-full" />
                Resource Centers
              </h3>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-dark-400">Loading...</div>
              ) : resourceNodes.length === 0 ? (
                <div className="p-4 text-center text-dark-400">No resources found</div>
              ) : (
                resourceNodes.map((resource, index) => (
                  <div
                    key={resource.resourceId || index}
                    className="p-3 border-b border-dark-700/50 last:border-0"
                  >
                    <p className="text-white font-medium truncate">{resource.name}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-dark-500">
                      <span>{resource.distance}</span>
                      <span>•</span>
                      <span>ETA: {resource.estimatedArrival}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-dark-400">
                      <span>{resource.inventoryAvailable} units</span>
                      <span>•</span>
                      <span>{resource.personnelAvailable} personnel</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>

          {/* Status */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className={`glass-card p-4 ${
              isComplete
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-orange-500/10 border-orange-500/30'
            }`}
          >
            <div className="flex items-center gap-3">
              <Clock className={`w-5 h-5 ${isComplete ? 'text-green-400' : 'text-orange-400'}`} />
              <div>
                <p className={`font-medium ${isComplete ? 'text-green-400' : 'text-orange-400'}`}>
                  {isComplete ? 'Deployment Ready' : 'Allocation in Progress'}
                </p>
                <p className="text-dark-400 text-sm">
                  {isComplete
                    ? 'Resources are ready for deployment'
                    : 'Optimizing resource allocation...'}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AllocationMap;
