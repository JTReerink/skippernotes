import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { addLocation } from '../services/firestore';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icon for the user
const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const defaultIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Custom generated icon for numbered route pins
const createNumberedIcon = (number, color) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-family: sans-serif; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); position: relative;">
            ${number}
            <div style="position: absolute; bottom: -5px; width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 6px solid ${color};"></div>
          </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 36],
    popupAnchor: [0, -36]
  });
};

const getCommunityColor = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Generate HSL colors to ensure they are visually pleasing & vibrant
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 45%)`;
};

const MapClickHandler = ({ onAddPin, isAddMode }) => {
  useMapEvents({
    click(e) {
      if (isAddMode) onAddPin(e.latlng);
    },
  });
  return null;
};

const MapViewer = ({ locations = [], routes = [] }) => {
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);
  const [newPin, setNewPin] = useState(null); // {lat, lng}
  const [isAddMode, setIsAddMode] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);

  // Auto-hide onboarding tooltip after 12 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowTooltip(false), 12000);
    return () => clearTimeout(timer);
  }, []);

  // Form States
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Route Filtering
  const [activeRouteId, setActiveRouteId] = useState('all');

  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const mapRef = useRef();
  const defaultPosition = [52.3727, 4.8936]; // Dam Square, Amsterdam City Center

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => setError(err.message),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

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
    setNewPin({ lat, lng });

    // Center map
    if (mapRef.current) {
      mapRef.current.setView([lat, lng], 17);
    }

    setShowSuggestions(false);
  };

  const handleMapClick = (latlng) => {
    if (isSaving) return;
    setNewPin(latlng);
  };

  const handleSavePin = async (e) => {
    e.preventDefault();
    if (!title) return;
    setIsSaving(true);
    try {
      await addLocation(currentUser.uid, currentUser.email, {
        title,
        description,
        address,
        lat: newPin.lat,
        lng: newPin.lng
      });
      setNewPin(null);
      setTitle('');
      setDescription('');
      setAddress('');
      setSearchTerm('');
      setIsAddMode(false);
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Failed to save location.");
    }
    setIsSaving(false);
  };

  // Determine which pins to show based on Route filter
  const activeRoute = routes.find(r => r.id === activeRouteId);
  let displayedLocations = locations;

  if (activeRoute) {
    // Ensure we order them as they appear in the route array
    displayedLocations = (activeRoute.pinIds || []).map(id => locations.find(l => l.id === id)).filter(Boolean);
  }

  return (
    <div className="map-container">
      {/* Route Filter Dropdown Top-Left */}
      <div style={{ position: 'absolute', top: '1rem', left: '1rem', zIndex: 1000 }}>
        <select
          value={activeRouteId}
          onChange={(e) => setActiveRouteId(e.target.value)}
          style={{ padding: '0.5rem', borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-md)', fontWeight: 'bold', background: 'white' }}
        >
          <option value="all">📍 All Locations</option>
          {routes.map(r => (
            <option key={r.id} value={r.id}>🛳️ {r.title}</option>
          ))}
        </select>
      </div>

      {/* Top Banner mapping mode */}
      {isAddMode && !newPin && (
        <div style={{ position: 'absolute', top: '1rem', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'var(--color-primary)', color: 'white', padding: '0.5rem 1rem', borderRadius: '20px', boxShadow: 'var(--shadow-md)', fontWeight: '600', fontSize: '0.9rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>Tap on the map to add a pin</span>
          <button onClick={() => setIsAddMode(false)} style={{ background: 'none', border: 'none', color: 'white', fontWeight: 'bold', fontSize: '1.2rem', marginLeft: '0.5rem', cursor: 'pointer' }}>×</button>
        </div>
      )}

      <MapContainer
        center={defaultPosition}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
        zoomControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapClickHandler onAddPin={handleMapClick} isAddMode={isAddMode} />

        {position && (
          <Marker position={[position.lat, position.lng]} icon={userIcon}>
            <Popup>Your Location</Popup>
          </Marker>
        )}

        {/* Existing Locations */}
        {displayedLocations.map((loc, index) => {
          // If a route is active, create a dynamic icon based on route. Else use default.
          let icon = defaultIcon;
          if (activeRoute) {
            icon = createNumberedIcon(index + 1, activeRoute.color || '#000000');
          } else if (!currentUser) {
            // We are visitors looking at the global community pool.
            icon = createNumberedIcon('📍', getCommunityColor(loc.authorId || loc.authorEmail || 'unknown'));
          }
          return (
            <Marker key={loc.id} position={[loc.lat, loc.lng]} icon={icon}>
              <Popup>
                <strong>{loc.title}</strong>
                <p>{loc.description}</p>
                {loc.address && <p style={{ fontSize: '0.85rem' }}>📍 {loc.address}</p>}
                <i style={{ fontSize: '0.8rem', color: 'gray' }}>By: {loc.authorName || loc.authorEmail?.split('@')[0]}</i>
                {loc.authorId === currentUser?.uid && (
                  <button
                    onClick={() => navigate(`/edit-pin/${loc.id}`)}
                    className="btn btn-primary"
                    style={{ marginTop: '10px', width: '100%', padding: '5px' }}>
                    Edit Pin
                  </button>
                )}
              </Popup>
            </Marker>
          );
        })}

        {/* Temporary new pin */}
        {newPin && (
          <Marker position={[newPin.lat, newPin.lng]} icon={defaultIcon} />
        )}
      </MapContainer>

      {/* Primary Action Button Container */}
      <div style={{ position: 'absolute', bottom: 'calc(var(--bottom-nav-height, 0px) + 1.5rem)', right: '1.5rem', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {/* Toggle Add Pin Mode Button (using the requested blue icon) */}
        {!isAddMode && !newPin && (
          <div style={{ position: 'relative' }}>
            {showTooltip && (
               <div className="onboarding-tooltip" onClick={() => setShowTooltip(false)}>
                  Remember a spot!
               </div>
            )}
            <button
              className="btn btn-primary gps-button"
              style={{ padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-lg)' }}
              onClick={() => {
                setShowTooltip(false);
                if (!currentUser) {
                  if (window.confirm("Please log in or create an account to save custom pins and routes. Go to Login?")) {
                    navigate('/login');
                  }
                } else {
                  setIsAddMode(true);
                }
              }}
              title="Add a new pin"
            >
              📍
            </button>
          </div>
        )}
      </div>

      {/* Mobile First Bottom Sheet for Adding Pins */}
      <div className={`bottom-sheet ${newPin ? 'open' : ''}`}>
        {newPin && (
          <form onSubmit={handleSavePin} className="flex flex-col gap-2 relative">
            <h3 style={{ margin: '0 0 5px 0', fontSize: '1.2rem' }}>New Location</h3>
            <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '10px' }}>Enter details or search a known spot.</p>

            <div style={{ position: 'relative' }}>
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
                        style={{ padding: '0.8rem', borderBottom: '1px solid #f1f1f1', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}
                      >
                        <strong style={{ fontSize: '0.9rem' }}>{place.name || place.display_name.split(',')[0]}</strong>
                        <span style={{ fontSize: '0.75rem', color: 'gray' }}>{place.display_name}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <input
              type="text"
              placeholder="Address (optional)"
              value={address}
              onChange={e => setAddress(e.target.value)}
            />
            <textarea
              placeholder="Facts or Story (optional)"
              value={description}
              onChange={e => setDescription(e.target.value)}
              style={{ minHeight: '80px', marginTop: '5px' }}
            />
            <div className="flex gap-2 mt-4">
              <button type="button" onClick={() => setNewPin(null)} className="btn btn-outline" style={{ flex: 1, padding: '0.8rem' }}>
                Cancel
              </button>
              <button type="submit" disabled={isSaving} className="btn btn-primary" style={{ flex: 1, padding: '0.8rem' }}>
                {isSaving ? 'Saving...' : 'Save Pin'}
              </button>
            </div>
          </form>
        )}
      </div>

    </div>
  );
};

export default MapViewer;
