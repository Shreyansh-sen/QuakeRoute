import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  MapPin,
  AlertTriangle,
  Users,
  FileText,
  Clock,
  Check,
  Send,
  Package,
} from 'lucide-react';
import {
  PageHeader,
  MapSelector,
  ResourceCard,
  SkeletonLoader,
  LoadingOverlay,
  useToast,
} from '@shared/components';
import { formatNumber, formatDate, getSeverityClass } from '@shared/utils';
import { getSeverityColor } from '@shared/constants';
import { useAdminStore } from '@admin/store';
import { adminService } from '@api';

const AdminRequestDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const {
    selectedDisaster,
    setSelectedDisaster,
    availableResources,
    setAvailableResources,
    allocationInputs,
    setAllocationInput,
    selectedResourceIds,
    toggleResourceSelection,
    isResourceSelected,
    buildAllocationPayload,
    clearAllocationInputs,
    isLoadingResources,
    setLoadingResources,
    isSubmittingAllocation,
    setSubmittingAllocation,
  } = useAdminStore();

  const [isLoadingDetails, setIsLoadingDetails] = useState(true);

  // Fetch disaster details
  useEffect(() => {
    const fetchDetails = async () => {
      setIsLoadingDetails(true);
      try {
        const disaster = await adminService.getDisasterDetails(id);
        setSelectedDisaster(disaster);
      } catch (error) {
        toast.error('Failed to fetch disaster details');
        console.error(error);
      } finally {
        setIsLoadingDetails(false);
      }
    };

    fetchDetails();

    return () => {
      setSelectedDisaster(null);
      clearAllocationInputs();
    };
  }, [id]);

  // Fetch resources
  useEffect(() => {
    const fetchResources = async () => {
      setLoadingResources(true);
      try {
        const response = await adminService.getResources(id);
        setAvailableResources(response.resources || []);
      } catch (error) {
        toast.error('Failed to fetch resources');
        console.error(error);
      } finally {
        setLoadingResources(false);
      }
    };

    if (selectedDisaster) {
      fetchResources();
    }
  }, [selectedDisaster]);

  // Handle allocation submission
  const handleSubmitAllocation = async () => {
    const payload = buildAllocationPayload();
    
    if (!payload || payload.allocations.length === 0) {
      toast.error('Please select resources and enter allocation details');
      return;
    }

    setSubmittingAllocation(true);
    try {
      await adminService.submitAllocation(payload);
      toast.success('Allocation submitted successfully!');
      navigate('/admin/allocations');
    } catch (error) {
      toast.error('Failed to submit allocation');
      console.error(error);
    } finally {
      setSubmittingAllocation(false);
    }
  };

  // Handle allocation input change
  const handleAllocationChange = (resourceId, field, value) => {
    setAllocationInput(resourceId, field, value);
  };

  if (isLoadingDetails) {
    return (
      <div>
        <PageHeader title="Loading..." showBack backPath="/admin/requests" />
        <SkeletonLoader type="form" />
      </div>
    );
  }

  if (!selectedDisaster) {
    return (
      <div>
        <PageHeader title="Request Not Found" showBack backPath="/admin/requests" />
        <div className="glass-card p-12 text-center">
          <AlertTriangle className="w-16 h-16 text-dark-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Disaster Not Found</h2>
          <p className="text-dark-400">The requested disaster report could not be found.</p>
        </div>
      </div>
    );
  }

  const severityColor = getSeverityColor(selectedDisaster.severity);

  return (
    <div>
      {isSubmittingAllocation && <LoadingOverlay message="Submitting allocation..." />}

      <PageHeader
        title={`Request ${selectedDisaster.id}`}
        subtitle={`${selectedDisaster.type} - ${selectedDisaster.location}`}
        showBack
        backPath="/admin/requests"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Disaster Details Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6"
          >
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-primary-400" />
              Disaster Details
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-dark-800/50 rounded-xl">
                <p className="text-dark-400 text-sm mb-1">Type</p>
                <p className="text-white font-semibold">{selectedDisaster.type}</p>
              </div>
              <div className="p-4 bg-dark-800/50 rounded-xl">
                <p className="text-dark-400 text-sm mb-1">Severity</p>
                <p className="font-semibold" style={{ color: severityColor }}>
                  {selectedDisaster.severity}/10
                </p>
              </div>
              <div className="p-4 bg-dark-800/50 rounded-xl">
                <p className="text-dark-400 text-sm mb-1">Lives Impacted</p>
                <p className="text-white font-semibold">{formatNumber(selectedDisaster.livesImpacted)}</p>
              </div>
              <div className="p-4 bg-dark-800/50 rounded-xl">
                <p className="text-dark-400 text-sm mb-1">Status</p>
                <span className={`${getSeverityClass(selectedDisaster.severity)} font-semibold`}>
                  {selectedDisaster.status}
                </span>
              </div>
            </div>

            {/* Location */}
            <div className="mb-6">
              <div className="flex items-center gap-2 text-dark-400 mb-2">
                <MapPin className="w-4 h-4" />
                <span>Location</span>
              </div>
              <p className="text-white">{selectedDisaster.location}</p>
            </div>

            {/* Notes */}
            {selectedDisaster.notes && (
              <div>
                <div className="flex items-center gap-2 text-dark-400 mb-2">
                  <FileText className="w-4 h-4" />
                  <span>Notes</span>
                </div>
                <p className="text-dark-300">{selectedDisaster.notes}</p>
              </div>
            )}
          </motion.div>

          {/* Map */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <MapSelector
              markers={[
                {
                  lat: selectedDisaster.latitude,
                  lng: selectedDisaster.longitude,
                  address: selectedDisaster.location,
                  disasterType: selectedDisaster.type,
                  severity: selectedDisaster.severity,
                },
              ]}
              height="300px"
              editable={false}
              showSearch={false}
            />
          </motion.div>

          {/* Resource Allocation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-6"
          >
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-400" />
              Available Resources
            </h2>

            {isLoadingResources ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SkeletonLoader type="card" count={4} />
              </div>
            ) : availableResources.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-dark-500 mx-auto mb-3" />
                <p className="text-dark-400">No resources available</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableResources.map((resource) => (
                  <ResourceCard
                    key={resource.resourceId}
                    resource={resource}
                    isSelected={isResourceSelected(resource.resourceId)}
                    onSelect={toggleResourceSelection}
                    allocation={allocationInputs[resource.resourceId] || {}}
                    onAllocationChange={handleAllocationChange}
                    showAllocationInputs={true}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Timeline */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card p-6"
          >
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-dark-400" />
              Timeline
            </h3>
            <div className="space-y-4">
              {selectedDisaster.timeline?.map((event, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      event.completed
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-dark-700 text-dark-400'
                    }`}
                  >
                    {event.completed ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <span className="w-2 h-2 bg-dark-500 rounded-full" />
                    )}
                  </div>
                  <div>
                    <p className={`font-medium ${event.completed ? 'text-white' : 'text-dark-400'}`}>
                      {event.stage}
                    </p>
                    {event.timestamp && (
                      <p className="text-xs text-dark-500">{formatDate(event.timestamp)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Allocation Summary */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-6"
          >
            <h3 className="font-semibold text-white mb-4">Allocation Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-dark-400">Selected Resources</span>
                <span className="text-white font-semibold">{selectedResourceIds.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Total Assets</span>
                <span className="text-white font-semibold">
                  {Object.values(allocationInputs).reduce((sum, a) => sum + (a.assets || 0), 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">Total Personnel</span>
                <span className="text-white font-semibold">
                  {Object.values(allocationInputs).reduce((sum, a) => sum + (a.humans || 0), 0)}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Submit Button */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmitAllocation}
            disabled={selectedResourceIds.length === 0 || isSubmittingAllocation}
            className="btn-primary w-full py-4 flex items-center justify-center gap-2"
          >
            <Send className="w-5 h-5" />
            Submit Allocation
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default AdminRequestDetail;
