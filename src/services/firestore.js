import { collection, addDoc, getDocs, query, where, serverTimestamp, doc, setDoc, deleteDoc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

// Collection ref
const locationsRef = collection(db, "locations");
const routesRef = collection(db, "routes");

// --- LOCATIONS ---

export async function addLocation(authorId, authorEmail, locationData) {
  try {
    const docRef = await addDoc(locationsRef, {
      ...locationData, // title, description, lat, lng, address (optional)
      authorId,
      authorEmail,
      createdAt: serverTimestamp(),
      isPublic: locationData.originalAuthor ? false : true // copies are private by default
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding document: ", error);
    throw error;
  }
}

export async function updateLocation(id, dataToUpdate) {
  try {
    const docRef = doc(db, "locations", id);
    await updateDoc(docRef, dataToUpdate);
  } catch (error) {
    console.error("Error updating location: ", error);
    throw error;
  }
}

export async function getLocation(id) {
  try {
    const docRef = doc(db, "locations", id);
    const snap = await getDoc(docRef);
    if(snap.exists()){
      return { id: snap.id, ...snap.data() };
    }
    return null;
  } catch (error) {
    console.error("Error getting location: ", error);
    throw error;
  }
}

export async function getUserLocations(userId) {
  try {
    const q = query(locationsRef, where("authorId", "==", userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting user locations: ", error);
    throw error;
  }
}

export async function getCommunityLocations(currentUserId) {
  try {
    const q = query(locationsRef, where("isPublic", "==", true));
    const querySnapshot = await getDocs(q);
    const allPublic = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Filter out our own, and filter out COPIED pins
    return allPublic.filter(loc => loc.authorId !== currentUserId && !loc.originalAuthor);
  } catch (error) {
    console.error("Error getting community locations: ", error);
    throw error;
  }
}

export async function deleteLocation(id) {
  try {
    const docRef = doc(db, "locations", id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting location: ", error);
    throw error;
  }
}

// --- ROUTES ---

export async function addRoute(authorId, title, description) {
  const defaultColors = ['#0A2463', '#FFC436', '#E5383B', '#38B000', '#D81159', '#4A4E69', '#FF9F1C', '#8338EC', '#00B4D8'];
  const randomColor = defaultColors[Math.floor(Math.random() * defaultColors.length)];

  try {
    const docRef = await addDoc(routesRef, {
      authorId,
      title,
      description,
      pinIds: [], // array of location IDs
      color: randomColor, // Map pin color
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding route: ", error);
    throw error;
  }
}

export async function getUserRoutes(userId) {
  try {
    const q = query(routesRef, where("authorId", "==", userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting routes: ", error);
    throw error;
  }
}

export async function getRoute(routeId) {
  try {
    const docRef = doc(db, "routes", routeId);
    const snap = await getDoc(docRef);
    if(snap.exists()){
      return { id: snap.id, ...snap.data() };
    }
    return null;
  } catch (error) {
    console.error("Error getting route: ", error);
    throw error;
  }
}

export async function updateRoute(id, dataToUpdate) {
  try {
    const docRef = doc(db, "routes", id);
    await updateDoc(docRef, dataToUpdate);
  } catch (error) {
    console.error("Error updating route: ", error);
    throw error;
  }
}

export async function deleteRoute(id) {
  try {
    const docRef = doc(db, "routes", id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting route: ", error);
    throw error;
  }
}

// --- USERS & FRIENDS ---
const usersRef = collection(db, "users");

export async function checkAndCreateUserProfile(user) {
  if (!user) return;
  const docRef = doc(db, "users", user.uid);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    await setDoc(docRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.email.split('@')[0], // Default display name
      friends: [],
      friendRequests: [],
      createdAt: serverTimestamp()
    });
  }
}

export async function getUserProfile(uid) {
  try {
    const docRef = doc(db, "users", uid);
    const snap = await getDoc(docRef);
    if(snap.exists()){
      return { id: snap.id, ...snap.data() };
    }
    return null;
  } catch (error) {
    console.error("Error getting user profile: ", error);
    return null;
  }
}

export async function updateUserProfile(uid, dataToUpdate) {
  try {
    const docRef = doc(db, "users", uid);
    await updateDoc(docRef, dataToUpdate);
  } catch (error) {
    console.error("Error updating user profile: ", error);
    throw error;
  }
}

export async function searchUsersByEmail(searchQuery) {
  try {
    const q = query(usersRef, where("email", ">=", searchQuery), where("email", "<=", searchQuery + '\uf8ff'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error searching users: ", error);
    return [];
  }
}

export async function sendFriendRequest(currentUserId, targetUserId) {
  try {
    const targetUserRef = doc(db, "users", targetUserId);
    const snap = await getDoc(targetUserRef);
    if (snap.exists()) {
      const data = snap.data();
      const currentRequests = data.friendRequests || [];
      if (!currentRequests.includes(currentUserId) && !(data.friends || []).includes(currentUserId)) {
        await updateDoc(targetUserRef, {
          friendRequests: [...currentRequests, currentUserId]
        });
      }
    }
  } catch (error) {
    console.error("Error sending friend request: ", error);
  }
}

export async function acceptFriendRequest(currentUserId, senderUserId) {
  try {
    // Add to current user's friends and remove from requests
    const currentUserRef = doc(db, "users", currentUserId);
    const currentUserSnap = await getDoc(currentUserRef);
    if (currentUserSnap.exists()) {
      const data = currentUserSnap.data();
      const newRequests = (data.friendRequests || []).filter(id => id !== senderUserId);
      const newFriends = [...(data.friends || []), senderUserId];
      await updateDoc(currentUserRef, {
        friendRequests: newRequests,
        friends: newFriends
      });
    }

    // Add to sender's friends list
    const senderRef = doc(db, "users", senderUserId);
    const senderSnap = await getDoc(senderRef);
    if (senderSnap.exists()) {
       const senderData = senderSnap.data();
       const senderFriends = [...(senderData.friends || []), currentUserId];
       await updateDoc(senderRef, {
         friends: senderFriends
       });
    }
  } catch (error) {
    console.error("Error accepting friend request: ", error);
  }
}
