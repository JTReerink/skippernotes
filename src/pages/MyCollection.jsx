import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserLocations, getUserRoutes, deleteLocation, deleteRoute, addRoute } from '../services/firestore';
import ConfirmModal from '../components/ConfirmModal';

const MyCollection = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pins'); // 'pins' or 'routes'
  
  const [myPins, setMyPins] = useState([]);
  const [myRoutes, setMyRoutes] = useState([]);
  const [isCreatingRoute, setIsCreatingRoute] = useState(false);
  const [newRouteTitle, setNewRouteTitle] = useState('');
  
  // Custom Modal State
  const [deleteData, setDeleteData] = useState(null); // { id, type: 'pin' | 'route' }

  useEffect(() => {
    async function fetchData() {
      if(!currentUser) return;
      const [pins, routes] = await Promise.all([
        getUserLocations(currentUser.uid),
        getUserRoutes(currentUser.uid)
      ]);
      setMyPins(pins);
      setMyRoutes(routes);
    }
    fetchData();
  }, [currentUser]);

  const requestDelete = (e, id, type) => {
    e.stopPropagation();
    setDeleteData({ id, type });
  };

  const handleConfirmDelete = async () => {
    if(!deleteData) return;
    const { id, type } = deleteData;
    
    try {
      if(type === 'pin') {
        await deleteLocation(id);
        setMyPins(myPins.filter(pin => pin.id !== id));
      } else {
        await deleteRoute(id);
        setMyRoutes(myRoutes.filter(r => r.id !== id));
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete.");
    }
    setDeleteData(null);
  };

  const handleCreateRoute = async (e) => {
    e.preventDefault();
    if(!newRouteTitle) return;
    try {
      const id = await addRoute(currentUser.uid, newRouteTitle, "");
      setMyRoutes([...myRoutes, { id, title: newRouteTitle, pinIds: [] }]);
      setNewRouteTitle('');
      setIsCreatingRoute(false);
      navigate(`/route/${id}`);
    } catch (err) {
      console.error(err);
      alert("Failed to create route");
    }
  };

  return (
    <div className="page-padding animate-fade-in">
      
      <ConfirmModal 
        isOpen={deleteData !== null}
        title={deleteData?.type === 'pin' ? 'Delete Pin?' : 'Delete Route?'}
        message={deleteData?.type === 'pin' ? 'Are you sure you want to delete this location? This cannot be undone.' : 'Are you sure you want to delete this route? The pins will remain in your collection.'}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteData(null)}
      />

      <h2>My Collection</h2>
      
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid #ddd', marginBottom: '1rem' }}>
        <button 
          onClick={() => setActiveTab('pins')}
          style={{ flex: 1, padding: '10px', background: 'none', border: 'none', borderBottom: activeTab === 'pins' ? '3px solid var(--color-primary)' : '3px solid transparent', fontWeight: activeTab === 'pins' ? 'bold' : 'normal', color: activeTab === 'pins' ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
          📍 My Pins
        </button>
        <button 
          onClick={() => setActiveTab('routes')}
          style={{ flex: 1, padding: '10px', background: 'none', border: 'none', borderBottom: activeTab === 'routes' ? '3px solid var(--color-primary)' : '3px solid transparent', fontWeight: activeTab === 'routes' ? 'bold' : 'normal', color: activeTab === 'routes' ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
          🗺️ My Routes
        </button>
      </div>

      {/* PINS TAB */}
      {activeTab === 'pins' && (
        <div>
          <p className="text-muted mb-4">All your saved locations and historical facts.</p>
          {myPins.length === 0 ? (
            <div className="card text-center text-muted flex flex-col gap-2">
              <span>You haven't saved any pins yet.</span>
              <Link to="/map" className="btn btn-primary mt-2">Go to Map</Link>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {myPins.map(pin => (
                <div 
                  className="card" 
                  key={pin.id} 
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer' }}
                  onClick={() => navigate(`/edit-pin/${pin.id}`)}
                >
                  <div style={{ flex: 1, paddingRight: '10px' }}>
                    <h3 style={{ marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      {pin.title}
                    </h3>
                    <p style={{ marginBottom: '0.5rem', fontSize: '0.95rem' }}>{pin.description}</p>
                    {pin.address && <p style={{ fontSize: '0.85rem' }}>📍 {pin.address}</p>}
                    
                    <div style={{ marginTop: '0.5rem' }}>
                      {pin.originalAuthor ? (
                        <span style={{ fontSize: '0.75rem', background: 'var(--color-bg)', padding: '2px 8px', borderRadius: '10px', color: 'var(--color-primary)' }}>
                          🌟 Copied from Community ({pin.originalAuthor.split('@')[0]})
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', background: '#e8f5e9', padding: '2px 8px', borderRadius: '10px', color: 'var(--color-success)' }}>
                          👤 Created by You
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: '10px' }}>
                    <button 
                      onClick={(e) => requestDelete(e, pin.id, 'pin')} 
                      style={{ background: '#ffeeee', borderRadius: '8px', padding: '10px', border: 'none', color: 'var(--color-error)', cursor: 'pointer', fontSize: '1.2rem' }}
                      title="Delete Pin"
                    >
                      🗑️
                    </button>
                    <span style={{ fontSize: '1.5rem', color: 'var(--color-primary-light)', paddingRight: '10px' }}>›</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ROUTES TAB */}
      {activeTab === 'routes' && (
        <div>
          <p className="text-muted mb-4">Combine pins into sequential routes for your tours.</p>
          
          <button className="btn btn-accent w-full mb-4" onClick={() => setIsCreatingRoute(!isCreatingRoute)}>
            {isCreatingRoute ? 'Cancel' : '+ New Route'}
          </button>

          {isCreatingRoute && (
            <div className="card mb-4">
              <form onSubmit={handleCreateRoute} className="flex gap-2">
                <input 
                  type="text" 
                  autoFocus
                  placeholder="e.g. History Light Tour" 
                  value={newRouteTitle}
                  onChange={e => setNewRouteTitle(e.target.value)}
                  style={{ flex: 1 }}
                  required
                />
                <button type="submit" className="btn btn-primary">Create</button>
              </form>
            </div>
          )}

          {myRoutes.length === 0 && !isCreatingRoute ? (
             <div className="card text-center text-muted">You don't have any routes yet.</div>
          ) : (
            <div className="flex flex-col gap-4">
              {myRoutes.map(route => (
                <div 
                  className="card" 
                  key={route.id} 
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderLeft: `6px solid ${route.color || 'var(--color-primary)'}` }}
                  onClick={() => navigate(`/route/${route.id}`)}
                >
                  <div>
                    <h3 style={{ margin: 0, color: route.color || 'var(--color-primary)' }}>{route.title}</h3>
                    <p className="text-muted" style={{ fontSize: '0.85rem' }}>{route.pinIds?.length || 0} locations</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                     <button 
                        onClick={(e) => requestDelete(e, route.id, 'route')}
                        style={{ background: '#ffeeee', borderRadius: '8px', padding: '6px 10px', border: 'none', color: 'var(--color-error)', cursor: 'pointer', fontSize: '1rem' }}
                        title="Delete Route"
                     >
                        🗑️
                     </button>
                     <span style={{ fontSize: '1.5rem', color: route.color || 'var(--color-primary)' }}>›</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default MyCollection;
