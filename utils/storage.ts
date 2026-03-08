// utils/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

const LOCAL_STORAGE_KEY = '@gains_data';

export const saveData = async (data: any) => {
  const user = auth.currentUser;

  if (user) {
    // ☁️ CLOUD: User is logged in, save to Firestore
    try {
      await setDoc(doc(db, 'users', user.uid), { workouts: data }, { merge: true });
      console.log('Saved to Cloud!');
    } catch (e) {
      console.error('Error saving to cloud', e);
    }
  } else {
    // 📱 LOCAL: User is a guest, save locally
    try {
      const jsonValue = JSON.stringify(data);
      await AsyncStorage.setItem(LOCAL_STORAGE_KEY, jsonValue);
      console.log('Saved Locally!');
    } catch (e) {
      console.error('Error saving locally', e);
    }
  }
};

export const loadData = async () => {
  const user = auth.currentUser;

  if (user) {
    // ☁️ CLOUD: Load from Firestore
    try {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data().workouts;
      }
      return [];
    } catch (e) {
      console.error('Error loading from cloud', e);
      return [];
    }
  } else {
    // 📱 LOCAL: Load from AsyncStorage
    try {
      const jsonValue = await AsyncStorage.getItem(LOCAL_STORAGE_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (e) {
      console.error('Error loading locally', e);
      return [];
    }
  }
};