// Mock data generators and utilities
import { sleep } from '@shared/utils';

// Simulate network latency (300-800ms)
const simulateLatency = () => sleep(Math.random() * 500 + 300);

// Generate random ID
const generateId = (prefix) => `${prefix}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

// Mock disaster locations in India
const mockLocations = [
  { city: 'Delhi', lat: 28.6139, lng: 77.2090 },
  { city: 'Mumbai', lat: 19.0760, lng: 72.8777 },
  { city: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { city: 'Kolkata', lat: 22.5726, lng: 88.3639 },
  { city: 'Bangalore', lat: 12.9716, lng: 77.5946 },
  { city: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
  { city: 'Ahmedabad', lat: 23.0225, lng: 72.5714 },
  { city: 'Pune', lat: 18.5204, lng: 73.8567 },
  { city: 'Jaipur', lat: 26.9124, lng: 75.7873 },
  { city: 'Lucknow', lat: 26.8467, lng: 80.9462 },
];

// Mock resource centers
const mockResourceCenters = [
  { id: 'R001', name: 'Central Medical Camp', type: 'medical', inventory: 500 },
  { id: 'R002', name: 'Food Distribution Hub A', type: 'food', inventory: 2000 },
  { id: 'R003', name: 'Emergency Shelter Zone', type: 'shelter', inventory: 300 },
  { id: 'R004', name: 'Water Supply Station', type: 'water', inventory: 10000 },
  { id: 'R005', name: 'Medical Camp B', type: 'medical', inventory: 350 },
  { id: 'R006', name: 'Rescue Equipment Depot', type: 'equipment', inventory: 150 },
  { id: 'R007', name: 'Food Warehouse B', type: 'food', inventory: 800 },
  { id: 'R008', name: 'Temporary Housing Unit', type: 'shelter', inventory: 200 },
];

const disasterTypes = ['Flood', 'Earthquake', 'Cyclone', 'Landslide', 'Fire', 'Tsunami', 'Pandemic'];
const statuses = ['Pending', 'In Progress', 'Allocated', 'Deployed'];

// Generate mock disasters
const generateMockDisasters = (count = 10) => {
  return Array.from({ length: count }, (_, i) => {
    const location = mockLocations[Math.floor(Math.random() * mockLocations.length)];
    return {
      id: `REQ${String(i + 1).padStart(5, '0')}`,
      location: location.city,
      latitude: location.lat + (Math.random() - 0.5) * 0.5,
      longitude: location.lng + (Math.random() - 0.5) * 0.5,
      type: disasterTypes[Math.floor(Math.random() * disasterTypes.length)],
      severity: Math.floor(Math.random() * 10) + 1,
      livesImpacted: Math.floor(Math.random() * 5000) + 100,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      notes: 'Emergency assistance required immediately.',
      createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });
};

// In-memory store for mock data
let mockDisasters = generateMockDisasters(15);
let allocationProgress = {};

// ============================================
// USER API ENDPOINTS
// ============================================

// POST /api/disaster/request - Submit disaster request
export const submitDisasterRequest = async (payload) => {
  await simulateLatency();
  
  const requestId = generateId('REQ');
  
  // Add disasters to mock store
  payload.disasterNodes.forEach((node, index) => {
    mockDisasters.push({
      id: `${requestId}-${index + 1}`,
      requestId,
      location: node.address,
      latitude: node.latitude,
      longitude: node.longitude,
      type: node.disasterType,
      severity: node.severity,
      livesImpacted: node.livesImpacted,
      notes: node.notes,
      status: 'Pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  // Initialize allocation progress
  allocationProgress[requestId] = {
    stage: 1,
    status: 'Disaster Registered',
    progress: 10,
    startedAt: Date.now(),
  };

  return {
    requestId,
    message: 'Disaster request submitted successfully',
    timestamp: new Date().toISOString(),
  };
};

// GET /api/allocation/status/:requestId - Get allocation status
export const getAllocationStatus = async (requestId) => {
  await simulateLatency();

  if (!allocationProgress[requestId]) {
    // Create new progress for demo purposes
    allocationProgress[requestId] = {
      stage: 1,
      status: 'Disaster Registered',
      progress: 10,
      startedAt: Date.now(),
    };
  }

  const progress = allocationProgress[requestId];
  const elapsed = Date.now() - progress.startedAt;
  
  // Simulate progress over time (complete in ~30 seconds)
  const stages = [
    { stage: 1, status: 'Disaster Registered', progress: 10, time: 0 },
    { stage: 2, status: 'Resource Search Started', progress: 25, time: 4000 },
    { stage: 3, status: 'Nearby Resource Nodes Found', progress: 40, time: 8000 },
    { stage: 4, status: 'Inventory Analysis Running', progress: 55, time: 12000 },
    { stage: 5, status: 'Quantum Optimization Running', progress: 70, time: 18000 },
    { stage: 6, status: 'Allocation Generated', progress: 90, time: 24000 },
    { stage: 7, status: 'Deployment Ready', progress: 100, time: 30000 },
  ];

  let currentStage = stages[0];
  for (const stage of stages) {
    if (elapsed >= stage.time) {
      currentStage = stage;
    }
  }

  allocationProgress[requestId] = {
    ...progress,
    ...currentStage,
  };

  return {
    requestId,
    stage: currentStage.stage,
    status: currentStage.status,
    progress: currentStage.progress,
    isComplete: currentStage.stage === 7,
    estimatedTime: currentStage.stage < 7 ? `${Math.ceil((30000 - elapsed) / 1000)}s remaining` : 'Complete',
    timestamp: new Date().toISOString(),
  };
};

// ============================================
// ADMIN API ENDPOINTS
// ============================================

// GET /api/admin/disasters - Get all disaster requests
export const getAdminDisasters = async (params = {}) => {
  await simulateLatency();

  let filtered = [...mockDisasters];

  // Apply filters
  if (params.status) {
    filtered = filtered.filter((d) => d.status.toLowerCase() === params.status.toLowerCase());
  }
  if (params.type) {
    filtered = filtered.filter((d) => d.type.toLowerCase() === params.type.toLowerCase());
  }
  if (params.search) {
    const search = params.search.toLowerCase();
    filtered = filtered.filter(
      (d) =>
        d.location.toLowerCase().includes(search) ||
        d.id.toLowerCase().includes(search) ||
        d.type.toLowerCase().includes(search)
    );
  }

  // Sort
  if (params.sortBy) {
    filtered.sort((a, b) => {
      const aVal = a[params.sortBy];
      const bVal = b[params.sortBy];
      const order = params.sortOrder === 'desc' ? -1 : 1;
      
      if (typeof aVal === 'number') return (aVal - bVal) * order;
      return String(aVal).localeCompare(String(bVal)) * order;
    });
  }

  // Pagination
  const page = params.page || 1;
  const limit = params.limit || 10;
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginated = filtered.slice(start, end);

  return {
    data: paginated,
    pagination: {
      page,
      limit,
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / limit),
    },
  };
};

// GET /api/admin/disasters/:id - Get single disaster details
export const getDisasterDetails = async (id) => {
  await simulateLatency();

  const disaster = mockDisasters.find((d) => d.id === id);
  
  if (!disaster) {
    throw new Error('Disaster not found');
  }

  return {
    ...disaster,
    timeline: [
      { stage: 'Reported', timestamp: disaster.createdAt, completed: true },
      { stage: 'Under Review', timestamp: new Date().toISOString(), completed: disaster.status !== 'Pending' },
      { stage: 'Resources Allocated', timestamp: null, completed: disaster.status === 'Allocated' || disaster.status === 'Deployed' },
      { stage: 'Deployed', timestamp: null, completed: disaster.status === 'Deployed' },
    ],
  };
};

// GET /api/admin/resources/:requestId - Get available resources for allocation
export const getResourcesForAllocation = async (requestId) => {
  await simulateLatency();

  const disaster = mockDisasters.find((d) => d.id === requestId || d.requestId === requestId);
  
  // Generate random nearby resources
  const resources = mockResourceCenters.map((center, index) => {
    const distance = (Math.random() * 20 + 2).toFixed(1);
    return {
      resourceId: center.id,
      name: center.name,
      type: center.type,
      distance: `${distance} km`,
      distanceValue: parseFloat(distance),
      inventoryAvailable: center.inventory + Math.floor(Math.random() * 200),
      personnelAvailable: Math.floor(Math.random() * 50) + 10,
      estimatedArrival: `${Math.ceil(parseFloat(distance) * 3)} min`,
      coordinates: {
        lat: (disaster?.latitude || 28.6139) + (Math.random() - 0.5) * 0.3,
        lng: (disaster?.longitude || 77.2090) + (Math.random() - 0.5) * 0.3,
      },
    };
  });

  // Sort by distance
  resources.sort((a, b) => a.distanceValue - b.distanceValue);

  return {
    requestId,
    resources: resources.slice(0, 6),
    disaster,
  };
};

// POST /api/admin/allocation - Submit resource allocation
export const submitAllocation = async (payload) => {
  await simulateLatency();

  // Update disaster status
  const disaster = mockDisasters.find((d) => d.id === payload.requestId);
  if (disaster) {
    disaster.status = 'Allocated';
    disaster.updatedAt = new Date().toISOString();
  }

  return {
    success: true,
    message: 'Allocation submitted successfully',
    allocationId: generateId('ALLOC'),
    requestId: payload.requestId,
    allocations: payload.allocations,
    timestamp: new Date().toISOString(),
  };
};

// GET /api/dashboard/stats - Get dashboard statistics
export const getDashboardStats = async () => {
  await simulateLatency();

  const stats = {
    totalRequests: mockDisasters.length,
    activeAllocations: mockDisasters.filter((d) => d.status === 'In Progress' || d.status === 'Allocated').length,
    pendingRequests: mockDisasters.filter((d) => d.status === 'Pending').length,
    deployedMissions: mockDisasters.filter((d) => d.status === 'Deployed').length,
    availableResources: mockResourceCenters.reduce((sum, r) => sum + r.inventory, 0),
    personnelAvailable: Math.floor(Math.random() * 500) + 200,
    criticalZones: mockDisasters.filter((d) => d.severity >= 8).length,
    averageResponseTime: '23 min',
    
    // Trends (compared to last period)
    trends: {
      totalRequests: { value: 12, positive: false },
      activeAllocations: { value: 8, positive: true },
      availableResources: { value: 5, positive: true },
      responseTime: { value: 15, positive: true },
    },

    // Recent activity
    recentActivity: [
      { type: 'request', message: 'New flood report in Mumbai', time: '2 min ago' },
      { type: 'allocation', message: 'Resources allocated to Delhi', time: '15 min ago' },
      { type: 'deployment', message: 'Team deployed to Chennai', time: '1 hour ago' },
      { type: 'request', message: 'Earthquake alert in Jaipur', time: '2 hours ago' },
    ],
  };

  return stats;
};

// GET /api/dashboard/charts - Get chart data for analytics
export const getDashboardCharts = async () => {
  await simulateLatency();

  // Disaster distribution by type
  const disastersByType = disasterTypes.map((type) => ({
    name: type,
    value: mockDisasters.filter((d) => d.type === type).length || Math.floor(Math.random() * 10) + 1,
  }));

  // Severity distribution
  const severityDistribution = [
    { name: 'Low (1-3)', value: mockDisasters.filter((d) => d.severity <= 3).length || 8, color: '#22c55e' },
    { name: 'Medium (4-7)', value: mockDisasters.filter((d) => d.severity > 3 && d.severity <= 7).length || 12, color: '#f97316' },
    { name: 'High (8-10)', value: mockDisasters.filter((d) => d.severity > 7).length || 5, color: '#ef4444' },
  ];

  // Monthly trends
  const monthlyTrends = [
    { month: 'Jan', disasters: 12, allocations: 10, deployments: 8 },
    { month: 'Feb', disasters: 19, allocations: 17, deployments: 15 },
    { month: 'Mar', disasters: 15, allocations: 14, deployments: 12 },
    { month: 'Apr', disasters: 22, allocations: 20, deployments: 18 },
    { month: 'May', disasters: 28, allocations: 25, deployments: 22 },
    { month: 'Jun', disasters: 18, allocations: 16, deployments: 14 },
  ];

  // Resource utilization over time
  const resourceUtilization = [
    { time: '00:00', medical: 45, food: 60, shelter: 30, equipment: 55 },
    { time: '04:00', medical: 52, food: 55, shelter: 35, equipment: 48 },
    { time: '08:00', medical: 65, food: 70, shelter: 45, equipment: 60 },
    { time: '12:00', medical: 78, food: 85, shelter: 55, equipment: 72 },
    { time: '16:00', medical: 82, food: 75, shelter: 62, equipment: 68 },
    { time: '20:00', medical: 70, food: 65, shelter: 50, equipment: 58 },
  ];

  // Response time by region
  const responseTimeByRegion = [
    { region: 'North', avgTime: 18, target: 20 },
    { region: 'South', avgTime: 22, target: 20 },
    { region: 'East', avgTime: 25, target: 20 },
    { region: 'West', avgTime: 19, target: 20 },
    { region: 'Central', avgTime: 21, target: 20 },
  ];

  // Allocation efficiency
  const allocationEfficiency = [
    { date: 'Week 1', efficiency: 78, optimal: 85 },
    { date: 'Week 2', efficiency: 82, optimal: 85 },
    { date: 'Week 3', efficiency: 88, optimal: 85 },
    { date: 'Week 4', efficiency: 85, optimal: 85 },
  ];

  return {
    disastersByType,
    severityDistribution,
    monthlyTrends,
    resourceUtilization,
    responseTimeByRegion,
    allocationEfficiency,
  };
};

// ============================================
// NEW ADMIN API ENDPOINTS FOR DISASTER CREATION FLOW
// ============================================

// GET /api/disasters - List all disasters with pagination (backend endpoint)
export const listDisasters = async (params = {}) => {
  await simulateLatency();

  const page = params.page || 1;
  const page_size = params.page_size || 50;

  let filtered = [...mockDisasters];

  // Sort by created date descending by default
  filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Pagination
  const start = (page - 1) * page_size;
  const end = start + page_size;
  const paginated = filtered.slice(start, end);

  // Map to match backend schema format
  const disasters = paginated.map((d, idx) => ({
    id: d.numericId || idx + 1, // Backend uses numeric IDs
    lat: d.latitude,
    lng: d.longitude,
    disaster_type: d.type?.toLowerCase() || 'flood',
    severity: d.severity,
    affected_population: d.livesImpacted,
    priority: d.severity >= 8 ? 'critical' : d.severity >= 5 ? 'high' : 'medium',
    notes: d.notes || null,
    created_at: d.createdAt,
    updated_at: d.updatedAt,
  }));

  return {
    disasters,
    total: filtered.length,
    page,
    page_size,
  };
};

// POST /api/resources/discover - Discover resources around disaster zones
export const discoverResources = async (payload) => {
  await simulateLatency();

  const { disaster_ids, radius_km = 10, resource_types } = payload;

  // Get disasters by IDs to calculate search region
  const targetDisasters = mockDisasters.filter((d, idx) => 
    disaster_ids.includes(d.numericId || idx + 1)
  );

  // Calculate center point for search region
  const centerLat = targetDisasters.length > 0 
    ? targetDisasters.reduce((sum, d) => sum + d.latitude, 0) / targetDisasters.length
    : 28.6139;
  const centerLng = targetDisasters.length > 0
    ? targetDisasters.reduce((sum, d) => sum + d.longitude, 0) / targetDisasters.length
    : 77.2090;

  // Generate discovered resources based on resource types
  const allResourceTypes = ['hospital', 'fire_station', 'police', 'shelter', 'pharmacy', 'warehouse', 'ngo_center'];
  const typesToUse = resource_types || allResourceTypes;

  const discovered = mockResourceCenters
    .filter((center) => {
      const typeMap = {
        medical: 'hospital',
        food: 'warehouse',
        shelter: 'shelter',
        equipment: 'fire_station',
        water: 'warehouse',
      };
      const mappedType = typeMap[center.type] || center.type;
      return !resource_types || typesToUse.includes(mappedType);
    })
    .map((center, index) => {
      const distance = (Math.random() * radius_km * 0.8 + radius_km * 0.1).toFixed(2);
      const typeMap = {
        medical: 'hospital',
        food: 'warehouse',
        shelter: 'shelter',
        equipment: 'fire_station',
        water: 'warehouse',
      };
      
      return {
        id: index + 1,
        osm_id: Math.floor(Math.random() * 1000000000),
        name: center.name,
        lat: centerLat + (Math.random() - 0.5) * (radius_km / 50),
        lng: centerLng + (Math.random() - 0.5) * (radius_km / 50),
        resource_type: typeMap[center.type] || 'warehouse',
        address: `${Math.floor(Math.random() * 999) + 1}, Sector ${Math.floor(Math.random() * 50) + 1}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        has_inventory: Math.random() > 0.3,
        distance_km: parseFloat(distance),
      };
    });

  // Create GeoJSON search region polygon (simplified convex hull)
  const searchRegion = {
    type: 'Polygon',
    coordinates: [[
      [centerLng - (radius_km / 80), centerLat - (radius_km / 80)],
      [centerLng + (radius_km / 80), centerLat - (radius_km / 80)],
      [centerLng + (radius_km / 80), centerLat + (radius_km / 80)],
      [centerLng - (radius_km / 80), centerLat + (radius_km / 80)],
      [centerLng - (radius_km / 80), centerLat - (radius_km / 80)],
    ]],
  };

  return {
    discovered,
    count: discovered.length,
    search_region: searchRegion,
    message: 'Resources discovered successfully',
  };
};

