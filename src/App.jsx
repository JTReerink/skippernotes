import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import MapViewer from './components/MapViewer';
import { getUserLocations, getCommunityLocations, addLocation, getUserRoutes } from './services/firestore';

// Page Imports
import MyCollection from './pages/MyCollection';
import RouteDetail from './pages/RouteDetail';
import EditPin from './pages/EditPin';
import Community from './pages/Community';
import ViewPin from './pages/ViewPin';
import UserProfile from './pages/UserProfile';
import MyAccount from './pages/MyAccount';

// Protected Route Component
const PrivateRoute = ({ children }) => {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/login" />;
};

// Pages
const MapPage = () => {
  const { currentUser } = useAuth();
  const [locations, setLocations] = useState([]);
  const [routes, setRoutes] = useState([]);

  useEffect(() => {
    async function fetchData() {
      if(currentUser) {
         const [pinsData, routesData] = await Promise.all([
            getUserLocations(currentUser.uid),
            getUserRoutes(currentUser.uid)
         ]);
         setLocations(pinsData);
         setRoutes(routesData);
      } else {
         const globalPins = await getCommunityLocations(null);
         setLocations(globalPins);
         setRoutes([]);
      }
    }
    fetchData();
  }, [currentUser]);

  return <MapViewer locations={locations} routes={routes} />;
};

// Community component moved to pages/Community.jsx

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
          <Link to="/" className={location.pathname === '/' ? 'nav-link active' : 'nav-link'}>Map</Link>
          {currentUser && (
            <>
              <Link to="/collection" className={location.pathname.includes('/collection') || location.pathname.includes('/route') ? 'nav-link active' : 'nav-link'}>My Collection</Link>
              <Link to="/community" className={location.pathname === '/community' ? 'nav-link active' : 'nav-link'}>Community</Link>
              <Link to="/account" className={location.pathname === '/account' ? 'nav-link active' : 'nav-link'}>Profile</Link>
            </>
          )}
          {currentUser ? (
              <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '0.4rem 1rem', fontSize: '0.9rem', marginLeft: '10px' }}>Logout</button>
          ) : (
             <Link to="/login" className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }}>Login / Register</Link>
          )}
        </div>
        {currentUser ? (
           <button onClick={handleLogout} className="btn btn-outline mobile-logout">Logout</button>
        ) : (
           <Link to="/login" className="btn btn-primary mobile-logout" style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }}>Login</Link>
        )}
      </nav>
      
      <div className="nav-links-mobile">
        <Link to="/" className={location.pathname === '/' ? 'nav-link active' : 'nav-link'}>
          <span style={{ fontSize: '1.2rem' }}>🗺️</span>
          Map
        </Link>
        {currentUser && (
           <>
              <Link to="/collection" className={location.pathname.includes('/collection') || location.pathname.includes('/route') ? 'nav-link active' : 'nav-link'}>
                <span style={{ fontSize: '1.2rem' }}>📚</span>
                Collection
              </Link>
              <Link to="/community" className={location.pathname === '/community' ? 'nav-link active' : 'nav-link'}>
                <span style={{ fontSize: '1.2rem' }}>👥</span>
                Community
              </Link>
              <Link to="/account" className={location.pathname === '/account' ? 'nav-link active' : 'nav-link'}>
                <span style={{ fontSize: '1.2rem' }}>👤</span>
                Profile
              </Link>
           </>
        )}
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
          <Route path="/" element={<MapPage />} />
          <Route path="/account" element={<PrivateRoute><MyAccount /></PrivateRoute>} />
          <Route path="/community" element={<PrivateRoute><Community /></PrivateRoute>} />
          <Route path="/community-pin/:id" element={<PrivateRoute><ViewPin /></PrivateRoute>} />
          <Route path="/user/:id" element={<PrivateRoute><UserProfile /></PrivateRoute>} />
          <Route path="/collection" element={<PrivateRoute><MyCollection /></PrivateRoute>} />
          <Route path="/route/:id" element={<PrivateRoute><RouteDetail /></PrivateRoute>} />
          <Route path="/edit-pin/:id" element={<PrivateRoute><EditPin /></PrivateRoute>} />
          <Route path="/routes" element={<Navigate to="/collection" />} />
          <Route path="/map" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
