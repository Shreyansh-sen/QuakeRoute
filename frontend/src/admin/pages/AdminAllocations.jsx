import { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  GitBranch,
  AlertTriangle,
  Package,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { 
  PageHeader, 
  DashboardCard, 
  NodeMap, 
  SkeletonLoader 
} from '@shared/components';
import { staggerContainer, fadeInUp } from '@shared/constants';
import { useAdminStore } from '@admin/store';
import { dashboardService, adminService } from '@api';
import mockApi from '@api/mockApi';

const AdminAllocations = () => {
  const {
    dashboardStats,
    setDashboardStats,
    disasters,
    setDisasters,
    isLoadingStats,
    setLoadingStats,
    isLoadingDisasters,
    setLoadingDisasters,
  } = useAdminStore();

  useEffect(() => {
    const fetchData = async () => {
      setLoadingStats(true);
      setLoadingDisasters(true);

      try {
        const [stats, disastersResponse] = await Promise.all([
          dashboardService.getStats(),
          adminService.getDisasters({ status: 'allocated', limit: 5 }),
        ]);

        setDashboardStats(stats);
        setDisasters(disastersResponse.data, disastersResponse.pagination);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoadingStats(false);
        setLoadingDisasters(false);
      }
    };

    fetchData();
  }, []);

  // Mock allocated disasters for map
  const allocatedDisasters = disasters.filter(
    (d) => d.status === 'Allocated' || d.status === 'Deployed'
  );

  // Mock resource nodes
  const resourceNodes = [
    { resourceId: 'R1', name: 'Medical Camp A', coordinates: { lat: 28.7041, lng: 77.1025 }, type: 'medical' },
    { resourceId: 'R2', name: 'Food Hub B', coordinates: { lat: 19.0760, lng: 72.8777 }, type: 'food' },
    { resourceId: 'R3', name: 'Shelter Zone C', coordinates: { lat: 13.0827, lng: 80.2707 }, type: 'shelter' },
  ];

  const stats = [
    {
      title: 'Active Allocations',
      value: dashboardStats?.activeAllocations || 0,
      icon: GitBranch,
      color: 'primary',
    },
    {
      title: 'Assets Deployed',
      value: 2450,
      icon: Package,
      color: 'blue',
    },
    {
      title: 'Personnel Assigned',
      value: 380,
      icon: Users,
      color: 'green',
    },
    {
      title: 'Avg Response Time',
      value: '23 min',
      icon: Clock,
      color: 'orange',
    },
  ];

  return (
    <div>
      <PageHeader
        title="Resource Allocations"
        subtitle="Monitor and manage ongoing resource deployments"
      />

      {/* Stats */}
      {isLoadingStats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <SkeletonLoader type="card" count={4} />
        </div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {stats.map((stat) => (
            <motion.div key={stat.title} variants={fadeInUp}>
              <DashboardCard {...stat} />
            </motion.div>
          ))}
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2"
        >
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Allocation Map</h2>
            <NodeMap
              disasterNodes={allocatedDisasters.map((d) => ({
                id: d.id,
                latitude: d.latitude || 28.6139 + Math.random() * 2,
                longitude: d.longitude || 77.2090 + Math.random() * 2,
                address: d.location,
                disasterType: d.type,
                severity: d.severity,
              }))}
              resourceNodes={resourceNodes}
              height="400px"
              animated={true}
            />
          </div>
        </motion.div>

        {/* Recent Allocations */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card"
        >
          <div className="p-4 border-b border-dark-700">
            <h2 className="text-lg font-semibold text-white">Recent Allocations</h2>
          </div>
          <div className="divide-y divide-dark-700/50 max-h-[440px] overflow-y-auto">
            {isLoadingDisasters ? (
              <div className="p-4">
                <SkeletonLoader type="text" count={5} />
              </div>
            ) : allocatedDisasters.length === 0 ? (
              <div className="p-8 text-center">
                <GitBranch className="w-12 h-12 text-dark-500 mx-auto mb-3" />
                <p className="text-dark-400">No active allocations</p>
              </div>
            ) : (
              disasters.slice(0, 8).map((disaster, index) => (
                <motion.div
                  key={disaster.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 hover:bg-dark-800/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white font-medium">{disaster.location}</p>
                      <p className="text-dark-400 text-sm">{disaster.type}</p>
                      <p className="text-dark-500 text-xs mt-1">ID: {disaster.id}</p>
                    </div>
                    <div
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        disaster.status === 'Deployed'
                          ? 'bg-green-500/20 text-green-400'
                          : disaster.status === 'Allocated'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-orange-500/20 text-orange-400'
                      }`}
                    >
                      {disaster.status}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* Allocation Efficiency */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-6 glass-card p-6"
      >
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-400" />
          Allocation Efficiency Metrics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="p-4 bg-dark-800/50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-dark-400">Resource Utilization</span>
              <span className="text-green-400 font-bold">85%</span>
            </div>
            <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-green-500"
                initial={{ width: 0 }}
                animate={{ width: '85%' }}
                transition={{ duration: 1, delay: 0.5 }}
              />
            </div>
          </div>
          <div className="p-4 bg-dark-800/50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-dark-400">Coverage Rate</span>
              <span className="text-blue-400 font-bold">92%</span>
            </div>
            <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-blue-500"
                initial={{ width: 0 }}
                animate={{ width: '92%' }}
                transition={{ duration: 1, delay: 0.6 }}
              />
            </div>
          </div>
          <div className="p-4 bg-dark-800/50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-dark-400">Response Accuracy</span>
              <span className="text-primary-400 font-bold">88%</span>
            </div>
            <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary-500"
                initial={{ width: 0 }}
                animate={{ width: '88%' }}
                transition={{ duration: 1, delay: 0.7 }}
              />
            </div>
          </div>
          <div className="p-4 bg-dark-800/50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-dark-400">Quantum Optimization</span>
              <span className="text-orange-400 font-bold">76%</span>
            </div>
            <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-orange-500"
                initial={{ width: 0 }}
                animate={{ width: '76%' }}
                transition={{ duration: 1, delay: 0.8 }}
              />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminAllocations;
