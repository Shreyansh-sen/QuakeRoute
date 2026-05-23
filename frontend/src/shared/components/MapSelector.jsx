import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Search, Crosshair, ZoomIn, ZoomOut, Layers } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '@shared/constants';

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom disaster marker icon
const createCustomIcon = (color = '#ef4444') => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="width: 24px; height: 24px; background: ${color}; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 10px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

// Map click handler component
const MapClickHandler = ({ onMapClick, editable }) => {
  useMapEvents({
    click: async (e) => {
      if (!editable) return;
      
      const { lat, lng } = e.latlng;
      
      // Reverse geocode using Nominatim (OpenStreetMap)
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
        );
        const data = await response.json();
        
        onMapClick?.({
          lat,
          lng,
          address: data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        });
      } catch (error) {
        onMapClick?.({
          lat,
          lng,
          address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        });
      }
    },
  });
  return null;
};

// Location finder component
const LocationFinder = () => {
  const map = useMap();
  
  useEffect(() => {
    map.on('locationfound', (e) => {
      L.marker(e.latlng, { icon: createCustomIcon('#22c55e') })
        .addTo(map)
        .bindPopup('You are here')
        .openPopup();
    });
    
    map.on('locationerror', () => {
      console.log('Location access denied');
    });
  }, [map]);
  
  return null;
};

// Recenter map component
const RecenterMap = ({ center, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView([center.lat, center.lng], zoom);
    }
  }, [center, zoom, map]);
  
  return null;
};

const MapSelector = ({
  markers = [],
  onMarkerAdd,
  onMarkerRemove,
  center = DEFAULT_MAP_CENTER,
  zoom = DEFAULT_MAP_ZOOM,
  height = '400px',
  editable = true,
  showSearch = true,
  showControls = true,
  themeColor = 'red',
}) => {
  const mapRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [mapCenter, setMapCenter] = useState(center);
  const [mapZoom, setMapZoom] = useState(zoom);
  
  const markerColor = themeColor === 'purple' ? '#8b5cf6' : '#06b6d4';

  // Search location using Nominatim
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      );
      const data = await response.json();
      
      if (data.length > 0) {
        const { lat, lon, display_name } = data[0];
        setMapCenter({ lat: parseFloat(lat), lng: parseFloat(lon) });
        setMapZoom(15);
        
        if (editable) {
          onMarkerAdd?.({
            lat: parseFloat(lat),
            lng: parseFloat(lon),
            address: display_name,
          });
        }
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleZoomIn = () => setMapZoom(prev => Math.min(prev + 1, 18));
  const handleZoomOut = () => setMapZoom(prev => Math.max(prev - 1, 2));
  
  const handleLocate = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setMapCenter({ lat: latitude, lng: longitude });
          setMapZoom(15);
        },
        (error) => console.error('Geolocation error:', error)
      );
    }
  };

  const searchBtnClass = themeColor === 'purple'
    ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-purple-500/30'
    : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30';

  const locateBtnClass = themeColor === 'purple'
    ? 'bg-violet-500/90 border-violet-400 hover:bg-violet-600'
    : 'bg-cyan-500/90 border-cyan-400 hover:bg-cyan-600';

  const overlayClass = themeColor === 'purple'
    ? 'bg-violet-500/20 border-violet-500/30'
    : 'bg-cyan-500/20 border-cyan-500/30';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl overflow-hidden border border-slate-700/50"
      style={{ height }}
    >
      {/* Search bar */}
      {showSearch && (
        <div className="absolute top-4 left-4 right-16 z-[1000]">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search location..."
                className="w-full px-4 py-2.5 pl-10 bg-slate-800/90 backdrop-blur-sm border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition-colors"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSearch}
              disabled={isSearching}
              className={`px-4 py-2.5 rounded-xl font-medium transition-all ${searchBtnClass}`}
            >
              {isSearching ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                />
              ) : (
                <Search className="w-5 h-5" />
              )}
            </motion.button>
          </div>
        </div>
      )}

      {/* Map controls */}
      {showControls && (
        <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleZoomIn}
            className="w-10 h-10 bg-slate-800/90 backdrop-blur-sm border border-slate-600 rounded-xl flex items-center justify-center text-white hover:bg-slate-700 transition-colors"
          >
            <ZoomIn className="w-5 h-5" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleZoomOut}
            className="w-10 h-10 bg-slate-800/90 backdrop-blur-sm border border-slate-600 rounded-xl flex items-center justify-center text-white hover:bg-slate-700 transition-colors"
          >
            <ZoomOut className="w-5 h-5" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleLocate}
            className={`w-10 h-10 backdrop-blur-sm border rounded-xl flex items-center justify-center text-white transition-colors ${locateBtnClass}`}
          >
            <Crosshair className="w-5 h-5" />
          </motion.button>
        </div>
      )}

      {/* Leaflet Map */}
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
        zoomControl={false}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        <MapClickHandler onMapClick={onMarkerAdd} editable={editable} />
        <RecenterMap center={mapCenter} zoom={mapZoom} />
        <LocationFinder />
        
        {/* Markers */}
        {markers.map((marker, index) => (
          <Marker
            key={index}
            position={[marker.lat || marker.latitude, marker.lng || marker.longitude]}
            icon={createCustomIcon(marker.color || markerColor)}
          >
            <Popup className="custom-popup">
              <div className="p-2 min-w-[180px]">
                <div className="font-semibold text-slate-800 mb-1 flex items-center gap-2">
                  <MapPin className="w-4 h-4" style={{ color: markerColor }} />
                  Location
                </div>
                <p className="text-sm text-slate-600">{marker.address || 'Unknown location'}</p>
                {editable && (
                  <button
                    onClick={() => onMarkerRemove?.(index)}
                    className="mt-2 w-full px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Instructions overlay */}
      {editable && markers.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute bottom-4 left-4 right-4 z-[1000]"
        >
          <div className={`px-4 py-3 rounded-xl backdrop-blur-sm border ${overlayClass}`}>
            <p className="text-white text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Click on the map to select a location or search above
            </p>
          </div>
        </motion.div>
      )}

      {/* Map style indicator */}
      <div className="absolute bottom-4 right-4 z-[1000]">
        <div className="px-3 py-1.5 bg-slate-800/90 backdrop-blur-sm border border-slate-600 rounded-lg">
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <Layers className="w-3 h-3" />
            OpenStreetMap
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default MapSelector;
