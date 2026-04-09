import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { defaultSettings } from '../store/initialSettings';
const ADMINS_COLLECTION = 'admins';
const APP_DATA_COLLECTION = 'app_data';
const STATIONS_DOC_ID = 'stations_list';
export const saveUserSettings = async (userId, settings) => {
    const userDocRef = doc(db, 'users', userId);
    try {
        await setDoc(userDocRef, { ...settings, lastUpdated: serverTimestamp() }, { merge: true });
    }
    catch (error) {
        console.error("Error saving user settings to Firestore:", error);
    }
};
export const getUserSettings = async (userId) => {
    const userDocRef = doc(db, 'users', userId);
    try {
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            delete data.lastUpdated;
            return data;
        }
        return null;
    }
    catch (error) {
        console.error("Error fetching user settings from Firestore:", error);
        return null;
    }
};
export const checkAdminRole = async (email) => {
    if (!email)
        return false;
    try {
        const normalizedEmail = email.toLowerCase();
        const docRef = doc(db, ADMINS_COLLECTION, normalizedEmail);
        const docSnap = await getDoc(docRef);
        return docSnap.exists();
    }
    catch (error) {
        console.error("Error checking admin role:", error);
        return false;
    }
};
export const fetchAdmins = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, ADMINS_COLLECTION));
        return querySnapshot.docs.map(doc => doc.id);
    }
    catch (error) {
        console.error("Error fetching admins:", error);
        return [];
    }
};
export const addAdmin = async (email) => {
    const normalizedEmail = email.toLowerCase();
    await setDoc(doc(db, ADMINS_COLLECTION, normalizedEmail), {
        addedAt: serverTimestamp(),
        role: 'admin'
    });
    return true;
};
export const removeAdmin = async (email) => {
    const normalizedEmail = email.toLowerCase();
    await deleteDoc(doc(db, ADMINS_COLLECTION, normalizedEmail));
    return true;
};
export const fetchCustomStations = async () => {
    try {
        const docRef = doc(db, APP_DATA_COLLECTION, STATIONS_DOC_ID);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data().stations;
        }
        return null;
    }
    catch (error) {
        console.error("Error fetching custom stations:", error);
        return null;
    }
};
export const saveCustomStations = async (stations) => {
    const docRef = doc(db, APP_DATA_COLLECTION, STATIONS_DOC_ID);
    await setDoc(docRef, {
        stations: stations,
        updatedAt: serverTimestamp()
    });
    return true;
};
export const resetStationsInFirestore = async () => {
    const docRef = doc(db, APP_DATA_COLLECTION, STATIONS_DOC_ID);
    await deleteDoc(docRef);
    return true;
};
export const normalizeSettings = (raw) => {
    if (!raw)
        return defaultSettings;
    return {
        ...defaultSettings,
        ...raw,
        favorites: Array.isArray(raw.favorites) ? raw.favorites : defaultSettings.favorites,
        customOrder: Array.isArray(raw.customOrder) ? raw.customOrder : defaultSettings.customOrder,
        settingsSections: { ...defaultSettings.settingsSections, ...raw.settingsSections },
        keyMap: { ...defaultSettings.keyMap, ...raw.keyMap },
    };
};
export const settingsHaveConflict = (local, cloud) => {
    if (!cloud)
        return false;
    const localFavs = JSON.stringify(local.favorites.sort());
    const cloudFavs = JSON.stringify(cloud.favorites.sort());
    return localFavs !== cloudFavs;
};
