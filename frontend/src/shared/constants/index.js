// Disaster Types
export const DISASTER_TYPES = [
  { value: 'flood', label: 'Flood', icon: 'Waves' },
  { value: 'earthquake', label: 'Earthquake', icon: 'Activity' },
  { value: 'cyclone', label: 'Cyclone', icon: 'Wind' },
  { value: 'landslide', label: 'Landslide', icon: 'Mountain' },
  { value: 'fire', label: 'Fire', icon: 'Flame' },
  { value: 'tsunami', label: 'Tsunami', icon: 'Waves' },
  { value: 'pandemic', label: 'Pandemic', icon: 'Bug' },
  { value: 'other', label: 'Other', icon: 'AlertTriangle' },
];

// Severity Levels
export const SEVERITY_LEVELS = {
  low: { min: 1, max: 3, color: '#22c55e', label: 'Low' },
  medium: { min: 4, max: 7, color: '#f97316', label: 'Medium' },
  high: { min: 8, max: 10, color: '#ef4444', label: 'High' },
};

export const getSeverityLevel = (severity) => {
  if (severity <= 3) return SEVERITY_LEVELS.low;
  if (severity <= 7) return SEVERITY_LEVELS.medium;
  return SEVERITY_LEVELS.high;
};

export const getSeverityColor = (severity) => {
  return getSeverityLevel(severity).color;
};

// Allocation Stages
export const ALLOCATION_STAGES = [
  { id: 1, label: 'Disaster Registered', description: 'Your disaster report has been received' },
  { id: 2, label: 'Resource Search Started', description: 'Searching for available resources nearby' },
  { id: 3, label: 'Nearby Resource Nodes Found', description: 'Identified potential resource centers' },
  { id: 4, label: 'Inventory Analysis Running', description: 'Analyzing available inventory and capacity' },
  { id: 5, label: 'Quantum Optimization Running', description: 'Running quantum algorithms for optimal allocation' },
  { id: 6, label: 'Allocation Generated', description: 'Resource allocation plan has been created' },
  { id: 7, label: 'Deployment Ready', description: 'Resources are ready for deployment' },
];

// Request Statuses
export const REQUEST_STATUS = {
  PENDING: { value: 'pending', label: 'Pending', color: 'warning' },
  IN_PROGRESS: { value: 'in_progress', label: 'In Progress', color: 'info' },
  ALLOCATED: { value: 'allocated', label: 'Allocated', color: 'success' },
  DEPLOYED: { value: 'deployed', label: 'Deployed', color: 'success' },
  CANCELLED: { value: 'cancelled', label: 'Cancelled', color: 'danger' },
};

// Navigation Links - User
export const USER_NAV_LINKS = [
  { path: '/', label: 'Dashboard', icon: 'LayoutDashboard' },
  { path: '/report', label: 'Report Disaster', icon: 'AlertTriangle' },
  { path: '/allocation-status', label: 'Track Status', icon: 'Radio' },
  { path: '/allocation-map', label: 'Resource Map', icon: 'Map' },
];

// Navigation Links - Admin
export const ADMIN_NAV_LINKS = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { path: '/admin/create-disaster', label: 'Create Disaster', icon: 'Plus' },
  { path: '/admin/requests', label: 'Requests', icon: 'FileText' },
  { path: '/admin/allocations', label: 'Allocations', icon: 'GitBranch' },
  { path: '/admin/analytics', label: 'Analytics', icon: 'BarChart3' },
];

// Map Styles - Dark Mode
export const MAP_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#cbd5e1' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#64748b' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#1e3a2f' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#334155' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#475569' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#475569' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#64748b' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#334155' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0c4a6e' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#38bdf8' }],
  },
];

// Default Map Center (India)
export const DEFAULT_MAP_CENTER = {
  lat: 20.5937,
  lng: 78.9629,
};

export const DEFAULT_MAP_ZOOM = 5;

// API Endpoints
export const API_ENDPOINTS = {
  // User
  DISASTER_REQUEST: '/api/disaster/request',
  ALLOCATION_STATUS: '/api/allocation/status',
  
  // Admin
  ADMIN_DISASTERS: '/api/admin/disasters',
  ADMIN_RESOURCES: '/api/admin/resources',
  ADMIN_ALLOCATION: '/api/admin/allocation',
  DASHBOARD_STATS: '/api/dashboard/stats',
  DASHBOARD_CHARTS: '/api/dashboard/charts',
};

// Animation Variants
export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
};

export const slideInLeft = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

export const slideInRight = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};
