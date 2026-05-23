import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  ArrowUpDown,
  AlertTriangle,
  MapPin,
  Users,
  Clock,
} from 'lucide-react';
import { 
  PageHeader, 
  SearchBar, 
  FilterPanel, 
  SkeletonLoader, 
  EmptyState,
  useToast 
} from '@shared/components';
import { formatDate, formatNumber, getSeverityClass, getStatusBadgeClass } from '@shared/utils';
import { DISASTER_TYPES } from '@shared/constants';
import { useAdminStore } from '@admin/store';
import { adminService } from '@api';

const AdminRequests = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [showFilters, setShowFilters] = useState(false);

  const {
    disasters,
    disastersPagination,
    setDisasters,
    filters,
    setFilters,
    resetFilters,
    isLoadingDisasters,
    setLoadingDisasters,
  } = useAdminStore();

  // Fetch disasters
  const fetchDisasters = async () => {
    setLoadingDisasters(true);
    try {
      const response = await adminService.getDisasters({
        ...filters,
        page: disastersPagination.page,
        limit: disastersPagination.limit,
      });
      setDisasters(response.data, response.pagination);
    } catch (error) {
      toast.error('Failed to fetch disaster requests');
      console.error(error);
    } finally {
      setLoadingDisasters(false);
    }
  };

  useEffect(() => {
    fetchDisasters();
  }, [filters, disastersPagination.page]);

  // Handle search
  const handleSearch = (value) => {
    setFilters({ search: value });
  };

  // Handle sort
  const handleSort = (column) => {
    const newOrder =
      filters.sortBy === column && filters.sortOrder === 'asc' ? 'desc' : 'asc';
    setFilters({ sortBy: column, sortOrder: newOrder });
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    setDisasters(disasters, { ...disastersPagination, page: newPage });
  };

  // Filter options
  const filterOptions = [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'allocated', label: 'Allocated' },
        { value: 'deployed', label: 'Deployed' },
      ],
    },
    {
      key: 'type',
      label: 'Disaster Type',
      type: 'chips',
      options: DISASTER_TYPES.map((t) => ({ value: t.value, label: t.label })),
    },
    {
      key: 'minSeverity',
      label: 'Minimum Severity',
      type: 'range',
      min: 1,
      max: 10,
    },
  ];

  // Get severity badge
  const getSeverityBadge = (severity) => {
    if (severity >= 8) return 'badge-danger';
    if (severity >= 4) return 'badge-warning';
    return 'badge-success';
  };

  return (
    <div>
      <PageHeader
        title="Disaster Requests"
        subtitle="View and manage all incoming disaster reports"
      />

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <SearchBar
          value={filters.search}
          onChange={handleSearch}
          onClear={() => handleSearch('')}
          placeholder="Search by location, ID, or type..."
          className="flex-1"
        />
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowFilters(true)}
          className="btn-secondary flex items-center gap-2"
        >
          <Filter className="w-4 h-4" />
          Filters
          {(filters.status || filters.type) && (
            <span className="w-2 h-2 bg-primary-500 rounded-full" />
          )}
        </motion.button>
      </div>

      {/* Filter Panel */}
      <FilterPanel
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filterOptions}
        values={filters}
        onChange={(key, value) => setFilters({ [key]: value })}
        onClear={resetFilters}
        onApply={() => setShowFilters(false)}
      />

      {/* Table */}
      {isLoadingDisasters ? (
        <SkeletonLoader type="table" />
      ) : disasters.length === 0 ? (
        <EmptyState
          type="search"
          title="No disasters found"
          description="Try adjusting your search or filter criteria"
          action={resetFilters}
          actionLabel="Clear Filters"
        />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="table-container overflow-x-auto"
        >
          <table className="w-full">
            <thead className="table-header">
              <tr>
                <th className="px-6 py-4 text-left">
                  <button
                    onClick={() => handleSort('id')}
                    className="flex items-center gap-2 text-sm font-semibold text-dark-300 hover:text-white"
                  >
                    Request ID
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-4 text-left">
                  <button
                    onClick={() => handleSort('location')}
                    className="flex items-center gap-2 text-sm font-semibold text-dark-300 hover:text-white"
                  >
                    Location
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-4 text-left">
                  <span className="text-sm font-semibold text-dark-300">Type</span>
                </th>
                <th className="px-6 py-4 text-left">
                  <button
                    onClick={() => handleSort('severity')}
                    className="flex items-center gap-2 text-sm font-semibold text-dark-300 hover:text-white"
                  >
                    Severity
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-4 text-left">
                  <button
                    onClick={() => handleSort('livesImpacted')}
                    className="flex items-center gap-2 text-sm font-semibold text-dark-300 hover:text-white"
                  >
                    Lives Impacted
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-4 text-left">
                  <span className="text-sm font-semibold text-dark-300">Status</span>
                </th>
                <th className="px-6 py-4 text-left">
                  <span className="text-sm font-semibold text-dark-300">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {disasters.map((disaster, index) => (
                <motion.tr
                  key={disaster.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="table-row"
                >
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm text-primary-400">{disaster.id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-dark-400" />
                      <span className="text-white">{disaster.location}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-dark-300">{disaster.type}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`${getSeverityBadge(disaster.severity)}`}>
                      {disaster.severity}/10
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-dark-400" />
                      <span className="text-white">{formatNumber(disaster.livesImpacted)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`${getStatusBadgeClass(disaster.status?.toLowerCase())}`}>
                      {disaster.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Link to={`/admin/request/${disaster.id}`}>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </motion.button>
                    </Link>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="p-4 border-t border-dark-700 flex items-center justify-between">
            <p className="text-sm text-dark-400">
              Showing {(disastersPagination.page - 1) * disastersPagination.limit + 1} to{' '}
              {Math.min(
                disastersPagination.page * disastersPagination.limit,
                disastersPagination.total
              )}{' '}
              of {disastersPagination.total} requests
            </p>
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handlePageChange(disastersPagination.page - 1)}
                disabled={disastersPagination.page === 1}
                className="p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </motion.button>
              
              {Array.from({ length: disastersPagination.totalPages }, (_, i) => i + 1)
                .filter(
                  (page) =>
                    page === 1 ||
                    page === disastersPagination.totalPages ||
                    Math.abs(page - disastersPagination.page) <= 1
                )
                .map((page, index, arr) => (
                  <span key={page}>
                    {index > 0 && arr[index - 1] !== page - 1 && (
                      <span className="text-dark-500 px-2">...</span>
                    )}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handlePageChange(page)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                        page === disastersPagination.page
                          ? 'bg-primary-500 text-white'
                          : 'text-dark-400 hover:text-white hover:bg-dark-700'
                      }`}
                    >
                      {page}
                    </motion.button>
                  </span>
                ))}

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handlePageChange(disastersPagination.page + 1)}
                disabled={disastersPagination.page === disastersPagination.totalPages}
                className="p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AdminRequests;
