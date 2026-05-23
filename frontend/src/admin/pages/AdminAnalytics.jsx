import { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  PieChart,
  TrendingUp,
  Activity,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import {
  PageHeader,
  DashboardCard,
  ChartsPanel,
  PieChartComponent,
  BarChartComponent,
  LineChartComponent,
  AreaChartComponent,
  SkeletonLoader,
} from '@shared/components';
import { staggerContainer, fadeInUp } from '@shared/constants';
import { useAdminStore } from '@admin/store';
import { dashboardService } from '@api';

const AdminAnalytics = () => {
  const {
    dashboardStats,
    chartData,
    setDashboardStats,
    setChartData,
    isLoadingStats,
    setLoadingStats,
  } = useAdminStore();

  useEffect(() => {
    const fetchData = async () => {
      setLoadingStats(true);
      try {
        const [stats, charts] = await Promise.all([
          dashboardService.getStats(),
          dashboardService.getCharts(),
        ]);
        setDashboardStats(stats);
        setChartData(charts);
      } catch (error) {
        console.error('Failed to fetch analytics data:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchData();
  }, []);

  const summaryStats = [
    {
      title: 'Total Disasters',
      value: chartData?.disastersByType?.reduce((sum, d) => sum + d.value, 0) || 0,
      icon: AlertTriangle,
      color: 'primary',
    },
    {
      title: 'Allocation Efficiency',
      value: '86%',
      icon: TrendingUp,
      color: 'green',
    },
    {
      title: 'Avg Response Time',
      value: dashboardStats?.averageResponseTime || '23 min',
      icon: Clock,
      color: 'blue',
    },
    {
      title: 'Active Operations',
      value: dashboardStats?.activeAllocations || 0,
      icon: Activity,
      color: 'orange',
    },
  ];

  return (
    <div>
      <PageHeader
        title="Analytics Dashboard"
        subtitle="Comprehensive insights into disaster response operations"
      />

      {/* Summary Stats */}
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
          {summaryStats.map((stat) => (
            <motion.div key={stat.title} variants={fadeInUp}>
              <DashboardCard {...stat} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Charts Grid */}
      {isLoadingStats ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonLoader type="chart" count={4} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Disaster Distribution Pie Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <PieChartComponent
              data={chartData?.disastersByType || []}
              title="Disasters by Type"
              height={300}
            />
          </motion.div>

          {/* Severity Distribution Pie Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <PieChartComponent
              data={chartData?.severityDistribution || []}
              title="Severity Distribution"
              height={300}
            />
          </motion.div>

          {/* Monthly Trends Bar Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <BarChartComponent
              data={
                chartData?.monthlyTrends?.map((t) => ({
                  name: t.month,
                  disasters: t.disasters,
                  allocations: t.allocations,
                  deployments: t.deployments,
                })) || []
              }
              title="Monthly Trends"
              dataKeys={['disasters', 'allocations', 'deployments']}
              height={300}
            />
          </motion.div>

          {/* Response Time by Region */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <BarChartComponent
              data={
                chartData?.responseTimeByRegion?.map((r) => ({
                  name: r.region,
                  avgTime: r.avgTime,
                  target: r.target,
                })) || []
              }
              title="Response Time by Region (minutes)"
              dataKeys={['avgTime', 'target']}
              height={300}
            />
          </motion.div>

          {/* Resource Utilization Area Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-2"
          >
            <AreaChartComponent
              data={
                chartData?.resourceUtilization?.map((r) => ({
                  name: r.time,
                  medical: r.medical,
                  food: r.food,
                  shelter: r.shelter,
                  equipment: r.equipment,
                })) || []
              }
              title="Resource Utilization Over Time (%)"
              dataKeys={['medical', 'food', 'shelter', 'equipment']}
              height={300}
            />
          </motion.div>

          {/* Allocation Efficiency Line Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="lg:col-span-2"
          >
            <LineChartComponent
              data={
                chartData?.allocationEfficiency?.map((e) => ({
                  name: e.date,
                  efficiency: e.efficiency,
                  optimal: e.optimal,
                })) || []
              }
              title="Allocation Efficiency (%)"
              dataKeys={['efficiency', 'optimal']}
              height={300}
            />
          </motion.div>
        </div>
      )}

      {/* Key Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="mt-8 glass-card p-6"
      >
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-400" />
          Key Insights
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/20">
            <p className="text-green-400 font-medium mb-1">↑ 12% Response Improvement</p>
            <p className="text-dark-400 text-sm">Compared to last month</p>
          </div>
          <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <p className="text-blue-400 font-medium mb-1">Flood - Most Common</p>
            <p className="text-dark-400 text-sm">35% of all disasters</p>
          </div>
          <div className="p-4 bg-orange-500/10 rounded-xl border border-orange-500/20">
            <p className="text-orange-400 font-medium mb-1">East Region Needs Attention</p>
            <p className="text-dark-400 text-sm">25 min avg response time</p>
          </div>
          <div className="p-4 bg-primary-500/10 rounded-xl border border-primary-500/20">
            <p className="text-primary-400 font-medium mb-1">Peak Hours: 8AM - 12PM</p>
            <p className="text-dark-400 text-sm">Highest resource demand</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminAnalytics;
