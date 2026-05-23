import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Package,
  Zap,
  RefreshCw,
  CheckCircle,
  Loader2,
  MapPin,
  ChevronDown,
  ChevronUp,
  Rocket,
} from 'lucide-react';
import { adminService } from '@api';

// Inventory fields per resource type
const INVENTORY_FIELDS = {
  hospital: [
    { key: 'beds', label: 'Beds', max: 500 },
    { key: 'ambulances', label: 'Ambulances', max: 50 },
    { key: 'doctors', label: 'Doctors', max: 200 },
    { key: 'medical_kits', label: 'Medical Kits', max: 1000 },
  ],
  fire_station: [
    { key: 'fire_trucks', label: 'Fire Trucks', max: 20 },
    { key: 'rescue_team', label: 'Rescue Teams', max: 50 },
    { key: 'capacity', label: 'Capacity', max: 500 },
  ],
  shelter: [
    { key: 'capacity', label: 'Shelter Capacity', max: 2000 },
    { key: 'food', label: 'Food Units', max: 5000 },
    { key: 'water', label: 'Water Units', max: 5000 },
    { key: 'medicine', label: 'Medicine Units', max: 1000 },
  ],
  police: [
    { key: 'capacity', label: 'Personnel', max: 200 },
    { key: 'rescue_team', label: 'Rescue Teams', max: 50 },
  ],
  default: [
    { key: 'capacity', label: 'Capacity', max: 500 },
    { key: 'food', label: 'Food Units', max: 1000 },
    { key: 'water', label: 'Water Units', max: 1000 },
  ],
};

const getFieldsForType = (type) => INVENTORY_FIELDS[type] || INVENTORY_FIELDS.default;

const formatType = (type) => type?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Unknown';

const typeColors = {
  hospital: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', dot: 'bg-red-500' },
  fire_station: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30', dot: 'bg-orange-500' },
  shelter: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', dot: 'bg-blue-500' },
  police: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', dot: 'bg-green-500' },
  default: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30', dot: 'bg-purple-500' },
};
const getColors = (type) => typeColors[type] || typeColors.default;

// Pipeline stages
const STAGES = [
  { id: 'fetch', label: 'Fetching Disasters' },
  { id: 'discover', label: 'Discovering Resources' },
  { id: 'inventory', label: 'Updating Inventory' },
  { id: 'graph', label: 'Building Route Graph' },
  { id: 'optimize', label: 'Running Optimization' },
  { id: 'done', label: 'Complete' },
];

