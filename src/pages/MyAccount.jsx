import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserProfile, updateUserProfile } from '../services/firestore';

const MyAccount = () => {
   const { currentUser } = useAuth();
   const navigate = useNavigate();

   const [displayName, setDisplayName] = useState('');
   const [bio, setBio] = useState('');
   const [employer, setEmployer] = useState('');
   
   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);

   useEffect(() => {
      async function loadProfile() {
         if (!currentUser) return;
         const profile = await getUserProfile(currentUser.uid);
         if (profile) {
            setDisplayName(profile.displayName || '');
            setBio(profile.bio || '');
            setEmployer(profile.employer || '');
         }
         setLoading(false);
      }
      loadProfile();
   }, [currentUser]);

   const handleSave = async (e) => {
      e.preventDefault();
      if (!currentUser) return;
      setSaving(true);
      try {
         await updateUserProfile(currentUser.uid, {
            displayName,
            bio,
            employer
         });
         alert("Profile successfully updated!");
         // Optionally navigate away, though staying on the page is fine.
         navigate('/community');
      } catch (err) {
         console.error(err);
         alert("Failed to save profile.");
      }
      setSaving(false);
   };

   if (loading) return <div className="page-padding text-center">Loading profile...</div>;

   return (
      <div className="page-padding animate-fade-in" style={{ paddingBottom: '80px' }}>
         <button className="btn btn-outline mb-4" onClick={() => navigate(-1)}>← Back</button>
         
         <h2>My Account</h2>
         <p className="text-muted mb-4">Manage your public information and identity.</p>

         <div className="card">
            <form onSubmit={handleSave} className="flex flex-col gap-4">
               <div>
                  <label className="label">Registered Email</label>
                  <input 
                     type="email" 
                     value={currentUser?.email || ''} 
                     disabled 
                     style={{ background: '#f5f5f5', color: '#888' }}
                  />
                  <small className="text-muted">Emails cannot be changed directly.</small>
               </div>
               
               <div>
                  <label className="label">Display Name *</label>
                  <input 
                     type="text" 
                     value={displayName}
                     onChange={e => setDisplayName(e.target.value)}
                     required 
                     placeholder="e.g. Captain Jan"
                  />
               </div>

               <div>
                  <label className="label">Employer / Shipping Company</label>
                  <input 
                     type="text" 
                     value={employer}
                     onChange={e => setEmployer(e.target.value)}
                     placeholder="e.g. Flagship Amsterdam"
                  />
               </div>

               <div>
                  <label className="label">Bio / About Me</label>
                  <textarea 
                     value={bio}
                     onChange={e => setBio(e.target.value)}
                     placeholder="A short sentence about yourself or the ship you sail..."
                     style={{ minHeight: '100px' }}
                  />
               </div>

               <button type="submit" className="btn btn-primary mt-4" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Profile'}
               </button>
            </form>
         </div>
      </div>
   );
};

export default MyAccount;
