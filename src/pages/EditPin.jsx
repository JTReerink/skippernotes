import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLocation, updateLocation, getUserRoutes, getRoute, updateRoute, deleteLocation } from '../services/firestore';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';

const EditPin = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState(null); // {lat, lng}
  
  const [routes, setRoutes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    async function loadData() {
      if(!currentUser) return;
      try {
        const pin = await getLocation(id);
        if (pin && pin.authorId === currentUser.uid) {
          setTitle(pin.title || '');
          setDescription(pin.description || '');
          setAddress(pin.address || '');
          if (pin.lat && pin.lng) {
            setCoords({ lat: pin.lat, lng: pin.lng });
          }
        } else {
          alert('Pin not found or you do not have permission to edit it.');
          navigate('/collection');
          return;
        }

        const userRoutes = await getUserRoutes(currentUser.uid);
        setRoutes(userRoutes);
      } catch (err) {
        console.error(err);
      }
      setIsLoading(false);
    }
    loadData();
  }, [id, currentUser, navigate]);

  // Debounced AutoComplete Search
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!searchTerm || searchTerm.length < 3) {
        setSuggestions([]);
        return;
      }
      setIsSearching(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchTerm)}&format=json&limit=5&addressdetails=1`);
        const data = await res.json();
        setSuggestions(data);
      } catch (err) {
        console.error('Search failed', err);
      }
      setIsSearching(false);
    };

    const timer = setTimeout(() => {
      if (showSuggestions) fetchSuggestions();
    }, 400);

    return () => clearTimeout(timer);
  }, [searchTerm, showSuggestions]);

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
    setSearchTerm(e.target.value);
    setShowSuggestions(true);
  };

  const handleSelectSuggestion = (place) => {
    // Determine the name
    const placeName = place.name || place.display_name.split(',')[0];
    setTitle(placeName);
    
    // Determine clean address
    const addr = place.address || {};
    const roadInfo = addr.road ? `${addr.road} ${addr.house_number || ''}`.trim() : '';
    const cityInfo = addr.city || addr.town || addr.village || '';
    const fullAddress = [roadInfo, cityInfo].filter(Boolean).join(', ');
    setAddress(fullAddress);
    
    // Move the pin exactly to the building
    const lat = parseFloat(place.lat);
    const lng = parseFloat(place.lon);
    setCoords({ lat, lng });
    
    setShowSuggestions(false);
  };

  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    setIsLoading(true);
    setShowConfirm(false);
    try {
      await deleteLocation(id);
      navigate('/collection');
    } catch (err) {
      console.error(err);
      alert('Failed to delete.');
      setIsLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const updateData = {
        title,
        description,
        address
      };
      if (coords) {
         updateData.lat = coords.lat;
         updateData.lng = coords.lng;
      }
      await updateLocation(id, updateData);
      navigate('/collection');
    } catch (err) {
      console.error(err);
      alert('Failed to save.');
    }
    setIsLoading(false);
  };

  const handleInstantAddToRoute = async (e) => {
    const routeId = e.target.value;
    if (!routeId) return;

    try {
      const routeToUpdate = routes.find(r => r.id === routeId);
      if(routeToUpdate && !routeToUpdate.pinIds.includes(id)) {
         await updateRoute(routeId, { pinIds: [...routeToUpdate.pinIds, id] });
         // UPDATE local state so UI updates
         setRoutes(routes.map(r => r.id === routeId ? { ...r, pinIds: [...r.pinIds, id] } : r));
      }
    } catch (err) {
      console.error(err);
      alert('Failed to add to route instantly.');
    }
    
    // reset select to default
    e.target.value = "";
  };

  const removeFromRouteInstant = async (routeId) => {
    try {
      const routeToUpdate = routes.find(r => r.id === routeId);
      if(routeToUpdate) {
         const newPinIds = routeToUpdate.pinIds.filter(pid => pid !== id);
         await updateRoute(routeId, { pinIds: newPinIds });
         // UPDATE local state so UI updates
         setRoutes(routes.map(r => r.id === routeId ? { ...r, pinIds: newPinIds } : r));
      }
    } catch (err) {
      console.error(err);
      alert('Failed to remove from route instantly.');
    }
  };

  if (isLoading) return <div className="page-padding">Loading...</div>;

  return (
    <div className="page-padding animate-fade-in">
      <ConfirmModal 
        isOpen={showConfirm}
        title="Permanently Delete Pin?"
        message="Are you entirely sure you want to permanently delete this location? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setShowConfirm(false)}
      />
      
      <h2>Edit Pin</h2>
      <button onClick={() => navigate(-1)} className="btn btn-outline mb-4">← Back</button>
      
      <div className="card">
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          
          <div style={{ position: 'relative' }}>
             <label className="label">Title</label>
             <input 
               type="text" 
               placeholder="Name (e.g. Magere Brug)" 
               value={title}
               onChange={handleTitleChange}
               onFocus={() => setShowSuggestions(true)}
               required
             />
             
             {/* Suggestions Dropdown */}
             {showSuggestions && (searchTerm.length >= 3) && (
               <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', borderRadius: '8px', boxShadow: 'var(--shadow-lg)', zIndex: 1001, maxHeight: '200px', overflowY: 'auto', border: '1px solid #eee' }}>
                  {isSearching ? (
                      <div style={{ padding: '0.8rem', fontSize: '0.85rem', color: 'gray' }}>Searching...</div>
                  ) : suggestions.length === 0 ? (
                      <div style={{ padding: '0.8rem', fontSize: '0.85rem', color: 'gray' }}>No known places found.</div>
                  ) : (
                      suggestions.map((place, idx) => (
                         <div 
                            key={idx} 
                            onClick={() => handleSelectSuggestion(place)}
                            style={{ padding: '0.8rem', borderBottom: '1px solid #f1f1f1', cursor: 'pointer', display:'flex', flexDirection:'column', gap:'0.2rem' }}
                         >
                            <strong style={{ fontSize: '0.9rem' }}>{place.name || place.display_name.split(',')[0]}</strong>
                            <span style={{ fontSize: '0.75rem', color: 'gray' }}>{place.display_name}</span>
                         </div>
                      ))
                  )}
               </div>
             )}
          </div>

          <div>
            <label className="label">Address / Location Reference</label>
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. Prinsengracht 281" />
          </div>
          <div>
            <label className="label">Description / Facts</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ minHeight: '100px' }} />
          </div>
          
          <button type="submit" className="btn btn-primary mt-4">Save Changes</button>
        </form>
        
        <hr style={{ margin: '1.5rem 0', borderColor: 'var(--color-bg)' }} />
          
        <div>
          <h4 style={{ marginBottom: '0.5rem' }}>Route Management</h4>
          <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
            Changes here are applied instantly.
          </p>
          
          {/* Display current routes */}
          <div style={{ marginBottom: '1rem' }}>
            {routes.filter(r => (r.pinIds || []).includes(id)).length > 0 ? (
               <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                 {routes.filter(r => (r.pinIds || []).includes(id)).map(r => (
                   <div key={r.id} style={{ display: 'flex', alignItems: 'center', background: 'var(--color-bg)', padding: '0.3rem 0.8rem', borderRadius: '15px', fontSize: '0.9rem' }}>
                     <span style={{ color: 'var(--color-primary)', fontWeight: 'bold', marginRight: '5px' }}>✓ {r.title}</span>
                     <button onClick={() => removeFromRouteInstant(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'gray' }}>×</button>
                   </div>
                 ))}
               </div>
            ) : (
               <p style={{ fontSize: '0.9rem', fontStyle: 'italic', color: 'gray' }}>This pin is not yet part of any route.</p>
            )}
          </div>

          <label className="label">Add to a Route</label>
          <select onChange={handleInstantAddToRoute} defaultValue="">
            <option value="" disabled>-- Select a route --</option>
            {routes.map(r => {
              const isAlreadyIn = (r.pinIds || []).includes(id);
              return (
                <option key={r.id} value={r.id} disabled={isAlreadyIn}>
                  {r.title} {isAlreadyIn ? '(Already added)' : ''}
                </option>
              );
            })}
          </select>
        </div>

        {/* Danger Zone */}
        <div style={{marginTop: '3rem', textAlign:'center', paddingTop: '1.5rem', borderTop: '1px solid #eee' }}>
           <button type="button" onClick={() => setShowConfirm(true)} style={{background: 'none', border:'none', color: 'var(--color-error)', textDecoration:'underline', cursor:'pointer', fontWeight: 'bold'}}>Permanently Delete this Pin</button>
           <p className="text-muted" style={{fontSize: '0.75rem', marginTop:'0.5rem'}}>This action cannot be undone.</p>
        </div>
      </div>
    </div>
  );
};

export default EditPin;
