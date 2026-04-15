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
      isPublic: true // default all visible to community
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
    // Filter out our own
    return allPublic.filter(loc => loc.authorId !== currentUserId);
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
