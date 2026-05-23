// API service layer - Real API calls to backend
import axios from 'axios';

// Base URL for the backend API
const API_BASE_URL = 'http://localhost:8000/api/v1';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================
// USER SERVICES
// ============================================

export const disasterService = {
  // Submit disaster report
  submitRequest: async (payload) => {
    const requestBody = {
      disasters: payload.disasterNodes.map((node) => ({
        lat: node.latitude,
        lng: node.longitude,
        disaster_type: node.disasterType?.toLowerCase().replace(/\s+/g, '_') || 'flood',
        severity: node.severity,
        affected_population: node.livesImpacted || 0,
        priority: node.severity >= 8 ? 'critical' : node.severity >= 5 ? 'high' : 'medium',
        notes: node.notes || null,
      })),
    };

    const response = await apiClient.post('/disasters', requestBody);
    return response.data;
  },

  // Get all disasters (for user to see their submitted ones)
  listDisasters: async (page = 1, pageSize = 50) => {
    const response = await apiClient.get('/disasters', {
      params: { page, page_size: pageSize },
    });
    return response.data;
  },

  // Get a specific disaster by ID
  getDisaster: async (disasterId) => {
    const response = await apiClient.get(`/disasters/${disasterId}`);
    return response.data;
  },

  // Poll for optimization results (from backend, cross-portal safe)
  getOptimizationResults: async () => {
    const response = await apiClient.get('/results/optimization');
    return response.data;
  },
};

// ============================================
// ADMIN SERVICES
// ============================================

export const adminService = {
  // List all disasters with pagination
  listDisasters: async (page = 1, pageSize = 50) => {
    const response = await apiClient.get('/disasters', {
      params: { page, page_size: pageSize },
    });
    return response.data;
  },

  // Discover resources around disaster zones
  discoverResources: async (disasterIds, radiusKm = 15, resourceTypes = ['hospital', 'fire_station', 'shelter']) => {
    const response = await apiClient.post('/resources/discover', {
      disaster_ids: disasterIds,
      radius_km: radiusKm,
      resource_types: resourceTypes,
    });
    return response.data;
  },

  // List all resources
  listResources: async (page = 1, pageSize = 100) => {
    const response = await apiClient.get('/resources', {
      params: { page, page_size: pageSize },
    });
    return response.data;
  },

  // Bulk update inventory for multiple resource centers
  bulkUpdateInventory: async (updates) => {
    const response = await apiClient.post('/admin/inventory/bulk', { updates });
    return response.data;
  },

  // Build graph from disasters and resources
  buildGraph: async (disasterIds = null, resourceIds = null) => {
    const response = await apiClient.post('/graph/build', {
      disaster_ids: disasterIds,
      resource_ids: resourceIds,
      include_route_geometry: true,
      max_distance_km: 50,
    });
    return response.data;
  },

  // Run optimization
  runOptimization: async (disasterIds = null, algorithm = 'greedy') => {
    const response = await apiClient.post('/optimize', {
      disaster_ids: disasterIds,
      algorithm,
      objective: 'balanced',
      max_iterations: 1000,
    });
    return response.data;
  },

  // Store optimization results for cross-portal access
  storeResults: async (payload) => {
    const response = await apiClient.post('/results/optimization', payload);
    return response.data;
  },

  // Get graph stats
  getGraphStats: async () => {
    const response = await apiClient.get('/graph/stats');
    return response.data;
  },
};

// ============================================
// DASHBOARD SERVICES
// ============================================

export const dashboardService = {
  getStats: async () => {
    try {
      const [disastersRes, resourcesRes] = await Promise.all([
        apiClient.get('/disasters', { params: { page: 1, page_size: 1 } }),
        apiClient.get('/resources', { params: { page: 1, page_size: 1 } }),
      ]);
      return {
        totalRequests: disastersRes.data?.total || 0,
        activeAllocations: 0,
        availableResources: resourcesRes.data?.total || 0,
        personnelAvailable: 0,
        criticalZones: 0,
        averageResponseTime: '—',
      };
    } catch {
      return {
        totalRequests: 0,
        activeAllocations: 0,
        availableResources: 0,
        personnelAvailable: 0,
        criticalZones: 0,
        averageResponseTime: '—',
      };
    }
  },
};

export default {
  disaster: disasterService,
  admin: adminService,
  dashboard: dashboardService,
};
