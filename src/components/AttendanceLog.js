import React from 'react';

const AttendanceLog = ({ attendanceRecords, title }) => {
  // Helper function to format Firebase Timestamps to local time string
  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Helper function to format Firebase Timestamps to local date string
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate();
    return date.toLocaleDateString();
  };

  // Helper function to calculate duration between check-in and check-out times
  const calculateDuration = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 'N/A';
    const durationMs = checkOut.toDate().getTime() - checkIn.toDate().getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mt-8">
      <h3 className="text-xl font-bold mb-4 text-gray-800">{title}</h3>
      {attendanceRecords.length === 0 ? (
        <p className="text-gray-600">No attendance records found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead>
              <tr className="bg-gray-100 text-left text-sm font-semibold text-gray-700">
                <th className="py-3 px-4 border-b">Date</th>
                <th className="py-3 px-4 border-b">Check-in</th>
                <th className="py-3 px-4 border-b">Check-out</th>
                <th className="py-3 px-4 border-b">Duration</th>
              </tr>
            </thead>
            <tbody>
              {attendanceRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50 transition-colors duration-150">
                  <td className="py-3 px-4 border-b text-gray-700">{formatDate(record.checkInTime)}</td>
                  <td className="py-3 px-4 border-b text-gray-700">{formatTime(record.checkInTime)}</td>
                  <td className="py-3 px-4 border-b text-gray-700">{formatTime(record.checkOutTime)}</td>
                  <td className="py-3 px-4 border-b text-gray-700">{calculateDuration(record.checkInTime, record.checkOutTime)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AttendanceLog;
