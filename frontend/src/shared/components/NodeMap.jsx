import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '@shared/constants';

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;

// Custom marker icons
const createDisasterIcon = (severity = 5) => {
  const color = severity >= 7 ? '#ef4444' : severity >= 4 ? '#f97316' : '#eab308';
  return L.divIcon({
    className: 'custom-disaster-marker',
    html: `
      <div style="position: relative;">
        <div style="
          width: 32px;
          height: 32px;
          background: ${color};
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 0 20px ${color}80, 0 2px 10px rgba(0,0,0,0.3);
        "></div>
        <div style="
          position: absolute;
          top: -8px;
          right: -8px;
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: bold;
          color: ${color};
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        ">${severity}</div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

const createResourceIcon = (type = 'default') => {
  const colors = {
    hospital: '#3b82f6',
    warehouse: '#8b5cf6',
    station: '#22c55e',
    default: '#3b82f6',
  };
  const color = colors[type] || colors.default;
  
  return L.divIcon({
    className: 'custom-resource-marker',
    html: `
      <div style="
        width: 28px;
        height: 28px;
        background: ${color};
        border: 3px solid white;
        border-radius: 8px;
        box-shadow: 0 0 15px ${color}60, 0 2px 10px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

// Animated route line component
const AnimatedRoute = ({ positions, color = '#22c55e', animated = true }) => {
  return (
    <Polyline
      positions={positions}
      pathOptions={{
        color: color,
        weight: 4,
        opacity: 0.8,
        dashArray: animated ? '10, 10' : null,
        lineCap: 'round',
        lineJoin: 'round',
      }}
    />
  );
};

// Fit bounds component
const FitBounds = ({ bounds }) => {
  const map = useMap();
  
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  
  return null;
};

const NodeMap = ({
  disasterNodes = [],
  resourceNodes = [],
  connections = [],
  height = '500px',
  showLegend = true,
  animated = true,
  themeColor = 'red',
  stats = null,
}) => {
  const [selectedNode, setSelectedNode] = useState(null);

  // Calculate bounds
  const bounds = useMemo(() => {
    const allPoints = [
      ...disasterNodes.map(n => [n.latitude || n.lat, n.longitude || n.lng]),
      ...resourceNodes.map(n => [n.coordinates?.lat || n.lat, n.coordinates?.lng || n.lng]),
    ].filter(p => p[0] && p[1]);
    
    return allPoints.length > 0 ? allPoints : null;
  }, [disasterNodes, resourceNodes]);

  // Get center for map
  const mapCenter = useMemo(() => {
    if (bounds && bounds.length > 0) {
      const lats = bounds.map(b => b[0]);
      const lngs = bounds.map(b => b[1]);
      return [
        (Math.min(...lats) + Math.max(...lats)) / 2,
        (Math.min(...lngs) + Math.max(...lngs)) / 2,
      ];
    }
    return [DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng];
  }, [bounds]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative rounded-2xl overflow-hidden glass-card"
      style={{ height }}
    >
      <MapContainer
        center={mapCenter}
        zoom={DEFAULT_MAP_ZOOM}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {bounds && <FitBounds bounds={bounds} />}

        {/* Connection lines */}
        {connections.map((conn, index) => {
          const from = disasterNodes.find(n => n.id === conn.fromId) || 
                       resourceNodes.find(n => n.id === conn.fromId);
          const to = resourceNodes.find(n => n.id === conn.toId) || 
                     disasterNodes.find(n => n.id === conn.toId);

          if (!from || !to) return null;

          const fromPos = [from.latitude || from.lat || from.coordinates?.lat, 
                          from.longitude || from.lng || from.coordinates?.lng];
          const toPos = [to.latitude || to.lat || to.coordinates?.lat, 
                        to.longitude || to.lng || to.coordinates?.lng];

          if (!fromPos[0] || !toPos[0]) return null;

          return (
            <AnimatedRoute
              key={index}
              positions={[fromPos, toPos]}
              color={conn.color || '#22c55e'}
              animated={animated}
            />
          );
        })}

        {/* Disaster markers */}
        {disasterNodes.map((node, index) => {
          const position = [node.latitude || node.lat, node.longitude || node.lng];
          if (!position[0] || !position[1]) return null;

          return (
            <Marker
              key={`disaster-${index}`}
              position={position}
              icon={createDisasterIcon(node.severity || 5)}
              eventHandlers={{
                click: () => setSelectedNode({ type: 'disaster', ...node }),
              }}
            >
              <Popup>
                <div className="p-3 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">🔴</span>
                    <span className="font-bold text-red-600">Disaster Zone</span>
                  </div>
                  <div className="space-y-1 text-sm text-gray-700">
                    <p><strong>Location:</strong> {node.address || 'Unknown'}</p>
                    {node.disasterType && <p><strong>Type:</strong> {node.disasterType}</p>}
                    {node.severity && <p><strong>Severity:</strong> {node.severity}/10</p>}
                    {node.livesImpacted && <p><strong>Lives:</strong> {node.livesImpacted.toLocaleString()}</p>}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Resource markers */}
        {resourceNodes.map((node, index) => {
          const position = [node.coordinates?.lat || node.lat, node.coordinates?.lng || node.lng];
          if (!position[0] || !position[1]) return null;

          return (
            <Marker
              key={`resource-${index}`}
              position={position}
              icon={createResourceIcon(node.type)}
              eventHandlers={{
                click: () => setSelectedNode({ type: 'resource', ...node }),
              }}
            >
              <Popup>
                <div className="p-3 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">🔵</span>
                    <span className="font-bold text-blue-600">Resource Center</span>
                  </div>
                  <div className="space-y-1 text-sm text-gray-700">
                    <p><strong>Name:</strong> {node.name || 'Unknown'}</p>
                    {node.type && <p><strong>Type:</strong> {node.type}</p>}
                    {node.capacity && <p><strong>Capacity:</strong> {node.capacity}</p>}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Legend */}
      {showLegend && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="absolute top-4 right-4 z-[1000] bg-dark-800/95 backdrop-blur-sm border border-dark-600 rounded-xl p-4 min-w-[180px]"
        >
          <h4 className="text-white font-semibold mb-3 text-sm">Map Legend</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-red-500 rounded-full shadow-lg shadow-red-500/50" />
              <span className="text-dark-300 text-sm">Disaster Zone</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-blue-500 rounded-lg shadow-lg shadow-blue-500/50" />
              <span className="text-dark-300 text-sm">Resource Center</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-1 bg-green-500 rounded" />
              <span className="text-dark-300 text-sm">Active Route</span>
            </div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-dark-600">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center p-2 bg-dark-700/50 rounded-lg">
                <div className="text-red-400 font-bold text-lg">{disasterNodes.length}</div>
                <div className="text-dark-400">Disasters</div>
              </div>
              <div className="text-center p-2 bg-dark-700/50 rounded-lg">
                <div className="text-blue-400 font-bold text-lg">{resourceNodes.length}</div>
                <div className="text-dark-400">Resources</div>
              </div>
              <div className="text-center p-2 bg-dark-700/50 rounded-lg">
                <div className="text-green-400 font-bold text-lg">{connections.length}</div>
                <div className="text-dark-400">Routes</div>
              </div>
            </div>
            {stats && (
              <div className="mt-3 pt-3 border-t border-dark-600 space-y-2 text-xs">
                {stats.coverage != null && (
                  <div className="flex justify-between"><span className="text-dark-400">Coverage</span><span className="text-green-400 font-bold">{stats.coverage}%</span></div>
                )}
                {stats.distance != null && (
                  <div className="flex justify-between"><span className="text-dark-400">Distance</span><span className="text-white font-bold">{stats.distance}</span></div>
                )}
                {stats.time != null && (
                  <div className="flex justify-between"><span className="text-dark-400">Est. Time</span><span className="text-white font-bold">{stats.time}</span></div>
                )}
                {stats.algorithm && (
                  <div className="flex justify-between"><span className="text-dark-400">Algorithm</span><span className="text-purple-400 font-bold">{stats.algorithm}</span></div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}

      <div className="absolute bottom-4 left-4 z-[1000]">
        <div className="px-3 py-1.5 bg-dark-800/90 backdrop-blur-sm border border-dark-600 rounded-lg">
          <p className="text-xs text-dark-400">
            Powered by OpenStreetMap & OSRM
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default NodeMap;
