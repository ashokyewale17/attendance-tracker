import React, { useState, useEffect, createContext } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithCustomToken,
  signInAnonymously,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
} from 'firebase/firestore';
import LoadingSpinner from './components/LoadingSpinner'; // Ensure this path is correct

// Create a context to provide Firebase instances and user data throughout the app
export const FirebaseContext = createContext(null);

// Your web app's Firebase configuration
// IMPORTANT: Replace this entire 'firebaseConfig' object with the exact one you got from Firebase Console.
const firebaseConfig = {
  apiKey: "AIzaSyAmpVCg4n6CUo5pn1qcKbmMWDiYU1RoJLw",
  authDomain: "employeeattendanceapp-5e289.firebaseapp.com",
  projectId: "employeeattendanceapp-5e289",
  storageBucket: "employeeattendanceapp-5e289.firebasestorage.app",
  messagingSenderId: "626989245835",
  appId: "1:626989245835:web:8cbee687376bff6c4e7b8e",
  measurementId: "G-0VMR3F9XYZ" // This is optional for core functionality
};

// Firebase Provider component to wrap your application
export const FirebaseProvider = ({ children }) => {
  const [firebaseApp, setFirebaseApp] = useState(null);
  const [auth, setAuth] = useState(null);
  const [db, setDb] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const initializeFirebase = async () => {
      try {
        // ✨ FIX: Check if __app_id is defined before using it.
        // If not defined (local development), use a default placeholder ID.
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'local-dev-app-id';

        // Initialize Firebase app, Auth, and Firestore using your config
        const app = initializeApp(firebaseConfig);
        const authInstance = getAuth(app);
        const dbInstance = getFirestore(app);

        setFirebaseApp(app);
        setAuth(authInstance);
        setDb(dbInstance);

        // ✨ FIX: Check if __initial_auth_token is defined before using it.
        // If not defined (local development), sign in anonymously.
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(authInstance, __initial_auth_token);
        } else {
          await signInAnonymously(authInstance);
        }

        // Set up an authentication state change listener
        const unsubscribe = onAuthStateChanged(authInstance, async (currentUser) => {
          if (currentUser) {
            // Ensure email is always a string when setting user state
            setUser(prev => ({
                ...prev, // Preserve existing properties if any
                uid: currentUser.uid,
                email: currentUser.email || '', // Default to empty string if null/undefined
            }));
            setUserId(currentUser.uid);

            // Fetch user role from Firestore
            const userDocRef = doc(dbInstance, 'artifacts', appId, 'users', currentUser.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
              setUser(prev => ({ ...prev, role: userDocSnap.data().role }));
            } else {
              // If user document doesn't exist, create it with a default 'employee' role
              await setDoc(userDocRef, { email: currentUser.email || '', role: 'employee' }, { merge: true });
              setUser(prev => ({ ...prev, role: 'employee' }));
            }
          } else {
            setUser(null);
            setUserId(null);
          }
          setLoading(false);
        });

        // Cleanup the listener on component unmount
        return () => unsubscribe();
      } catch (error) {
        console.error("Error initializing Firebase:", error);
        setLoading(false);
      }
    };

    initializeFirebase();
  }, []); // Empty dependency array ensures this runs only once on mount

  // Show a loading spinner while Firebase is initializing
  if (loading) {
    return <LoadingSpinner />;
  }

  // Provide Firebase instances and user data to children components
  return (
    <FirebaseContext.Provider value={{ firebaseApp, auth, db, user, userId }}>
      {children}
    </FirebaseContext.Provider>
  );
};
