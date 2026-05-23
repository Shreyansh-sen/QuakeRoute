import { useEffect, useState } from 'react';
import { adminService } from '@api';

// Fallback resources data when API is unavailable
const fallbackResources = [
  {
    name: "Vimalaya Hospital",
    address: "Hosur Road, 560100",
    resource_type: "hospital"
  },
  {
    name: "Hulimavu Fire Station",
    address: null,
    resource_type: "fire_station"
  },
  {
    name: "JJ Hospital",
    address: null,
    resource_type: "hospital"
  },
  {
    name: "Manipal Speciality Hospital",
    address: null,
    resource_type: "hospital"
  },
  {
    name: "Electronics City Fire Station",
    address: null,
    resource_type: "fire_station"
  },
  {
    name: "Shelter #1486784388",
    address: null,
    resource_type: "shelter"
  }
];

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [disasters, setDisasters] = useState([]);
  const [resources, setResources] = useState([]);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setUsingFallback(false);

      try {
        // Step 1: GET /disasters with pagination
        const disastersResponse = await adminService.listDisasters(1, 50);
        
        const disastersList = disastersResponse?.disasters || [];
        setDisasters(disastersList);

        // Extract all disaster IDs
        const disasterIds = disastersList.map(d => d.id);

        if (disasterIds.length > 0) {
          // Step 2: POST /resources/discover with disaster IDs
          const resourcesResponse = await adminService.discoverResources(
            disasterIds,
            15, // radius_km hardcoded to 15
            ['hospital', 'fire_station', 'shelter'] // resource_types
          );

          const discoveredResources = resourcesResponse?.discovered || [];
          setResources(discoveredResources);
        } else {
          // No disasters found, use fallback
          console.log('No disasters found, using fallback resources');
          setResources(fallbackResources);
          setUsingFallback(true);
        }
      } catch (err) {
        console.error('API Error:', err);
        setError(err.message || 'Failed to fetch data');
        
        // Use fallback data on error
        setResources(fallbackResources);
        setUsingFallback(true);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Format resource type for display
  const formatResourceType = (type) => {
    return type?.replace(/_/g, ' ') || 'unknown';
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ marginBottom: '20px', color: '#fff' }}>Admin Dashboard - Discovered Resources</h1>

      {loading && (
        <div style={{ padding: '20px', color: '#888' }}>
          Loading...
        </div>
      )}

      {error && (
        <div style={{ 
          padding: '10px', 
          marginBottom: '20px', 
          backgroundColor: '#ffebee', 
          color: '#c62828',
          borderRadius: '4px'
        }}>
          Error: {error}
        </div>
      )}

      {usingFallback && (
        <div style={{ 
          padding: '10px', 
          marginBottom: '20px', 
          backgroundColor: '#fff3e0', 
          color: '#e65100',
          borderRadius: '4px'
        }}>
          Note: Using fallback data (API unavailable)
        </div>
      )}

      {!loading && (
        <div>
          {/* Disasters Summary */}
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{ color: '#fff', marginBottom: '10px' }}>
              Disasters Found: {disasters.length}
            </h2>
            {disasters.length > 0 && (
              <p style={{ color: '#888' }}>
                Disaster IDs: {disasters.map(d => d.id).join(', ')}
              </p>
            )}
          </div>

          {/* Resources List */}
          <h2 style={{ color: '#fff', marginBottom: '20px' }}>
            Discovered Resources ({resources.length})
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {resources.map((resource, index) => (
              <div 
                key={index}
                style={{
                  padding: '15px',
                  backgroundColor: '#1e1e2e',
                  borderRadius: '8px',
                  border: '1px solid #333'
                }}
              >
                <h3 style={{ 
                  margin: '0 0 10px 0', 
                  color: '#fff',
                  fontSize: '18px'
                }}>
                  {resource.name}
                </h3>
                <p style={{ 
                  margin: '5px 0', 
                  color: '#aaa' 
                }}>
                  <strong>Address:</strong> {resource.address || '-'}
                </p>
                <p style={{ 
                  margin: '5px 0', 
                  color: '#aaa' 
                }}>
                  <strong>Type:</strong> {formatResourceType(resource.resource_type)}
                </p>
              </div>
            ))}

            {resources.length === 0 && !loading && (
              <p style={{ color: '#888' }}>No resources found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
