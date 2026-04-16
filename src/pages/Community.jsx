import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCommunityLocations, getUserProfile, searchUsersByEmail, acceptFriendRequest, getUserLocations } from '../services/firestore';
import { useAuth } from '../context/AuthContext';

const Community = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('global'); // 'global', 'friends', 'requests'
  
  const [communityPins, setCommunityPins] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [myLocations, setMyLocations] = useState([]);

  useEffect(() => {
    async function fetchData() {
      if(!currentUser) return;
      // Get all global pins
      const data = await getCommunityLocations(currentUser.uid);
      setCommunityPins(data);
      
      const myLocs = await getUserLocations(currentUser.uid);
      setMyLocations(myLocs);
      
      // Get Current User Profile for friends/requests list
      const profile = await getUserProfile(currentUser.uid);
      if(profile) {
         setUserProfile(profile);
         
         // Fetch data for the people sending requests
         if(profile.friendRequests && profile.friendRequests.length > 0) {
            const requestsData = await Promise.all(
               profile.friendRequests.map(id => getUserProfile(id))
            );
            setIncomingRequests(requestsData.filter(Boolean));
         }
      }
    }
    fetchData();
  }, [currentUser]);

  useEffect(() => {
     const timer = setTimeout(async () => {
        if (!searchEmail || searchEmail.length < 3) {
           setSearchResults([]);
           return;
        }
        const results = await searchUsersByEmail(searchEmail);
        setSearchResults(results.filter(u => u.id !== currentUser?.uid));
     }, 300);
     return () => clearTimeout(timer);
  }, [searchEmail, currentUser]);
  
  const handleAcceptRequest = async (senderId) => {
     if(!currentUser) return;
     await acceptFriendRequest(currentUser.uid, senderId);
     alert("Friend request accepted!");
     window.location.reload();
  };

  const friendsList = userProfile?.friends || [];
  
  // Filtering logic
  const friendPins = communityPins.filter(pin => friendsList.includes(pin.authorId));

  const isCollected = (pin) => {
    return myLocations.some(l => l.originalPinId === pin.id || (l.title === pin.title && l.lat === pin.lat));
  };

  return (
    <div className="page-padding animate-fade-in" style={{ paddingBottom: '90px' }}>
      <h2>Community Hub</h2>
      <p className="text-muted mb-4">Discover facts and skippers.</p>
      
      <div style={{ display: 'flex', borderBottom: '2px solid #ddd', marginBottom: '1rem', overflowX: 'auto', whiteSpace: 'nowrap' }}>
        <button 
          onClick={() => setActiveTab('global')}
          style={{ flex: 1, padding: '10px', background: 'none', border: 'none', borderBottom: activeTab === 'global' ? '3px solid var(--color-primary)' : '3px solid transparent', fontWeight: activeTab === 'global' ? 'bold' : 'normal', color: activeTab === 'global' ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
          🌍 Global
        </button>
        <button 
          onClick={() => setActiveTab('friends')}
          style={{ flex: 1, padding: '10px', background: 'none', border: 'none', borderBottom: activeTab === 'friends' ? '3px solid var(--color-primary)' : '3px solid transparent', fontWeight: activeTab === 'friends' ? 'bold' : 'normal', color: activeTab === 'friends' ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
          👥 Friends
        </button>
        <button 
          onClick={() => setActiveTab('requests')}
          style={{ flex: 1, padding: '10px', background: 'none', border: 'none', borderBottom: activeTab === 'requests' ? '3px solid var(--color-primary)' : '3px solid transparent', fontWeight: activeTab === 'requests' ? 'bold' : 'normal', color: activeTab === 'requests' ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
          🔔 Requests {(userProfile?.friendRequests?.length > 0) && `(${userProfile.friendRequests.length})`}
        </button>
      </div>

      {/* GLOBAL TAB */}
      {activeTab === 'global' && (
         <div className="flex flex-col gap-4">
            {communityPins.length === 0 ? (
               <div className="card text-center text-muted">No community pins found yet.</div>
            ) : (
               communityPins.map(pin => {
                  const isFriend = friendsList.includes(pin.authorId);
                  return (
                     <div className="card" key={pin.id} style={{ border: isFriend ? '2px solid var(--color-primary)' : 'none' }}>
                        <Link to={`/community-pin/${pin.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                           <h3 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>{pin.title}</span>
                              {isCollected(pin) && <span style={{ fontSize: '0.7rem', background: '#e8f5e9', color: 'var(--color-success, green)', padding: '3px 8px', borderRadius: '12px', fontWeight: 'bold' }}>✓ Collected</span>}
                           </h3>
                           <p style={{ margin: '5px 0', fontSize: '0.9rem' }}>{pin.description}</p>
                           {pin.address && <p style={{ fontSize: '0.85rem', color: 'gray' }}>📍 {pin.address}</p>}
                        </Link>
                        <p style={{ fontSize: '0.85rem', marginTop: '10px', display: 'flex', alignItems: 'center' }}>
                           👤 By:{' '}
                           <Link to={`/user/${pin.authorId}`} style={{ color: isFriend ? 'var(--color-primary)' : 'gray', fontWeight: isFriend ? 'bold' : 'normal', marginLeft: '5px', textDecoration: 'none' }}>
                             {pin.authorName || pin.authorEmail?.split('@')[0]} {isFriend && '⭐'}
                           </Link>
                        </p>
                     </div>
                  )
               })
            )}
         </div>
      )}

      {/* FRIENDS TAB */}
      {activeTab === 'friends' && (
         <div className="flex flex-col gap-4">
            {friendPins.length === 0 ? (
               <div className="card text-center text-muted">Your friends haven't shared any locations yet.</div>
            ) : (
               friendPins.map(pin => (
                  <div className="card" key={pin.id}>
                     <Link to={`/community-pin/${pin.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <h3 style={{ color: 'var(--color-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                           <span>{pin.title}</span>
                           {isCollected(pin) && <span style={{ fontSize: '0.7rem', background: '#e8f5e9', color: 'var(--color-success, green)', padding: '3px 8px', borderRadius: '12px', fontWeight: 'bold' }}>✓ Collected</span>}
                        </h3>
                        <p style={{ margin: '5px 0', fontSize: '0.9rem' }}>{pin.description}</p>
                     </Link>
                     <p style={{ fontSize: '0.85rem', marginTop: '10px' }}>
                        👤 Friend:{' '}
                        <Link to={`/user/${pin.authorId}`} style={{ color: 'var(--color-primary)', fontWeight: 'bold', textDecoration: 'none' }}>
                          {pin.authorName || pin.authorEmail?.split('@')[0]}
                        </Link>
                     </p>
                  </div>
               ))
            )}
         </div>
      )}

      {/* REQUESTS & SEARCH TAB */}
      {activeTab === 'requests' && (
         <div className="flex flex-col gap-4">
            
            <div className="card" style={{ background: '#f5f7ff' }}>
               <h3 style={{ margin: '0 0 10px 0' }}>Add a Friend</h3>
               <div className="flex gap-2">
                  <input 
                     type="email" 
                     placeholder="Start typing an email..." 
                     value={searchEmail}
                     onChange={e => setSearchEmail(e.target.value)}
                     style={{ flex: 1 }}
                  />
               </div>

               {searchEmail.length >= 3 && searchResults.length === 0 ? (
                  <p className="text-muted mt-2" style={{ fontSize: '0.85rem' }}>No user found.</p>
               ) : searchResults.length > 0 && (
                  <div className="mt-4 flex flex-col gap-2">
                     {searchResults.map(user => (
                        <div key={user.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '10px', borderRadius: '8px' }}>
                           <span>{user.displayName}</span>
                           <Link to={`/user/${user.id}`} className="btn btn-outline" style={{ padding: '5px 10px', fontSize: '0.8rem' }}>View Profile</Link>
                        </div>
                     ))}
                  </div>
               )}
            </div>

            <h3 style={{ marginTop: '10px' }}>Incoming Requests ({incomingRequests.length})</h3>
            {incomingRequests.length === 0 ? (
               <p className="text-muted text-sm">You have no new requests.</p>
            ) : (
               incomingRequests.map(reqUser => (
                  <div className="card" key={reqUser.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <div>
                        <strong>{reqUser.displayName}</strong>
                        <div className="text-muted" style={{ fontSize: '0.8rem' }}>{reqUser.email}</div>
                     </div>
                     <button onClick={() => handleAcceptRequest(reqUser.id)} className="btn btn-primary" style={{ padding: '8px' }}>Accept</button>
                  </div>
               ))
            )}
         </div>
      )}
    </div>
  );
};

export default Community;
