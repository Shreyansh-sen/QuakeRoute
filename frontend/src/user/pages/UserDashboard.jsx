import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  AlertTriangle, 
  MapPin, 
  Users, 
  Activity,
  ArrowRight,
  Radio,
  Shield,
  Zap,
  Globe,
  Clock
} from 'lucide-react';
import { DashboardCard } from '@shared/components';
import { staggerContainer, fadeInUp } from '@shared/constants';
import { dashboardService } from '@api';

const UserDashboard = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    dashboardService.getStats().then(setStats).catch(() => {});
  }, []);

  const quickStats = [
    { title: 'Active Disasters', value: stats?.totalRequests ?? '—', icon: AlertTriangle, color: 'cyan' },
    { title: 'Resources Available', value: stats?.availableResources ?? '—', icon: Shield, color: 'green' },
    { title: 'Response Teams', value: stats?.personnelAvailable || '—', icon: Users, color: 'orange' },
    { title: 'Avg Response Time', value: stats?.averageResponseTime || '—', icon: Clock, color: 'blue' },
  ];

  return (
    <div className="page-container">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-cyan-950/50 to-blue-950/50 border border-cyan-800/30 p-8 md:p-12 mb-8"
      >
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute -top-20 -right-20 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <motion.div
            className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl"
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.5, 0.3, 0.5] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-3 mb-4"
            >
              <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/20 rounded-full border border-cyan-500/30">
                <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
                <span className="text-xs font-medium text-cyan-400">SYSTEM ONLINE</span>
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl md:text-4xl font-bold text-white mb-4"
            >
              Disaster Resource
              <span className="block emergency-gradient-text">Allocation Platform</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-dark-300 max-w-xl mb-6"
            >
              Report disaster situations and help coordinate emergency response. Our quantum-optimized 
              allocation system ensures fastest resource deployment to affected areas.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap gap-4"
            >
              <Link to="/report">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn-primary flex items-center gap-2"
                >
                  <AlertTriangle className="w-5 h-5" />
                  Report Disaster
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </Link>
              <Link to="/allocation-status">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn-secondary flex items-center gap-2"
                >
                  <Activity className="w-5 h-5" />
                  Track Status
                </motion.button>
              </Link>
            </motion.div>
          </div>

          {/* Animated illustration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className="relative w-64 h-64 hidden lg:block"
          >
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Central globe */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="w-32 h-32 rounded-full bg-gradient-to-br from-primary-500/20 to-orange-500/20 border border-primary-500/30 flex items-center justify-center"
              >
                <Globe className="w-16 h-16 text-primary-400" />
              </motion.div>

              {/* Orbiting markers */}
              {[0, 1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="absolute"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8 + i * 2, repeat: Infinity, ease: 'linear' }}
                  style={{ width: 180 + i * 20, height: 180 + i * 20 }}
                >
                  <motion.div
                    className={`absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full ${
                      i % 2 === 0 ? 'bg-primary-500' : 'bg-orange-500'
                    }`}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
      >
        {quickStats.map((stat, index) => (
          <motion.div key={stat.title} variants={fadeInUp}>
            <DashboardCard
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              color={stat.color}
              trend={stat.trend}
              trendValue={stat.trendValue}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Features Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {/* Report Feature */}
        <Link to="/report" className="block">
          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            className="glass-card-hover p-6 h-full"
          >
            <div className="p-3 bg-primary-500/20 rounded-xl w-fit mb-4">
              <MapPin className="w-6 h-6 text-primary-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Report Location</h3>
            <p className="text-dark-400 text-sm mb-4">
              Click on the map to mark disaster locations. Add multiple points for widespread emergencies.
            </p>
            <div className="flex items-center text-primary-400 text-sm font-medium">
              Start Reporting <ArrowRight className="w-4 h-4 ml-2" />
            </div>
          </motion.div>
        </Link>

        {/* Track Feature */}
        <Link to="/allocation-status" className="block">
          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            className="glass-card-hover p-6 h-full"
          >
            <div className="p-3 bg-orange-500/20 rounded-xl w-fit mb-4">
              <Activity className="w-6 h-6 text-orange-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Real-time Tracking</h3>
            <p className="text-dark-400 text-sm mb-4">
              Monitor your request through every stage from registration to deployment.
            </p>
            <div className="flex items-center text-orange-400 text-sm font-medium">
              Track Status <ArrowRight className="w-4 h-4 ml-2" />
            </div>
          </motion.div>
        </Link>

        {/* Quantum Feature */}
        <Link to="/allocation-map" className="block">
          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            className="glass-card-hover p-6 h-full"
          >
            <div className="p-3 bg-blue-500/20 rounded-xl w-fit mb-4">
              <Zap className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Quantum Optimization</h3>
            <p className="text-dark-400 text-sm mb-4">
              Advanced algorithms optimize resource allocation for maximum efficiency.
            </p>
            <div className="flex items-center text-blue-400 text-sm font-medium">
              View Allocation <ArrowRight className="w-4 h-4 ml-2" />
            </div>
          </motion.div>
        </Link>
      </motion.div>

      {/* SDG Badges */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-8 glass-card p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Contributing to Sustainable Development Goals</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-3 px-4 py-2 bg-orange-500/10 rounded-lg border border-orange-500/20">
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold">11</div>
            <div>
              <p className="text-white font-medium text-sm">SDG 11</p>
              <p className="text-dark-400 text-xs">Sustainable Cities</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-2 bg-green-500/10 rounded-lg border border-green-500/20">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold">13</div>
            <div>
              <p className="text-white font-medium text-sm">SDG 13</p>
              <p className="text-dark-400 text-xs">Climate Action</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default UserDashboard;
