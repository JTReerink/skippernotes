import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getUserProfile, getUserRoutes, getUserLocations, sendFriendRequest } from '../services/firestore';
import { useAuth } from '../context/AuthContext';

const UserProfile = () => {
  const { id } = useParams(); // User ID
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [profile, setProfile] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [pins, setPins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionStatus, setActionStatus] = useState(null); // 'sending', 'sent', 'friends'

  useEffect(() => {
    async function fetchData() {
      if(!id) return;
      const [profData, rData, pData] = await Promise.all([
        getUserProfile(id),
        getUserRoutes(id),
        getUserLocations(id)
      ]);
      setProfile(profData);
      setRoutes(rData);
      
      // Only show organically authored public pins (no copies)
      const publicPins = pData.filter(pin => pin.isPublic && !pin.originalAuthor);
      setPins(publicPins);
      
      setLoading(false);
      
      if (profData && currentUser) {
         if ((profData.friends || []).includes(currentUser.uid)) {
            setActionStatus('friends');
         } else if ((profData.friendRequests || []).includes(currentUser.uid)) {
            setActionStatus('sent');
         }
      }
    }
    fetchData();
  }, [id, currentUser]);

  const handleAddFriend = async () => {
     if(!currentUser || !profile) return;
     setActionStatus('sending');
     await sendFriendRequest(currentUser.uid, profile.id);
     setActionStatus('sent');
  };

  if(loading) return <div className="page-padding text-center">Loading profile...</div>;

  if(!profile) return (
     <div className="page-padding text-center">
        <h2>User not found</h2>
        <button className="btn btn-outline mt-4" onClick={() => navigate(-1)}>Go Back</button>
     </div>
  );

  const isSelf = currentUser && currentUser.uid === profile.id;

  return (
    <div className="page-padding animate-fade-in" style={{ paddingBottom: '80px' }}>
      <button className="btn btn-outline mb-4" onClick={() => navigate(-1)}>← Back</button>
      
      <div className="card text-center mb-4">
         <div style={{ fontSize: '3rem', marginBottom: '10px' }}>👤</div>
         <h2 style={{ margin: '0' }}>{profile.displayName}</h2>
         {profile.employer && <p style={{ fontWeight: 'bold', color: 'var(--color-primary)', margin: '5px 0' }}>⚓ {profile.employer}</p>}
         <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>{profile.email}</p>
         {profile.bio && <p style={{ fontStyle: 'italic', background: '#f5f7ff', padding: '10px', borderRadius: '8px', marginBottom: '1rem' }}>"{profile.bio}"</p>}
         
         {!isSelf && (
            <button 
               className={`btn ${actionStatus === 'friends' ? 'btn-outline' : 'btn-primary'}`} 
               style={{ width: '100%' }}
               onClick={handleAddFriend}
               disabled={actionStatus === 'sent' || actionStatus === 'friends' || actionStatus === 'sending'}
            >
               {actionStatus === 'friends' ? '✓ Friends' 
                  : actionStatus === 'sent' ? 'Request Sent' 
                  : actionStatus === 'sending' ? 'Sending...' 
                  : '+ Add Friend'}
            </button>
         )}
      </div>

      <h3 className="mb-2">Public Routes</h3>
      {routes.length === 0 ? (
         <p className="text-muted text-sm mb-4">No public routes available.</p>
      ) : (
         <div className="flex flex-col gap-3 mb-4">
            {routes.map(route => (
               <div className="card" key={route.id} style={{ borderLeft: `5px solid ${route.color || '#ddd'}` }}>
                  <h4 style={{ margin: '0 0 5px 0' }}>{route.title}</h4>
                  <p className="text-muted" style={{ fontSize: '0.85rem' }}>{route.pinIds?.length || 0} locations</p>
               </div>
            ))}
         </div>
      )}

      <h3 className="mb-2">Public Locations</h3>
      {pins.length === 0 ? (
         <p className="text-muted text-sm">No public locations available.</p>
      ) : (
         <div className="flex flex-col gap-3">
            {pins.map(pin => (
               <div className="card" key={pin.id} >
                  <Link to={`/community-pin/${pin.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                     <h4 style={{ margin: '0 0 5px 0', color: 'var(--color-primary)' }}>{pin.title}</h4>
                     <p style={{ margin: 0, fontSize: '0.9rem' }}>{pin.description}</p>
                     {pin.address && <p className="text-muted" style={{ margin: '5px 0 0 0', fontSize: '0.8rem' }}>📍 {pin.address}</p>}
                  </Link>
               </div>
            ))}
         </div>
      )}

    </div>
  );
};

export default UserProfile;
