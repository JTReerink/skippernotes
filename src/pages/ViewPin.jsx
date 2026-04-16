import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { getLocation, addLocation, getUserLocations, getUserRoutes, updateRoute } from '../services/firestore';
import { useAuth } from '../context/AuthContext';

const defaultIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const ViewPin = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [pin, setPin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [myRoutes, setMyRoutes] = useState([]);
  const [myLocations, setMyLocations] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState('');

  useEffect(() => {
    async function fetchData() {
      if(!id || !currentUser) return;
      const [pinData, routes, locations] = await Promise.all([
        getLocation(id),
        getUserRoutes(currentUser.uid),
        getUserLocations(currentUser.uid)
      ]);
      setPin(pinData);
      setMyRoutes(routes);
      setMyLocations(locations);
      setLoading(false);
    }
    fetchData();
  }, [id, currentUser]);

  const isCollected = pin && myLocations.some(l => l.originalPinId === pin.id || (l.title === pin.title && l.lat === pin.lat));

  const handleCopy = async () => {
    if(!pin || !currentUser || isCollected) return null;
    setAdding(true);
    let newId = null;
    try {
      newId = await addLocation(currentUser.uid, currentUser.email, {
        title: pin.title,
        description: pin.description,
        address: pin.address || '',
        lat: pin.lat,
        lng: pin.lng,
        originalAuthor: pin.authorEmail,
        originalPinId: pin.id
      });
      // update local list so the UI reacts immediately
      setMyLocations([...myLocations, { id: newId, originalPinId: pin.id }]); 
      alert(`"${pin.title}" has been saved to your collection!`);
    } catch (err) {
      console.error(err);
      alert("Failed to save location.");
    }
    setAdding(false);
    return newId;
  };

  const handleAddToRoute = async () => {
    if(!selectedRouteId) return;
    
    let localPinId = null;
    if(isCollected) {
        const localPin = myLocations.find(l => l.originalPinId === pin.id || (l.title === pin.title && l.lat === pin.lat));
        localPinId = localPin.id;
    } else {
        localPinId = await handleCopy();
    }
    
    if(!localPinId) return;
    
    setAdding(true);
    const route = myRoutes.find(r => r.id === selectedRouteId);
    if(route) {
        const newPinIds = [...(route.pinIds || []), localPinId];
        await updateRoute(selectedRouteId, { pinIds: newPinIds });
        alert(`Pin successfully added to route "${route.title}"!`);
        // update local state
        const updatedRoutes = myRoutes.map(r => r.id === selectedRouteId ? { ...r, pinIds: newPinIds } : r);
        setMyRoutes(updatedRoutes);
    }
    setAdding(false);
  };

  if (loading) {
    return <div className="page-padding text-center mt-4">Loading pin...</div>;
  }

  if (!pin) {
    return (
      <div className="page-padding text-center">
        <h2>Pin not found</h2>
        <button className="btn btn-outline mt-4" onClick={() => navigate(-1)}>Go Back</button>
      </div>
    );
  }

  return (
    <div className="page-padding animate-fade-in" style={{ paddingBottom: '80px' }}>
      <button className="btn btn-outline mb-4" onClick={() => navigate(-1)}>← Back</button>
      
      <h2>{pin.title}</h2>
      
      <div style={{ marginBottom: '1rem', background: 'var(--color-bg)', padding: '10px', borderRadius: '12px' }}>
        <p style={{ margin: '0 0 5px 0' }}>{pin.description}</p>
        {pin.address && <p style={{ margin: '0', fontSize: '0.85rem' }}>📍 {pin.address}</p>}
        {pin.authorEmail && (
          <p style={{ margin: '10px 0 0 0', fontSize: '0.85rem' }}>
            Added by:{' '}
            <Link to={`/user/${pin.authorId}`} style={{ color: 'var(--color-primary)', fontWeight: 'bold', textDecoration: 'none' }}>
               {pin.authorEmail.split('@')[0]}
            </Link>
          </p>
        )}
      </div>

      <div style={{ height: '300px', borderRadius: '12px', overflow: 'hidden', marginBottom: '1.5rem', border: '2px solid white', boxShadow: 'var(--shadow-md)' }}>
         <MapContainer 
            center={[pin.lat, pin.lng]} 
            zoom={16} 
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
            dragging={false}   // Make it static & smooth for mobile
            scrollWheelZoom={false}
         >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker position={[pin.lat, pin.lng]} icon={defaultIcon}>
               <Popup>{pin.title}</Popup>
            </Marker>
         </MapContainer>
      </div>

      {pin.authorId !== currentUser?.uid && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
           <button 
             className={isCollected ? "btn btn-outline w-full" : "btn btn-primary w-full"} 
             onClick={handleCopy}
             disabled={adding || isCollected}
           >
             {adding ? 'Saving...' : isCollected ? '✓ Already in my collection' : '+ Add to my collection'}
           </button>
           
           <div className="card" style={{ background: '#f8f9fa' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem' }}>Add to Route</h4>
              <div style={{ display: 'flex', gap: '10px' }}>
                 <select 
                    value={selectedRouteId} 
                    onChange={(e) => setSelectedRouteId(e.target.value)}
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
                 >
                    <option value="">-- Select a Route --</option>
                    {myRoutes.map(route => (
                       <option key={route.id} value={route.id}>{route.title}</option>
                    ))}
                 </select>
                 <button 
                    className="btn btn-primary" 
                    onClick={handleAddToRoute}
                    disabled={!selectedRouteId || adding}
                 >
                    Add
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ViewPin;
