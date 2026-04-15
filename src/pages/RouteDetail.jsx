import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRoute, updateRoute, getUserLocations, deleteRoute } from '../services/firestore';
import ConfirmModal from '../components/ConfirmModal';

const RouteDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [route, setRoute] = useState(null);
  const [allMyPins, setAllMyPins] = useState([]);
  const [routePins, setRoutePins] = useState([]); // populated pin objects
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    async function loadData() {
      if(!currentUser) return;
      try {
        const routeData = await getRoute(id);
        if (routeData && routeData.authorId === currentUser.uid) {
          setRoute(routeData);
          setTitle(routeData.title);
          
          // Get all user pins to map them to the route's pinIds
          const myPins = await getUserLocations(currentUser.uid);
          setAllMyPins(myPins);
          
          // Construct ordered route pins safely
          const orderedPins = (routeData.pinIds || []).map(pinId => myPins.find(p => p.id === pinId)).filter(Boolean);
          setRoutePins(orderedPins);
        } else {
           alert("Route not found");
           navigate('/collection');
        }
      } catch (err) {
        console.error(err);
      }
      setIsLoading(false);
    }
    loadData();
  }, [id, currentUser, navigate]);

  const saveTitle = async () => {
    if(!title) return;
    try {
      await updateRoute(id, { title });
      setRoute({ ...route, title });
      setIsEditingTitle(false);
    } catch(err) {
      console.error(err);
      alert("Failed to update title");
    }
  };

  const movePin = async (index, direction) => {
    const newRoutePins = [...routePins];
    if (direction === 'up' && index > 0) {
      // swap
      [newRoutePins[index - 1], newRoutePins[index]] = [newRoutePins[index], newRoutePins[index - 1]];
    } else if (direction === 'down' && index < newRoutePins.length - 1) {
      [newRoutePins[index + 1], newRoutePins[index]] = [newRoutePins[index], newRoutePins[index + 1]];
    } else {
      return;
    }
    setRoutePins(newRoutePins);
    // save to db
    await updateRoute(id, { pinIds: newRoutePins.map(p => p.id) });
  };

  const removePinFromRoute = async (pinIdToRemove) => {
    const newRoutePins = routePins.filter(p => p.id !== pinIdToRemove);
    setRoutePins(newRoutePins);
    await updateRoute(id, { pinIds: newRoutePins.map(p => p.id) });
  };

  const addExistingPinToRoute = async (e) => {
    const pinId = e.target.value;
    if(!pinId) return;
    // Don't add duplicates
    if(routePins.find(p => p.id === pinId)) return;
    
    const pinToAdd = allMyPins.find(p => p.id === pinId);
    const newRoutePins = [...routePins, pinToAdd];
    setRoutePins(newRoutePins);
    await updateRoute(id, { pinIds: newRoutePins.map(p => p.id) });
    // reset select
    e.target.value = "";
  };

  const handleDeleteRoute = async () => {
    setShowConfirm(false);
    await deleteRoute(id);
    navigate('/collection');
  }

  if (isLoading) return <div className="page-padding">Loading...</div>;
  if (!route) return null;

  return (
    <div className="page-padding animate-fade-in">
      <ConfirmModal 
        isOpen={showConfirm}
        title="Delete Route?"
        message="Are you sure you want to delete this Entire Route? Your pins will remain unharmed."
        onConfirm={handleDeleteRoute}
        onCancel={() => setShowConfirm(false)}
      />

      <button onClick={() => navigate('/collection')} className="btn btn-outline mb-4">← Collections</button>
      
      {/* Route Header */}
      <div className="card mb-4" style={{ borderLeft: `6px solid ${route.color || 'var(--color-primary)'}` }}>
        {isEditingTitle ? (
          <div className="flex flex-col gap-2">
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} autoFocus style={{fontSize:'1.2rem', fontWeight: 'bold'}} />
            <div className="flex items-center gap-2">
               <label className="label" style={{margin:0}}>Route Map Color:</label>
               <input type="color" value={route.color || '#000000'} onChange={e => setRoute({...route, color: e.target.value})} style={{padding:0, width:'40px', height:'40px', border:'none', cursor:'pointer'}} />
            </div>
            <button className="btn btn-primary mt-2" onClick={async () => {
                const colorToSave = route.color || 'var(--color-primary)';
                await updateRoute(id, { title, color: colorToSave });
                setRoute({ ...route, title, color: colorToSave });
                setIsEditingTitle(false);
            }}>Save Settings</button>
          </div>
        ) : (
          <div className="flex justify-between items-center">
            <h2 style={{ margin: 0 }}>{route.title}</h2>
            <button onClick={() => setIsEditingTitle(true)} style={{background:'none', border:'none', color:'var(--color-primary-light)', cursor:'pointer'}}>⚙️ Settings</button>
          </div>
        )}
      </div>

      {/* Pins List */}
      <h3>Route Sequence</h3>
      {routePins.length === 0 ? (
        <p className="text-muted">No locations added to this route yet.</p>
      ) : (
        <div className="flex flex-col gap-2 mt-4">
          {routePins.map((pin, index) => (
            <div className="card" key={pin.id} style={{ display: 'flex', alignItems: 'center', padding: '1rem' }}>
              {/* Order buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', marginRight: '15px' }}>
                <button 
                  onClick={() => movePin(index, 'up')} 
                  disabled={index === 0}
                  style={{ background:'none', border:'none', fontSize:'1.5rem', opacity: index === 0 ? 0.3 : 1, cursor: index === 0 ? 'default' : 'pointer'}}
                >
                  ⬆️
                </button>
                <button 
                  onClick={() => movePin(index, 'down')} 
                  disabled={index === routePins.length - 1}
                  style={{ background:'none', border:'none', fontSize:'1.5rem', opacity: index === routePins.length - 1 ? 0.3 : 1, cursor: index === routePins.length - 1 ? 'default' : 'pointer'}}
                >
                  ⬇️
                </button>
              </div>
              
              {/* Pin content */}
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: 0 }}>{index + 1}. {pin.title}</h4>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'gray' }}>{pin.address || 'No specific address'}</p>
              </div>

              {/* Remove from route */}
              <button 
                onClick={() => removePinFromRoute(pin.id)}
                style={{ background: '#ffeeee', borderRadius: '50%', width:'30px', height:'30px', border: 'none', color: 'var(--color-error)', cursor: 'pointer', display:'flex', alignItems:'center', justifyContent:'center'}}
                title="Remove from route"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Pin to Route */}
      <div className="card mt-4" style={{ background: 'var(--color-bg)' }}>
        <h4 style={{ marginBottom: '0.5rem' }}>Add location to route</h4>
        <select onChange={addExistingPinToRoute} defaultValue="">
          <option value="" disabled>-- Select a location from your collection --</option>
          {allMyPins.filter(p => !routePins.find(rp => rp.id === p.id)).map(pin => (
            <option key={pin.id} value={pin.id}>{pin.title}</option>
          ))}
        </select>
        <p className="text-muted" style={{fontSize: '0.8rem', marginTop:'10px'}}>
           Cannot find a pin? <button onClick={() => navigate('/map')} style={{background:'none', border:'none', color:'var(--color-primary-light)', textDecoration:'underline', cursor:'pointer'}}>Add it on the map first.</button>
        </p>
      </div>

      <div style={{marginTop: '2rem', textAlign:'center'}}>
         <button onClick={() => setShowConfirm(true)} style={{background: 'none', border:'none', color: 'var(--color-error)', textDecoration:'underline', cursor:'pointer'}}>Delete this Route</button>
      </div>
    </div>
  );
};

export default RouteDetail;