const AdminDashboard = () => {
  // Data state
  const [disasters, setDisasters] = useState([]);
  const [resources, setResources] = useState([]);
  const [inventoryInputs, setInventoryInputs] = useState({}); // { resourceId: { field: value } }
  const [expandedResources, setExpandedResources] = useState({}); // { resourceId: true }

  // Pipeline state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineStage, setPipelineStage] = useState(null);
  const [pipelineError, setPipelineError] = useState(null);

  // Results
  const [optimizationResult, setOptimizationResult] = useState(null);
  const [graphResult, setGraphResult] = useState(null);

  // Fetch disasters + discover resources on load
  useEffect(() => {
    fetchDisastersAndResources();
  }, []);

  const fetchDisastersAndResources = async () => {
    setLoading(true);
    setError(null);
    try {
      const disastersRes = await adminService.listDisasters(1, 50);
      const disastersList = disastersRes?.disasters || [];
      setDisasters(disastersList);

      if (disastersList.length > 0) {
        const ids = disastersList.map((d) => d.id);
        const resourcesRes = await adminService.discoverResources(ids, 15, [
          'hospital',
          'fire_station',
          'shelter',
        ]);
        const discovered = resourcesRes?.discovered || [];
        setResources(discovered);

        // Initialize inventory inputs with empty values
        const inputs = {};
        discovered.forEach((r) => {
          inputs[r.id] = {};
          getFieldsForType(r.resource_type).forEach((f) => {
            inputs[r.id][f.key] = 0;
          });
        });
        setInventoryInputs(inputs);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err?.response?.data?.detail || err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  // Update inventory input for a resource
  const handleInventoryChange = (resourceId, field, value) => {
    setInventoryInputs((prev) => ({
      ...prev,
      [resourceId]: {
        ...(prev[resourceId] || {}),
        [field]: Math.max(0, parseInt(value) || 0),
      },
    }));
  };

  // Toggle resource card expansion
  const toggleExpand = (resourceId) => {
    setExpandedResources((prev) => ({ ...prev, [resourceId]: !prev[resourceId] }));
  };

  // Count resources with any inventory assigned
  const getAssignedCount = () => {
    return Object.entries(inventoryInputs).filter(([_, fields]) =>
      Object.values(fields).some((v) => v > 0)
    ).length;
  };

  // ===== THE BIG BUTTON: Let's Go! =====
  const handleLetsGo = async () => {
    setPipelineRunning(true);
    setPipelineError(null);
    setOptimizationResult(null);
    setGraphResult(null);

    try {
      // Stage 1: Build inventory updates
      setPipelineStage('inventory');
      const updates = Object.entries(inventoryInputs)
        .filter(([_, fields]) => Object.values(fields).some((v) => v > 0))
        .map(([resourceId, fields]) => ({
          resource_center_id: parseInt(resourceId),
          ...fields,
        }));

      if (updates.length === 0) {
        throw new Error('Please assign inventory to at least one resource center');
      }

      await adminService.bulkUpdateInventory(updates);

      // Stage 2: Build graph
      setPipelineStage('graph');
      const disasterIds = disasters.map((d) => d.id);
      const resourceIds = resources.map((r) => r.id);
      const graph = await adminService.buildGraph(disasterIds, resourceIds);
      setGraphResult(graph);

      // Stage 3: Run optimization — ALL 3 algorithms
      setPipelineStage('optimize');
      const [greedyResult, dijkstraResult, qaoaResult] = await Promise.all([
        adminService.runOptimization(disasterIds, 'greedy'),
        adminService.runOptimization(disasterIds, 'dijkstra'),
        adminService.runOptimization(disasterIds, 'qaoa'),
      ]);
      setOptimizationResult({ greedy: greedyResult, dijkstra: dijkstraResult, qaoa: qaoaResult });

      // Stage 4: Store results in backend for user portal to access
      await adminService.storeResults({
        greedy: greedyResult,
        dijkstra: dijkstraResult,
        qaoa: qaoaResult,
        graph,
        disasters,
        resources,
        timestamp: Date.now(),
      });

      setPipelineStage('done');
    } catch (err) {
      console.error('Pipeline error:', err);
      setPipelineError(err?.response?.data?.detail || err.message || 'Pipeline failed');
    } finally {
      setPipelineRunning(false);
    }
  };

  // ===== RENDER =====
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
          <p className="text-dark-400">
            View disasters → Assign resources → Optimize allocation
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={fetchDisastersAndResources}
          disabled={loading || pipelineRunning}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </motion.button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
          <span className="ml-3 text-dark-400">Loading disasters and resources...</span>
        </div>
      ) : (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="glass-card p-5 flex items-center gap-4">
              <div className="p-3 bg-red-500/20 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{disasters.length}</p>
                <p className="text-dark-400 text-sm">Active Disasters</p>
              </div>
            </div>
            <div className="glass-card p-5 flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <Package className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{resources.length}</p>
                <p className="text-dark-400 text-sm">Discovered Resources</p>
              </div>
            </div>
            <div className="glass-card p-5 flex items-center gap-4">
              <div className="p-3 bg-green-500/20 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{getAssignedCount()}</p>
                <p className="text-dark-400 text-sm">Resources Assigned</p>
              </div>
            </div>
          </div>

          {/* Disasters Section */}
          {disasters.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                Disaster Sites
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {disasters.map((d) => (
                  <motion.div
                    key={d.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-white font-medium capitalize">
                          {d.disaster_type?.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <span className="text-xs text-dark-500">ID: {d.id}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-dark-400 mb-1">
                      <MapPin className="w-3 h-3" />
                      <span>{d.lat?.toFixed(4)}, {d.lng?.toFixed(4)}</span>
                    </div>
                    <div className="flex gap-4 text-xs text-dark-500 mt-2">
                      <span>Severity: <strong className="text-orange-400">{d.severity}/10</strong></span>
                      <span>Affected: <strong className="text-white">{d.affected_population?.toLocaleString()}</strong></span>
                      <span className={`font-medium ${d.priority === 'critical' ? 'text-red-400' : d.priority === 'high' ? 'text-orange-400' : 'text-yellow-400'}`}>
                        {d.priority?.toUpperCase()}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {disasters.length === 0 && (
            <div className="glass-card p-12 text-center mb-8">
              <AlertTriangle className="w-12 h-12 text-dark-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">No Disasters Reported</h2>
              <p className="text-dark-400">
                Waiting for disaster reports from the user portal...
              </p>
            </div>
          )}

          {/* Resources Section with Inventory Inputs */}
          {resources.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-400" />
                Resource Centers — Assign Inventory
              </h2>
              <p className="text-dark-400 text-sm mb-4">
                Expand each resource to assign available inventory. Then hit "Let's Go" to optimize.
              </p>

              <div className="space-y-3">
                {resources.map((resource) => {
                  const colors = getColors(resource.resource_type);
                  const fields = getFieldsForType(resource.resource_type);
                  const isExpanded = expandedResources[resource.id];
                  const hasValues = Object.values(inventoryInputs[resource.id] || {}).some((v) => v > 0);

                  return (
                    <motion.div
                      key={resource.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`glass-card overflow-hidden transition-all ${
                        hasValues ? 'border-green-500/30' : ''
                      }`}
                    >
                      {/* Resource Header */}
                      <div
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-dark-800/50 transition-colors"
                        onClick={() => toggleExpand(resource.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${colors.dot}`} />
                          <div>
                            <h3 className="text-white font-medium">{resource.name}</h3>
                            <div className="flex items-center gap-3 text-xs text-dark-500 mt-1">
                              <span className={`px-2 py-0.5 rounded ${colors.bg} ${colors.text}`}>
                                {formatType(resource.resource_type)}
                              </span>
                              {resource.address && <span>{resource.address}</span>}
                              <span>ID: {resource.id}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {hasValues && (
                            <span className="text-xs text-green-400 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Assigned
                            </span>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-dark-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-dark-400" />
                          )}
                        </div>
                      </div>

                      {/* Inventory Inputs (expanded) */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 pt-2 border-t border-dark-700">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {fields.map((field) => (
                                  <div key={field.key}>
                                    <label className="text-xs text-dark-400 mb-1 block">
                                      {field.label}
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      max={field.max}
                                      value={inventoryInputs[resource.id]?.[field.key] || 0}
                                      onChange={(e) =>
                                        handleInventoryChange(resource.id, field.key, e.target.value)
                                      }
                                      className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white text-sm focus:border-primary-500 focus:outline-none"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* LET'S GO Button */}
          {resources.length > 0 && (
            <div className="mb-8">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleLetsGo}
                disabled={pipelineRunning || getAssignedCount() === 0}
                className={`w-full py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${
                  pipelineRunning || getAssignedCount() === 0
                    ? 'bg-dark-700 text-dark-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-primary-500 via-orange-500 to-red-500 text-white shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40'
                }`}
              >
                {pipelineRunning ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Processing... ({STAGES.find((s) => s.id === pipelineStage)?.label || ''})
                  </>
                ) : (
                  <>
                    <Rocket className="w-6 h-6" />
                    Let's Go! — Optimize Resource Allocation
                    {getAssignedCount() > 0 && (
                      <span className="ml-2 px-3 py-1 bg-white/20 rounded-full text-sm">
                        {getAssignedCount()} resources
                      </span>
                    )}
                  </>
                )}
              </motion.button>

              {getAssignedCount() === 0 && !pipelineRunning && (
                <p className="text-dark-500 text-sm text-center mt-2">
                  Expand resources above and assign inventory to enable optimization
                </p>
              )}
            </div>
          )}

          {/* Pipeline Progress */}
          {pipelineRunning && (
            <div className="glass-card p-6 mb-8">
              <h3 className="text-white font-semibold mb-4">Pipeline Progress</h3>
              <div className="flex items-center gap-2">
                {STAGES.filter((s) => s.id !== 'fetch' && s.id !== 'discover').map((stage, i) => {
                  const stageIndex = STAGES.findIndex((s) => s.id === stage.id);
                  const currentIndex = STAGES.findIndex((s) => s.id === pipelineStage);
                  const isDone = stageIndex < currentIndex;
                  const isActive = stage.id === pipelineStage;
                  return (
                    <div key={stage.id} className="flex items-center gap-2 flex-1">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          isDone
                            ? 'bg-green-500 text-white'
                            : isActive
                            ? 'bg-primary-500 text-white animate-pulse'
                            : 'bg-dark-700 text-dark-500'
                        }`}
                      >
                        {isDone ? '✓' : i + 1}
                      </div>
                      <span className={`text-xs ${isActive ? 'text-primary-400' : isDone ? 'text-green-400' : 'text-dark-500'}`}>
                        {stage.label}
                      </span>
                      {i < 3 && <div className={`flex-1 h-0.5 ${isDone ? 'bg-green-500' : 'bg-dark-700'}`} />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pipeline Error */}
          {pipelineError && (
            <div className="glass-card p-6 mb-8 bg-red-500/10 border-red-500/30">
              <h3 className="text-red-400 font-semibold mb-2">Pipeline Error</h3>
              <p className="text-dark-300">{pipelineError}</p>
            </div>
          )}

          {/* Optimization Results — Algorithm Comparison */}
          {optimizationResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6 mb-8 bg-green-500/5 border-green-500/30"
            >
              <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <Zap className="w-5 h-5 text-green-400" />
                Optimization Results — Algorithm Comparison
              </h2>

              {/* Side-by-side comparison */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {['greedy', 'dijkstra', 'qaoa'].map((algo) => {
                  const data = optimizationResult[algo]?.result;
                  if (!data) return null;
                  const colors = { greedy: { bg: 'orange', text: 'text-orange-400' }, dijkstra: { bg: 'blue', text: 'text-blue-400' }, qaoa: { bg: 'purple', text: 'text-purple-400' } };
                  const labels = { greedy: '🚀 Greedy', dijkstra: '🧭 Dijkstra', qaoa: '⚛️ Quantum QAOA' };
                  const c = colors[algo];
                  return (
                    <div key={algo} className={`p-5 rounded-xl border bg-${c.bg}-500/5 border-${c.bg}-500/30`}>
                      <h3 className={`text-lg font-bold mb-4 ${c.text}`}>
                        {labels[algo]}
                      </h3>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="p-3 bg-dark-800/50 rounded-lg text-center">
                          <p className={`text-xl font-bold ${c.text}`}>
                            {data.coverage_percentage?.toFixed(1)}%
                          </p>
                          <p className="text-dark-400 text-xs">Coverage</p>
                        </div>
                        <div className="p-3 bg-dark-800/50 rounded-lg text-center">
                          <p className="text-xl font-bold text-white">{data.allocations?.length || 0}</p>
                          <p className="text-dark-400 text-xs">Allocations</p>
                        </div>
                        <div className="p-3 bg-dark-800/50 rounded-lg text-center">
                          <p className="text-xl font-bold text-white">{((data.total_distance || 0) / 1000).toFixed(1)} km</p>
                          <p className="text-dark-400 text-xs">Distance</p>
                        </div>
                        <div className="p-3 bg-dark-800/50 rounded-lg text-center">
                          <p className="text-xl font-bold text-white">{((data.total_time || 0) / 60).toFixed(0)} min</p>
                          <p className="text-dark-400 text-xs">Time</p>
                        </div>
                      </div>
                      <div className="text-xs text-dark-500">
                        Computed in {data.computation_time_ms?.toFixed(0) || '?'} ms · {data.iterations || 0} iterations
                      </div>

                      {/* Allocations list */}
                      {data.allocations?.length > 0 && (
                        <div className="mt-3 space-y-1 max-h-40 overflow-y-auto">
                          {data.allocations.map((alloc, i) => (
                            <div key={i} className="p-2 bg-dark-800/30 rounded text-xs flex justify-between">
                              <span className="text-white">D#{alloc.disaster_id} ← R#{alloc.resource_center_id}
                                <span className="ml-1 text-dark-400 capitalize">{alloc.resource_type?.replace(/_/g, ' ')}</span>
                              </span>
                              <span className="text-dark-400">{(alloc.distance_meters / 1000).toFixed(1)}km · {(alloc.eta_seconds / 60).toFixed(0)}min</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Winner comparison */}
              {(() => {
                const algos = ['greedy', 'dijkstra', 'qaoa'].filter(a => optimizationResult[a]?.result);
                if (algos.length < 2) return null;
                const labels = { greedy: '🚀 Greedy', dijkstra: '🧭 Dijkstra', qaoa: '⚛️ Quantum QAOA' };
                const best = algos.reduce((a, b) => {
                  const ra = optimizationResult[a].result;
                  const rb = optimizationResult[b].result;
                  if (ra.coverage_percentage > rb.coverage_percentage) return a;
                  if (ra.coverage_percentage === rb.coverage_percentage && ra.total_distance < rb.total_distance) return a;
                  return b;
                });
                return (
                  <div className="p-4 bg-primary-500/10 border border-primary-500/30 rounded-xl">
                    <h4 className="text-primary-400 font-bold mb-2">📊 Comparison Summary</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-dark-400">Winner: </span>
                        <span className="text-white font-bold">{labels[best]}</span>
                      </div>
                      {algos.map(a => (
                        <div key={a}>
                          <span className="text-dark-400">{labels[a]}: </span>
                          <span className="text-white">{optimizationResult[a].result.coverage_percentage?.toFixed(1)}% / {(optimizationResult[a].result.total_distance / 1000).toFixed(1)}km</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Graph Stats */}
              {graphResult && (
                <div className="mt-4 pt-4 border-t border-dark-700">
                  <p className="text-dark-400 text-sm">
                    Graph: {graphResult.node_count} nodes, {graphResult.edge_count} edges |
                    Greedy: <span className="text-orange-400">{optimizationResult.greedy?.status}</span> |
                    Dijkstra: <span className="text-blue-400">{optimizationResult.dijkstra?.status}</span> |
                    QAOA: <span className="text-purple-400">{optimizationResult.qaoa?.status}</span>
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
