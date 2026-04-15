import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import MapViewer from './components/MapViewer';
import { getUserLocations, getCommunityLocations, addLocation, getUserRoutes } from './services/firestore';

// Page Imports
import MyCollection from './pages/MyCollection';
import RouteDetail from './pages/RouteDetail';
import EditPin from './pages/EditPin';

// Protected Route Component
const PrivateRoute = ({ children }) => {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/login" />;
};

// Pages
const Home = () => {
  const { currentUser } = useAuth();
  return (
    <div className="page-padding animate-fade-in">
      <h1>Welcome to SkipperNotes</h1>
      <p>Your personal logbook for the best routes, stories, and facts through Amsterdam.</p>
      <div className="card mt-4">
        <h3 className="mb-2">Your Account</h3>
        <p className="text-muted">Logged in as: {currentUser?.email}</p>
      </div>
      <div className="flex flex-col gap-4 mt-4">
        <Link to="/map" className="btn btn-primary w-full">View Map</Link>
        <Link to="/community" className="btn btn-accent w-full">Discover Community Stories</Link>
      </div>
    </div>
  );
};

const MapPage = () => {
  const { currentUser } = useAuth();
  const [locations, setLocations] = useState([]);
  const [routes, setRoutes] = useState([]);

  useEffect(() => {
    async function fetchData() {
      if(!currentUser) return;
      const [pinsData, routesData] = await Promise.all([
         getUserLocations(currentUser.uid),
         getUserRoutes(currentUser.uid)
      ]);
      setLocations(pinsData);
      setRoutes(routesData);
    }
    fetchData();
  }, [currentUser]);

  return <MapViewer locations={locations} routes={routes} />;
};

const Community = () => {
  const { currentUser } = useAuth();
  const [communityPins, setCommunityPins] = useState([]);
  const [loadingId, setLoadingId] = useState(null);

  useEffect(() => {
    async function fetchCommunity() {
      if(!currentUser) return;
      const data = await getCommunityLocations(currentUser.uid);
      setCommunityPins(data);
    }
    fetchCommunity();
  }, [currentUser]);

  const handleCopy = async (pin) => {
    setLoadingId(pin.id);
    try {
      await addLocation(currentUser.uid, currentUser.email, {
        title: pin.title,
        description: pin.description,
        address: pin.address || '',
        lat: pin.lat,
        lng: pin.lng,
        originalAuthor: pin.authorEmail // keep reference
      });
      alert(`"${pin.title}" has been added to your collection!`);
    } catch (err) {
      console.error(err);
      alert("Failed to copy.");
    }
    setLoadingId(null);
  };

  return (
    <div className="page-padding animate-fade-in">
      <h2>Community Stories</h2>
      <p className="text-muted mb-4">Discover facts, locations and stories shared by other skippers.</p>
      
      {communityPins.length === 0 ? (
        <div className="card text-center text-muted mt-4">No community pins found yet.</div>
      ) : (
        <div className="flex flex-col gap-4 mt-4">
          {communityPins.map(pin => (
            <div className="card" key={pin.id}>
              <h3>{pin.title}</h3>
              <p>{pin.description}</p>
              {pin.address && <p style={{ fontSize: '0.85rem' }}>📍 {pin.address}</p>}
              <p style={{ fontSize: '0.8rem', color: 'gray', marginTop: '5px' }}>
                Shared by: {pin.authorEmail?.split('@')[0]}
              </p>
              <button 
                className="btn btn-outline mt-4 w-full" 
                onClick={() => handleCopy(pin)}
                disabled={loadingId === pin.id}
              >
                {loadingId === pin.id ? 'Adding...' : '+ Add to my collection'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, currentUser } = useAuth();
  const navigate = useNavigate();

  if (currentUser) {
    return <Navigate to="/" />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError('Login failed. Check your password or email.');
    }
    setLoading(false);
  };

  return (
    <div className="centered-page animate-fade-in">
      <div className="card login-card">
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚓</div>
        <h1 style={{ marginBottom: '0.5rem' }}>SkipperNotes</h1>
        <p className="text-muted mb-4">Log in to continue</p>
        
        {error && <div style={{ color: 'var(--color-error)', marginBottom: '1rem', background: '#ffebee', padding: '0.5rem', borderRadius: '8px' }}>{error}</div>}
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
          <div>
            <label className="label">Email Address</label>
            <input 
              type="email" 
              placeholder="skipper@flagship.nl" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>
          <button disabled={loading} type="submit" className="btn btn-primary w-full mt-4">Login</button>
        </form>
      </div>
    </div>
  );
};

const Navbar = () => {
  const location = useLocation();
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  if (!currentUser) return null;

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  return (
    <>
      <nav className="top-header">
        <Link to="/" className="navbar-brand">
          ⚓ SkipperNotes
        </Link>
        <div className="nav-links-desktop">
          <Link to="/map" className={location.pathname === '/map' ? 'nav-link active' : 'nav-link'}>Map</Link>
          <Link to="/collection" className={location.pathname.includes('/collection') || location.pathname.includes('/route') ? 'nav-link active' : 'nav-link'}>My Collection</Link>
          <Link to="/community" className={location.pathname === '/community' ? 'nav-link active' : 'nav-link'}>Community</Link>
          <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }}>Logout</button>
        </div>
        <button onClick={handleLogout} className="btn btn-outline mobile-logout">Logout</button>
      </nav>
      
      <div className="nav-links-mobile">
        <Link to="/map" className={location.pathname === '/map' ? 'nav-link active' : 'nav-link'}>
          <span style={{ fontSize: '1.2rem' }}>🗺️</span>
          Map
        </Link>
        <Link to="/collection" className={location.pathname.includes('/collection') || location.pathname.includes('/route') ? 'nav-link active' : 'nav-link'}>
          <span style={{ fontSize: '1.2rem' }}>📚</span>
          Collection
        </Link>
        <Link to="/community" className={location.pathname === '/community' ? 'nav-link active' : 'nav-link'}>
          <span style={{ fontSize: '1.2rem' }}>👥</span>
          Community
        </Link>
      </div>
    </>
  );
};

function App() {
  return (
    <div className="app-container">
      <Navbar />
      <div className="content-container">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
          <Route path="/map" element={<PrivateRoute><MapPage /></PrivateRoute>} />
          <Route path="/community" element={<PrivateRoute><Community /></PrivateRoute>} />
          {/* New Route Architecture Paths */}
          <Route path="/collection" element={<PrivateRoute><MyCollection /></PrivateRoute>} />
          <Route path="/route/:id" element={<PrivateRoute><RouteDetail /></PrivateRoute>} />
          <Route path="/edit-pin/:id" element={<PrivateRoute><EditPin /></PrivateRoute>} />
          {/* Fallback old link */}
          <Route path="/routes" element={<Navigate to="/collection" />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
