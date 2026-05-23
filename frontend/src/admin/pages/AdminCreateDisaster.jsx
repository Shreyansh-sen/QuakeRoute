import { useState, useEffect } from 'react';
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
  Search,
  RefreshCw,
  Database,
  Layers,
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
import { useAdminStore } from '@admin/store';
import { adminService } from '@api';

const RESOURCE_TYPES = [
  { value: 'hospital', label: 'Hospital' },
  { value: 'fire_station', label: 'Fire Station' },
  { value: 'police', label: 'Police Station' },
  { value: 'shelter', label: 'Shelter' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'ngo_center', label: 'NGO Center' },
];

const AdminCreateDisaster = () => {
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [disasterNodes, setDisasterNodes] = useState([]);
  const [pendingLocation, setPendingLocation] = useState(null);
  
  // Discovery configuration
  const [discoveryConfig, setDiscoveryConfig] = useState({
    radius_km: 10,
    resource_types: [],
    page: 1,
    page_size: 50,
  });

  const {
    createdDisasterResponse,
    listDisastersResponse,
    discoverResourcesResponse,
    lastCreatedDisasterIds,
    isCreatingDisaster,
    setCreatingDisaster,
    setDisasterCreationFlowResponses,
    clearDisasterCreationFlowResponses,
  } = useAdminStore();

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

  // Clear responses on unmount
  useEffect(() => {
    return () => {
      clearDisasterCreationFlowResponses();
    };
  }, []);

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
    setDisasterNodes((prev) => prev.filter((_, i) => i !== index));
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
      id: editingId !== null ? disasterNodes[editingId].id : Date.now(),
      latitude: pendingLocation.lat,
      longitude: pendingLocation.lng,
      address: pendingLocation.address,
      disasterType: data.disasterType,
      severity: data.severity,
      livesImpacted: parseInt(data.livesImpacted),
      notes: data.notes,
    };

    if (editingId !== null) {
      setDisasterNodes((prev) => 
        prev.map((node, i) => (i === editingId ? nodeData : node))
      );
      toast.success('Disaster node updated');
    } else {
      setDisasterNodes((prev) => [...prev, nodeData]);
      toast.success('Disaster node added');
    }

    setShowForm(false);
    setPendingLocation(null);
    setEditingId(null);
    reset();
  };

  // Toggle resource type selection
  const toggleResourceType = (type) => {
    setDiscoveryConfig((prev) => ({
      ...prev,
      resource_types: prev.resource_types.includes(type)
        ? prev.resource_types.filter((t) => t !== type)
        : [...prev.resource_types, type],
    }));
  };

  // Submit disaster and fetch related data
  const handleSubmitDisaster = async () => {
    if (disasterNodes.length === 0) {
      toast.error('Please add at least one disaster location');
      return;
    }

    setCreatingDisaster(true);
    clearDisasterCreationFlowResponses();

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

      // Call the combined API that creates disaster and fetches list + resources
      const response = await adminService.createDisasterAndFetchData(payload, {
        radius_km: discoveryConfig.radius_km,
        resource_types: discoveryConfig.resource_types.length > 0 ? discoveryConfig.resource_types : null,
        page: discoveryConfig.page,
        page_size: discoveryConfig.page_size,
      });

      // Store all responses in the admin store
      setDisasterCreationFlowResponses(response);

      toast.success('Disaster created and resources discovered successfully!');
      
      // Clear the form
      setDisasterNodes([]);
    } catch (error) {
      toast.error('Failed to create disaster. Please try again.');
      console.error(error);
    } finally {
      setCreatingDisaster(false);
    }
  };

  const getTotalLivesImpacted = () => 
    disasterNodes.reduce((sum, node) => sum + (node.livesImpacted || 0), 0);

  return (
    <div className="page-container">
      {isCreatingDisaster && (
        <LoadingOverlay message="Creating disaster and discovering resources..." />
      )}

      <PageHeader
        title="Create Disaster"
        subtitle="Create disaster areas and discover nearby resources"
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Panel - Map and Form */}
        <div className="xl:col-span-2 space-y-6">
          {/* Map Section */}
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
              height="400px"
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

          {/* Discovery Configuration */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Search className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Resource Discovery Settings</h3>
                <p className="text-sm text-dark-400">Configure how resources are discovered</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Radius */}
              <div>
                <label className="label-text">Search Radius (km)</label>
                <input
                  type="number"
                  value={discoveryConfig.radius_km}
                  onChange={(e) => setDiscoveryConfig((prev) => ({
                    ...prev,
                    radius_km: parseInt(e.target.value) || 10,
                  }))}
                  min={1}
                  max={100}
                  className="input-field"
                />
              </div>

              {/* Page Size */}
              <div>
                <label className="label-text">Page Size (Pagination)</label>
                <input
                  type="number"
                  value={discoveryConfig.page_size}
                  onChange={(e) => setDiscoveryConfig((prev) => ({
                    ...prev,
                    page_size: parseInt(e.target.value) || 50,
                  }))}
                  min={1}
                  max={100}
                  className="input-field"
                />
              </div>
            </div>

            {/* Resource Types */}
            <div className="mt-4">
              <label className="label-text mb-2 block">Resource Types (leave empty for all)</label>
              <div className="flex flex-wrap gap-2">
                {RESOURCE_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => toggleResourceType(type.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      discoveryConfig.resource_types.includes(type.value)
                        ? 'bg-primary-500 text-white'
                        : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Panel - Disaster List & Actions */}
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

            <div className="max-h-[300px] overflow-y-auto">
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
            onClick={handleSubmitDisaster}
            disabled={disasterNodes.length === 0 || isCreatingDisaster}
            className="btn-primary w-full flex items-center justify-center gap-2 py-4"
          >
            <Send className="w-5 h-5" />
            Create Disaster & Discover Resources
            {disasterNodes.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-sm">
                {disasterNodes.length}
              </span>
            )}
          </motion.button>
        </div>
      </div>

      {/* API Response Display */}
      {(createdDisasterResponse || listDisastersResponse || discoverResourcesResponse) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 space-y-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Database className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">API Responses (JSON)</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Created Disaster Response */}
            {createdDisasterResponse && (
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-orange-400" />
                  <h3 className="font-semibold text-white">Create Disaster Response</h3>
                </div>
                <pre className="bg-dark-900 rounded-lg p-4 overflow-auto max-h-[400px] text-sm text-green-400">
                  {JSON.stringify(createdDisasterResponse, null, 2)}
                </pre>
              </div>
            )}

            {/* List Disasters Response */}
            {listDisastersResponse && (
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Layers className="w-5 h-5 text-purple-400" />
                  <h3 className="font-semibold text-white">List Disasters Response (Paginated)</h3>
                </div>
                <pre className="bg-dark-900 rounded-lg p-4 overflow-auto max-h-[400px] text-sm text-purple-400">
                  {JSON.stringify(listDisastersResponse, null, 2)}
                </pre>
              </div>
            )}

            {/* Discover Resources Response */}
            {discoverResourcesResponse && (
              <div className="glass-card p-4 lg:col-span-2">
                <div className="flex items-center gap-2 mb-3">
                  <Search className="w-5 h-5 text-green-400" />
                  <h3 className="font-semibold text-white">Discover Resources Response</h3>
                </div>
                <pre className="bg-dark-900 rounded-lg p-4 overflow-auto max-h-[400px] text-sm text-cyan-400">
                  {JSON.stringify(discoverResourcesResponse, null, 2)}
                </pre>
              </div>
            )}

            {/* Disaster IDs */}
            {lastCreatedDisasterIds.length > 0 && (
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Database className="w-5 h-5 text-yellow-400" />
                  <h3 className="font-semibold text-white">Created Disaster IDs</h3>
                </div>
                <pre className="bg-dark-900 rounded-lg p-4 overflow-auto max-h-[200px] text-sm text-yellow-400">
                  {JSON.stringify(lastCreatedDisasterIds, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AdminCreateDisaster;
