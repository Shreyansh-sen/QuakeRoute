import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import {
  MapPin,
  AlertTriangle,
  Trash2,
  Edit2,
  Plus,
  Send,
  Users,
  FileText,
  ChevronDown,
  X,
  Check,
} from 'lucide-react';
import { 
  PageHeader, 
  MapSelector, 
  SeveritySlider,
  LoadingOverlay,
  useToast,
} from '@shared/components';
import { DISASTER_TYPES, fadeInUp, staggerContainer } from '@shared/constants';
import { formatNumber, getSeverityClass } from '@shared/utils';
import { useDisasterStore, useAllocationStore } from '@user/store';
import { disasterService } from '@api';

const ReportDisaster = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const {
    disasterNodes,
    addDisasterNode,
    updateDisasterNode,
    removeDisasterNode,
    isSubmitting,
    setSubmitting,
    setRequestId,
    clearDisasterNodes,
    getTotalLivesImpacted,
    getAverageSeverity,
  } = useDisasterStore();

  const { setCurrentRequest } = useAllocationStore();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      disasterType: '',
      severity: 5,
      livesImpacted: '',
      notes: '',
    },
  });

  const severity = watch('severity');
  const [pendingLocation, setPendingLocation] = useState(null);

  // Handle marker added on map
  const handleMarkerAdd = (location) => {
    setPendingLocation(location);
    setShowForm(true);
    setEditingId(null);
    reset({
      disasterType: '',
      severity: 5,
      livesImpacted: '',
      notes: '',
    });
  };

  // Handle marker removed
  const handleMarkerRemove = (index) => {
    removeDisasterNode(index);
    toast.info('Location removed');
  };

  // Edit existing node
  const handleEdit = (index) => {
    const node = disasterNodes[index];
    setEditingId(index);
    setPendingLocation({
      lat: node.latitude,
      lng: node.longitude,
      address: node.address,
    });
    setValue('disasterType', node.disasterType);
    setValue('severity', node.severity);
    setValue('livesImpacted', node.livesImpacted);
    setValue('notes', node.notes);
    setShowForm(true);
  };

  // Form submission
  const onFormSubmit = (data) => {
    if (!pendingLocation) {
      toast.error('Please select a location on the map');
      return;
    }

    const nodeData = {
      latitude: pendingLocation.lat,
      longitude: pendingLocation.lng,
      address: pendingLocation.address,
      disasterType: data.disasterType,
      severity: data.severity,
      livesImpacted: parseInt(data.livesImpacted),
      notes: data.notes,
    };

    if (editingId !== null) {
      updateDisasterNode(editingId, nodeData);
      toast.success('Disaster node updated');
    } else {
      addDisasterNode(nodeData);
      toast.success('Disaster node added');
    }

    setShowForm(false);
    setPendingLocation(null);
    setEditingId(null);
    reset();
  };

  // Submit all disaster reports - Real API call
  const handleSubmitRequest = async () => {
    if (disasterNodes.length === 0) {
      toast.error('Please add at least one disaster location');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        disasterNodes: disasterNodes.map((node) => ({
          latitude: node.latitude,
          longitude: node.longitude,
          address: node.address,
          disasterType: node.disasterType,
          severity: node.severity,
          livesImpacted: node.livesImpacted,
          notes: node.notes,
        })),
      };

      // Make real API call to backend
      const response = await disasterService.submitRequest(payload);
      
      // Handle successful response
      const createdCount = response?.count || response?.created?.length || disasterNodes.length;
      
      toast.success(`Successfully submitted ${createdCount} disaster report(s)!`);
      
      // Clear the disaster nodes after successful submission
      clearDisasterNodes();
      
      // Navigate to dashboard or stay on page
      navigate('/');
    } catch (error) {
      console.error('Failed to submit disaster report:', error);
      
      // Show detailed error message
      const errorMessage = error?.response?.data?.detail || 
                          error?.message || 
                          'Failed to submit report. Please try again.';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      {isSubmitting && <LoadingOverlay message="Submitting disaster report..." />}

      <PageHeader
        title="Report Disaster"
        subtitle="Mark disaster locations on the map and provide details"
        showBack
        backPath="/"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Section */}
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <MapSelector
              markers={disasterNodes.map((node) => ({
                lat: node.latitude,
                lng: node.longitude,
                address: node.address,
                disasterType: node.disasterType,
                severity: node.severity,
                color: node.severity >= 8 ? '#ef4444' : node.severity >= 4 ? '#f97316' : '#22c55e',
              }))}
              onMarkerAdd={handleMarkerAdd}
              onMarkerRemove={handleMarkerRemove}
              height="500px"
              editable={!showForm}
            />
          </motion.div>

          {/* Form Modal */}
          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="mt-4"
              >
                <div className="glass-card p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary-500/20 rounded-lg">
                        <FileText className="w-5 h-5 text-primary-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {editingId !== null ? 'Edit Disaster Details' : 'Add Disaster Details'}
                        </h3>
                        <p className="text-sm text-dark-400">{pendingLocation?.address}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowForm(false);
                        setPendingLocation(null);
                        setEditingId(null);
                      }}
                      className="p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
                    {/* Disaster Type */}
                    <div>
                      <label className="label-text">Disaster Type</label>
                      <div className="relative">
                        <select
                          {...register('disasterType', { required: 'Please select a disaster type' })}
                          className="select-field pr-10"
                        >
                          <option value="">Select disaster type</option>
                          {DISASTER_TYPES.map((type) => (
                            <option key={type.value} value={type.label}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400 pointer-events-none" />
                      </div>
                      {errors.disasterType && (
                        <p className="text-red-400 text-sm mt-1">{errors.disasterType.message}</p>
                      )}
                    </div>

                    {/* Severity */}
                    <div>
                      <SeveritySlider
                        value={severity}
                        onChange={(val) => setValue('severity', val)}
                      />
                    </div>

                    {/* Lives Impacted */}
                    <div>
                      <label className="label-text flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Number of Lives Impacted
                      </label>
                      <input
                        type="number"
                        {...register('livesImpacted', {
                          required: 'Please enter the number of lives impacted',
                          min: { value: 1, message: 'Must be at least 1' },
                        })}
                        placeholder="e.g., 500"
                        className="input-field"
                      />
                      {errors.livesImpacted && (
                        <p className="text-red-400 text-sm mt-1">{errors.livesImpacted.message}</p>
                      )}
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="label-text">Additional Notes</label>
                      <textarea
                        {...register('notes')}
                        rows={3}
                        placeholder="Any additional information about the disaster..."
                        className="input-field resize-none"
                      />
                    </div>

                    {/* Form Actions */}
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowForm(false);
                          setPendingLocation(null);
                          setEditingId(null);
                        }}
                        className="btn-secondary flex-1"
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
                        <Check className="w-4 h-4" />
                        {editingId !== null ? 'Update' : 'Add'} Location
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar - Disaster List */}
        <div className="space-y-4">
          {/* Summary Stats */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card p-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-dark-800/50 rounded-xl">
                <p className="text-2xl font-bold text-white">{disasterNodes.length}</p>
                <p className="text-xs text-dark-400">Locations</p>
              </div>
              <div className="text-center p-3 bg-dark-800/50 rounded-xl">
                <p className="text-2xl font-bold text-primary-400">{formatNumber(getTotalLivesImpacted())}</p>
                <p className="text-xs text-dark-400">Lives Impacted</p>
              </div>
            </div>
          </motion.div>

          {/* Disaster Nodes List */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card"
          >
            <div className="p-4 border-b border-dark-700">
              <h3 className="font-semibold text-white">Disaster Locations</h3>
              <p className="text-sm text-dark-400">Click map to add locations</p>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {disasterNodes.length === 0 ? (
                <div className="p-8 text-center">
                  <MapPin className="w-12 h-12 text-dark-600 mx-auto mb-3" />
                  <p className="text-dark-400">No locations added yet</p>
                  <p className="text-dark-500 text-sm">Click on the map to add</p>
                </div>
              ) : (
                <motion.div variants={staggerContainer} initial="initial" animate="animate">
                  {disasterNodes.map((node, index) => (
                    <motion.div
                      key={node.id}
                      variants={fadeInUp}
                      className="p-4 border-b border-dark-700/50 hover:bg-dark-800/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`w-2 h-2 rounded-full ${getSeverityClass(node.severity)} bg-current`} />
                            <span className="text-white font-medium truncate">{node.disasterType}</span>
                          </div>
                          <p className="text-sm text-dark-400 truncate">{node.address}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-dark-500">
                            <span>Severity: {node.severity}/10</span>
                            <span>•</span>
                            <span>{formatNumber(node.livesImpacted)} affected</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEdit(index)}
                            className="p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleMarkerRemove(index)}
                            className="p-2 text-dark-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Submit Button */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmitRequest}
            disabled={disasterNodes.length === 0 || isSubmitting}
            className="btn-primary w-full flex items-center justify-center gap-2 py-4"
          >
            <Send className="w-5 h-5" />
            Submit Disaster Report
            {disasterNodes.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-sm">
                {disasterNodes.length}
              </span>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default ReportDisaster;
