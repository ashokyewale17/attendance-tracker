import React, { useState, useEffect, useContext } from 'react';
import {
  // Removed unused getFirestore import
  collection, query, where, doc, setDoc, Timestamp, orderBy, onSnapshot
} from 'firebase/firestore';
import { FirebaseContext } from '../firebase'; // Import FirebaseContext
import AttendanceLog from './AttendanceLog'; // Import AttendanceLog component

const EmployeeDashboard = () => {
  const { db, user, userId } = useContext(FirebaseContext);
  const [currentAttendance, setCurrentAttendance] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [dailyAverage, setDailyAverage] = useState('0h 0m');
  const [monthlyAverage, setMonthlyAverage] = useState('0h 0m');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Reference to the user's attendance collection
  const attendanceCollectionRef = collection(db, 'artifacts', userId, 'attendance');

  // Effect to fetch current attendance status and all records in real-time
  useEffect(() => {
    if (!user || !db || !userId) return; // Ensure db, user, and userId are available

    // Query for today's active check-in record (if any)
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1); // Start of tomorrow

    const qCurrent = query(
      attendanceCollectionRef,
      where('userId', '==', user.uid),
      where('checkInTime', '>=', Timestamp.fromDate(today)),
      where('checkInTime', '<', Timestamp.fromDate(tomorrow)),
      orderBy('checkInTime', 'desc')
    );

    // Subscribe to real-time updates for today's attendance
    const unsubscribeCurrent = onSnapshot(qCurrent, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const todayRecord = records.find(rec => !rec.checkOutTime); // Find the active check-in
      setCurrentAttendance(todayRecord || null);
    }, (err) => {
      console.error("Error fetching current attendance:", err);
      setError("Failed to load current attendance status.");
    });

    // Query for all attendance records for the current user, ordered by check-in time
    const qAllRecords = query(
      attendanceCollectionRef,
      where('userId', '==', user.uid),
      orderBy('checkInTime', 'desc')
    );

    // Subscribe to real-time updates for all attendance records
    const unsubscribeAll = onSnapshot(qAllRecords, (snapshot) => {
      const allRecords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAttendanceRecords(allRecords);
      calculateAverages(allRecords); // Recalculate averages whenever records change
    }, (err) => {
      console.error("Error fetching all attendance records:", err);
      setError("Failed to load attendance history.");
    });

    // Cleanup function to unsubscribe from listeners when component unmounts
    return () => {
      unsubscribeCurrent();
      unsubscribeAll();
    };
  }, [user, db, userId, attendanceCollectionRef]); // Added missing dependency

  // Function to calculate daily and monthly average hours
  const calculateAverages = (records) => {
    let totalDurationMs = 0;
    let daysCount = 0;
    const monthlyDurations = {}; // Stores total duration per month { 'YYYY-MM': totalMs }

    records.forEach(record => {
      if (record.checkInTime && record.checkOutTime) {
        const durationMs = record.checkOutTime.toDate().getTime() - record.checkInTime.toDate().getTime();
        totalDurationMs += durationMs;
        daysCount++;

        const date = record.checkInTime.toDate();
        const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        monthlyDurations[monthYear] = (monthlyDurations[monthYear] || 0) + durationMs;
      }
    });

    // Calculate overall daily average
    if (daysCount > 0) {
      const avgMs = totalDurationMs / daysCount;
      const hours = Math.floor(avgMs / (1000 * 60 * 60));
      const minutes = Math.floor((avgMs % (1000 * 60 * 60)) / (1000 * 60));
      setDailyAverage(`${hours}h ${minutes}m`);
    } else {
      setDailyAverage('0h 0m');
    }

    // Calculate monthly average for the current month
    const currentMonth = `${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}`;
    if (monthlyDurations[currentMonth]) {
      // Get the number of days in the current month
      const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
      const avgMonthlyMs = monthlyDurations[currentMonth] / daysInMonth; // Average over days in month
      const hours = Math.floor(avgMonthlyMs / (1000 * 60 * 60));
      const minutes = Math.floor((avgMonthlyMs % (1000 * 60 * 60)) / (1000 * 60));
      setMonthlyAverage(`${hours}h ${minutes}m`);
    } else {
      setMonthlyAverage('0h 0m');
    }
  };

  // Handle check-in action
  const handleCheckIn = async () => {
    setError('');
    setMessage('');
    try {
      if (currentAttendance) {
        setError('You are already checked in!');
        return;
      }
      // Add a new attendance document with check-in time
      const newDocRef = doc(attendanceCollectionRef); // Let Firestore generate ID
      await setDoc(newDocRef, {
        userId: user.uid,
        checkInTime: Timestamp.now(),
        checkOutTime: null, // Set check-out time to null initially
        ipAddress: 'N/A', // Placeholder: In a real app, capture IP/device info
        deviceInfo: navigator.userAgent, // Placeholder: Capture user agent
      });
      setMessage('Checked in successfully!');
    } catch (err) {
      console.error("Error checking in:", err);
      setError('Failed to check in. Please try again.');
    }
  };

  // Handle check-out action
  const handleCheckOut = async () => {
    setError('');
    setMessage('');
    try {
      if (!currentAttendance) {
        setError('You are not checked in!');
        return;
      }
      // Update the existing attendance document with check-out time
      const attendanceDocRef = doc(attendanceCollectionRef, currentAttendance.id);
      await setDoc(attendanceDocRef, { checkOutTime: Timestamp.now() }, { merge: true });
      setMessage('Checked out successfully!');
    } catch (err) {
      console.error("Error checking out:", err);
      setError('Failed to check out. Please try again.');
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h2 className="text-3xl font-bold mb-6 text-center text-gray-900">Employee Dashboard</h2>

      <div className="bg-white p-6 rounded-lg shadow-md flex flex-col md:flex-row items-center justify-around gap-4">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-700">Status:</p>
          <p className={`text-2xl font-bold ${currentAttendance ? 'text-green-600' : 'text-red-600'}`}>
            {currentAttendance ? 'Checked In' : 'Checked Out'}
          </p>
          {currentAttendance && (
            <p className="text-sm text-gray-500">Since: {currentAttendance.checkInTime.toDate().toLocaleTimeString()}</p>
          )}
        </div>
        <div className="flex gap-4">
          <button
            onClick={handleCheckIn}
            disabled={!!currentAttendance} // Disable if already checked in
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition duration-300 transform hover:scale-105"
          >
            Check In
          </button>
          <button
            onClick={handleCheckOut}
            disabled={!currentAttendance} // Disable if not checked in
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition duration-300 transform hover:scale-105"
          >
            Check Out
          </button>
        </div>
      </div>

      {error && <p className="text-red-600 text-center mt-4">{error}</p>}
      {message && <p className="text-green-600 text-center mt-4">{message}</p>}

      <div className="bg-white p-6 rounded-lg shadow-md mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-xl font-bold mb-2 text-gray-800">Daily Average Hours</h3>
          <p className="text-3xl font-extrabold text-blue-600">{dailyAverage}</p>
        </div>
        <div>
          <h3 className="text-xl font-bold mb-2 text-gray-800">Monthly Average Hours</h3>
          <p className="text-3xl font-extrabold text-blue-600">{monthlyAverage}</p>
        </div>
      </div>

      {/* Display personal attendance history using AttendanceLog component */}
      <AttendanceLog attendanceRecords={attendanceRecords} title="Your Attendance History" />
    </div>
  );
};

export default EmployeeDashboard;
