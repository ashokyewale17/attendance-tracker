import React, { useContext } from 'react';
import { FirebaseContext } from './firebase'; // Import FirebaseContext
import Auth from './components/Auth'; // Import Auth component
import EmployeeDashboard from './components/EmployeeDashboard'; // Import EmployeeDashboard
import AdminDashboard from './components/AdminDashboard'; // Import AdminDashboard

// Main App Component
function App() {
  const { user } = useContext(FirebaseContext); // Get user from FirebaseContext

  let content;
  // Determine which component to render based on user authentication and role
  if (!user) {
    content = <Auth />; // Show login/auth screen if no user
  } else if (user.role === 'admin') {
    content = <AdminDashboard />; // Show admin dashboard if user is admin
  } else {
    content = <EmployeeDashboard />; // Show employee dashboard by default
  }

  return (
    <div className="min-h-screen bg-gray-100 font-inter antialiased">
      <header className="bg-blue-700 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Attendance Tracker</h1>
          {user && <Auth />} {/* Show logout button in header if logged in */}
        </div>
      </header>
      <main className="py-8">
        {content} {/* Render the determined content */}
      </main>
    </div>
  );
}

export default App;
