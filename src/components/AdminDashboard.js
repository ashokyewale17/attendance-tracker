import React, { useState, useEffect, useContext } from 'react';
import {
  collection, query, where, getDocs, doc, setDoc, Timestamp, onSnapshot
} from 'firebase/firestore';
import * as XLSX from 'xlsx'; // Import xlsx library for Excel operations
import { FirebaseContext } from '../firebase'; // Import FirebaseContext
import AttendanceLog from './AttendanceLog'; // Import AttendanceLog component

const AdminDashboard = () => {
  const { db, userId } = useContext(FirebaseContext);
  const [allAttendanceRecords, setAllAttendanceRecords] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // References to Firestore collections
  const attendanceCollectionRef = collection(db, 'artifacts', userId, 'attendance');
  const usersCollectionRef = collection(db, 'artifacts', userId, 'users');

  // Effect to fetch all users and all attendance records in real-time
  useEffect(() => {
    if (!db || !userId) return; // Ensure db and userId are available

    // Subscribe to real-time updates for all users
    const unsubscribeUsers = onSnapshot(usersCollectionRef, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // IMPORTANT FIX: Ensure email is always a string, even if null/undefined in Firestore
        email: doc.data().email || ''
      }));
      setAllUsers(usersData);
    }, (err) => {
      console.error("Error fetching users:", err);
      setError("Failed to load user list.");
    });

    // Subscribe to real-time updates for all attendance records
    const unsubscribeAttendance = onSnapshot(attendanceCollectionRef, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllAttendanceRecords(records);
      setFilteredRecords(records); // Initially show all records
    }, (err) => {
      console.error("Error fetching all attendance:", err);
      setError("Failed to load all attendance records.");
    });

    // Cleanup function to unsubscribe from listeners
    return () => {
      unsubscribeUsers();
      unsubscribeAttendance();
    };
  }, [db, userId, attendanceCollectionRef, usersCollectionRef]); // Added missing dependencies

  // Effect to filter records based on selected user
  useEffect(() => {
    if (selectedUser === '') {
      setFilteredRecords(allAttendanceRecords); // Show all if no user selected
    } else {
      setFilteredRecords(allAttendanceRecords.filter(record => record.userId === selectedUser));
    }
  }, [selectedUser, allAttendanceRecords]); // Re-run effect if selectedUser or allAttendanceRecords change

  // Handle Excel file upload and processing
  const handleFileUpload = async (event) => {
    setError('');
    setMessage('');
    const file = event.target.files[0];
    if (file) {
      try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        // CORRECTED LINE: Access worksheet directly from workbook.Sheets
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        // Iterate through each row of the Excel data
        for (const row of json) {
          // Ensure employeeName from Excel is always a string for comparison
          const employeeName = String(row['EmployeeName'] || ''); // Default to empty string if null/undefined

          // Find the corresponding user based on employee name (simplified: matches email prefix)
          const user = allUsers.find(u => {
            // IMPORTANT: u.email is now guaranteed to be a string due to the map function above
            return u.email.startsWith(employeeName);
          });

          if (user) {
            const checkInStr = row['CheckInTime'];
            const checkOutStr = row['CheckOutTime'];

            const checkInTime = new Date(checkInStr); // Parse date string
            const checkOutTime = checkOutStr ? new Date(checkOutStr) : null;

            // Validate parsed dates
            if (isNaN(checkInTime.getTime())) {
              console.warn(`Skipping invalid check-in time for ${employeeName}: ${checkInStr}`);
              continue;
            }

            // Check if a record for this user and date already exists to avoid duplicates
            const existingRecordsQuery = query(
              attendanceCollectionRef,
              where('userId', '==', user.id),
              where('checkInTime', '>=', Timestamp.fromDate(new Date(checkInTime.getFullYear(), checkInTime.getMonth(), checkInTime.getDate()))),
              where('checkInTime', '<', Timestamp.fromDate(new Date(checkInTime.getFullYear(), checkInTime.getMonth(), checkInTime.getDate() + 1)))
            );
            const existingRecordsSnap = await getDocs(existingRecordsQuery);

            if (existingRecordsSnap.empty) {
              // Add new attendance record if no duplicate exists
              const newDocRef = doc(attendanceCollectionRef);
              await setDoc(newDocRef, {
                userId: user.id,
                checkInTime: Timestamp.fromDate(checkInTime),
                checkOutTime: checkOutTime ? Timestamp.fromDate(checkOutTime) : null,
                ipAddress: 'Excel Upload', // Indicate source of record
                deviceInfo: 'Excel Upload',
              });
            } else {
              console.log(`Record for ${employeeName} on ${checkInTime.toLocaleDateString()} already exists. Skipping.`);
            }
          } else {
            console.warn(`User not found for Excel entry: ${employeeName}`);
          }
        }
        setMessage('Excel data uploaded and processed successfully!');
      } catch (err) {
        console.error("Error processing Excel file:", err);
        setError(`Failed to process Excel file: ${err.message}. Ensure columns are 'EmployeeName', 'CheckInTime', 'CheckOutTime'.`);
      }
    }
  };

  // Generate and download an Excel report of filtered attendance records
  const generateReport = () => {
    const data = filteredRecords.map(record => {
      const user = allUsers.find(u => u.id === record.userId);
      const email = user ? user.email : 'Unknown User';
      const checkInDate = record.checkInTime ? record.checkInTime.toDate().toLocaleDateString() : '';
      const checkInTime = record.checkInTime ? record.checkInTime.toDate().toLocaleTimeString() : '';
      const checkOutTime = record.checkOutTime ? record.checkOutTime.toDate().toLocaleTimeString() : '';

      let duration = 'N/A';
      if (record.checkInTime && record.checkOutTime) {
        const durationMs = record.checkOutTime.toDate().getTime() - record.checkInTime.toDate().getTime();
        const hours = Math.floor(durationMs / (1000 * 60 * 60));
        const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
        duration = `${hours}h ${minutes}m`;
      }

      return {
        'Employee Email': email,
        'Date': checkInDate,
        'Check-in Time': checkInTime,
        'Check-out Time': checkOutTime,
        'Duration': duration,
      };
    });

    // Create a new worksheet and workbook, then write to Excel file
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Report');
    XLSX.writeFile(workbook, 'attendance_report.xlsx');
    setMessage('Report generated successfully!');
  };

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <h2 className="text-3xl font-bold mb-6 text-center text-gray-900">Admin Dashboard</h2>

      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h3 className="text-xl font-bold mb-4 text-gray-800">Admin Controls</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label htmlFor="user-select" className="block text-sm font-medium text-gray-700 mb-1">Filter by Employee:</label>
            <select
              id="user-select"
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Employees</option>
              {allUsers.map(user => (
                <option key={user.id} value={user.id}>{user.email || user.id}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="excel-upload" className="block text-sm font-medium text-gray-700 mb-1">Upload Excel Attendance:</label>
            <input
              type="file"
              id="excel-upload"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <p className="text-xs text-gray-500 mt-1">Expected columns: "EmployeeName", "CheckInTime", "CheckOutTime"</p>
          </div>
          <div>
            <button
              onClick={generateReport}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 px-4 rounded-md shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition duration-300 transform hover:scale-105"
            >
              Export Attendance Report (Excel)
            </button>
          </div>
        </div>
        {error && <p className="text-red-600 text-center mt-4">{error}</p>}
        {message && <p className="text-green-600 text-center mt-4">{message}</p>}
      </div>

      {/* Display filtered attendance records using AttendanceLog component */}
      <AttendanceLog attendanceRecords={filteredRecords} title="All Employee Attendance Records" />

      <div className="bg-white p-6 rounded-lg shadow-md mt-8">
        <h3 className="text-xl font-bold mb-4 text-gray-800">Monthly Averages by Employee</h3>
        {allUsers.length === 0 ? (
          <p className="text-gray-600">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded-lg">
              <thead>
                <tr className="bg-gray-100 text-left text-sm font-semibold text-gray-700">
                  <th className="py-3 px-4 border-b">Employee Email</th>
                  <th className="py-3 px-4 border-b">Monthly Avg. Hours</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.map(user => {
                  const userRecords = allAttendanceRecords.filter(rec => rec.userId === user.id);
                  let totalDurationMs = 0;
                  let daysCount = 0;
                  const currentMonth = `${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}`;

                  userRecords.forEach(record => {
                    if (record.checkInTime && record.checkOutTime) {
                      const date = record.checkInTime.toDate();
                      const recordMonthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                      if (recordMonthYear === currentMonth) {
                        const durationMs = record.checkOutTime.toDate().getTime() - record.checkInTime.toDate().getTime();
                        totalDurationMs += durationMs;
                        daysCount++;
                      }
                    }
                  });

                  let monthlyAvg = '0h 0m';
                  if (daysCount > 0) {
                    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
                    const avgMs = totalDurationMs / daysInMonth;
                    const hours = Math.floor(avgMs / (1000 * 60 * 60));
                    const minutes = Math.floor((avgMs % (1000 * 60 * 60)) / (1000 * 60));
                    monthlyAvg = `${hours}h ${minutes}m`;
                  }

                  return (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="py-3 px-4 border-b text-gray-700">{user.email || 'N/A'}</td>
                      <td className="py-3 px-4 border-b text-gray-700">{monthlyAvg}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
