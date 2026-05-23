// API service layer - Real API calls to backend
import axios from 'axios';

// Base URL for the backend API
const API_BASE_URL = 'http://localhost:8000/api/v1';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================
// USER SERVICES
// ============================================

export const disasterService = {
  // Submit disaster report - Real API call
  submitRequest: async (payload) => {
    // Transform payload to match backend schema
    const requestBody = {
      disasters: payload.disasterNodes.map((node) => ({
        lat: node.latitude,
        lng: node.longitude,
        disaster_type: node.disasterType?.toLowerCase().replace(' ', '_') || 'flood',
        severity: node.severity,
        affected_population: node.livesImpacted || 0,
        priority: node.severity >= 8 ? 'critical' : node.severity >= 5 ? 'high' : 'medium',
        notes: node.notes || null,
      })),
    };

    const response = await apiClient.post('/disasters', requestBody);
    return response.data;
  },

  // Get allocation status
  getAllocationStatus: async (requestId) => {
    const response = await apiClient.get(`/allocation/status/${requestId}`);
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
      params: {
        page,
        page_size: pageSize,
      },
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
};

// ============================================
// DASHBOARD SERVICES (kept for compatibility)
// ============================================

export const dashboardService = {
  getStats: async () => {
    return {
      totalRequests: 0,
      activeAllocations: 0,
      availableResources: 0,
      personnelAvailable: 0,
      criticalZones: 0,
      averageResponseTime: '0 min',
    };
  },

  getCharts: async () => {
    return {};
  },
};

export default {
  disaster: disasterService,
  admin: adminService,
  dashboard: dashboardService,
};
