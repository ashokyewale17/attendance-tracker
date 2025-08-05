import React, { useState, useContext } from 'react';
import {
  signInWithEmailAndPassword, signOut
} from 'firebase/auth';
// Removed unused 'getFirestore' import from here
import { doc, setDoc, getDoc } from 'firebase/firestore'; // Keep Firestore functions for document operations
import { FirebaseContext } from '../firebase'; // Import FirebaseContext

const Auth = () => {
  const { auth, db, user, userId } = useContext(FirebaseContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Handle user login
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // Ensure a user document exists and set a default role if not
      const userRef = doc(db, 'artifacts', userId, 'users', userCredential.user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        // Ensure email is stored as a string, even if potentially null from auth.currentUser.email
        await setDoc(userRef, { email: userCredential.user.email || '', role: 'employee' }); // Default role
      }
      setMessage('Logged in successfully!');
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle user logout
  const handleLogout = async () => {
    setError('');
    setMessage('');
    try {
      await signOut(auth);
      setMessage('Logged out successfully!');
    } catch (err) {
      setError(err.message);
    }
  };

  // Simplified registration/admin role assignment for demonstration
  const handleRegisterAdmin = async () => {
    setError('');
    setMessage('');
    if (!email || !password) {
      setError('Email and password are required for registration.');
      return;
    }
    try {
      if (!auth.currentUser) {
        setError('Please log in first to set a role, or create an account via Firebase Console.');
        return;
      }
      const userDocRef = doc(db, 'artifacts', userId, 'users', auth.currentUser.uid);
      // Ensure email is stored as a string
      await setDoc(userDocRef, { email: auth.currentUser.email || '', role: 'admin' }, { merge: true });
      setMessage('User role updated to admin. (Requires existing Firebase user)');
    } catch (err) {
      setError(err.message);
    }
  };

  // Render logout button if user is logged in
  if (user) {
    return (
      <div className="flex items-center space-x-4">
        <p className="text-white text-sm">Hello, <span className="font-semibold">{user.email || 'User'}</span> ({user.role || 'employee'})</p>
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white font-bold py-1.5 px-3 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition duration-300"
        >
          Logout
        </button>
      </div>
    );
  }

  // Render login form if no user is logged in
  return (
    <div className="bg-white p-8 rounded-lg shadow-xl max-w-md mx-auto my-12 border border-gray-200">
      <h2 className="text-3xl font-extrabold mb-8 text-center text-gray-900">Login to Attendance App</h2>
      <form onSubmit={handleLogin} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-200"
            placeholder="your.email@example.com"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-200"
            placeholder="••••••••"
          />
        </div>
        {error && <p className="text-red-600 text-sm text-center">{error}</p>}
        {message && <p className="text-green-600 text-sm text-center">{message}</p>}
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-300 transform hover:scale-105"
        >
          Login
        </button>
      </form>
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          For first-time setup or to register an admin account:
        </p>
        <button
          onClick={handleRegisterAdmin}
          className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium underline"
        >
          Register/Set Admin Role (Requires existing Firebase user)
        </button>
        <p className="text-xs text-gray-500 mt-1">
          (Note: In a production app, user registration would be a separate process, and admin roles assigned by an existing admin.)
        </p>
      </div>
    </div>
  );
};

export default Auth;