// Combined function to create disaster and fetch related data synchronously
export const createDisasterAndFetchData = async (disasterPayload, discoverConfig = {}) => {
  // Step 1: Submit disaster request
  const createResponse = await submitDisasterRequest(disasterPayload);
  
  // Extract disaster IDs from the created disasters
  // In mock, we'll use the indices of newly added disasters
  const startIndex = mockDisasters.length - disasterPayload.disasterNodes.length;
  const disasterIds = disasterPayload.disasterNodes.map((_, idx) => startIndex + idx + 1);
  
  // Also assign numeric IDs to the newly created disasters
  disasterPayload.disasterNodes.forEach((_, idx) => {
    const disaster = mockDisasters[startIndex + idx];
    if (disaster) {
      disaster.numericId = startIndex + idx + 1;
    }
  });

  // Step 2: Call listDisasters with pagination (synchronously)
  const listResponse = await listDisasters({
    page: discoverConfig.page || 1,
    page_size: discoverConfig.page_size || 50,
  });

  // Step 3: Call discoverResources with the disaster IDs (synchronously)
  const discoverResponse = await discoverResources({
    disaster_ids: disasterIds,
    radius_km: discoverConfig.radius_km || 10,
    resource_types: discoverConfig.resource_types || null,
  });

  return {
    createDisaster: createResponse,
    listDisasters: listResponse,
    discoverResources: discoverResponse,
    disasterIds,
  };
};

// ============================================
// EXPORT ALL MOCK API FUNCTIONS
// ============================================

const mockApi = {
  // User APIs
  submitDisasterRequest,
  getAllocationStatus,
  
  // Admin APIs
  getAdminDisasters,
  getDisasterDetails,
  getResourcesForAllocation,
  submitAllocation,
  getDashboardStats,
  getDashboardCharts,
  
  // New Admin APIs for disaster creation flow
  listDisasters,
  discoverResources,
  createDisasterAndFetchData,
};

export default mockApi;
