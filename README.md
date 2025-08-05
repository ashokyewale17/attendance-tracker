Attendance Tracker Web App

This is a lightweight web application for tracking employee check-in/check-out times, calculating daily hours, and monthly averages. It supports role-based dashboards for employees and administrators, and allows admins to upload attendance data via Excel and export reports.



Tech Stack

Frontend: React.js



Styling: Tailwind CSS



Database \& Authentication: Google Firebase (Firestore for database, Firebase Auth for authentication)



Excel Handling: xlsx library



Features (MVP)

User Login: Secure authentication for employees and admins.



Attendance Logging: One-click check-in/check-out with auto-captured timestamps.



View Attendance History: Table displaying personal or all employee attendance, filterable by date/month.



Daily Hours Calculation: Automatically calculates total hours worked per day.



Monthly Average Time: Aggregates attendance data to show monthly average hours per user.



Export Report: Downloadable Excel/CSV report of attendance data (Admin only).



Excel Upload: Admin can upload Excel files to populate attendance data.



Project Structure

attendance-tracker/

├── public/

│   └── index.html

├── src/

│   ├── components/

│   │   ├── AdminDashboard.js    // Admin-specific UI and logic

│   │   ├── AttendanceLog.js     // Reusable component for displaying attendance records

│   │   ├── Auth.js              // Login/Logout and simplified registration

│   │   ├── EmployeeDashboard.js // Employee-specific UI and logic

│   │   └── LoadingSpinner.js    // Simple loading animation

│   ├── App.js                   // Main application component, handles routing based on role

│   ├── firebase.js              // Firebase initialization and context provider

│   ├── index.css                // Tailwind CSS imports and custom styles

│   └── index.js                 // React app entry point

├── package.json                 // Project dependencies and scripts

├── tailwind.config.js           // Tailwind CSS configuration

└── README.md                    // This file



Local Development Setup

Follow these steps to get the application running on your local machine:



1\. Prerequisites

Node.js and npm (or Yarn): Ensure you have Node.js installed. You can download it from nodejs.org. npm (Node Package Manager) is included with Node.js.



2\. Create React App \& Install Dependencies

Open your terminal or command prompt.



Create a new React project:



npx create-react-app attendance-tracker

cd attendance-tracker



Install the necessary dependencies:



npm install firebase tailwindcss xlsx

\# Or if you prefer yarn:

\# yarn add firebase tailwindcss xlsx



3\. Configure Tailwind CSS

Initialize Tailwind CSS:



npx tailwindcss init -p



This command will create tailwind.config.js and postcss.config.js files in your project root.



Open tailwind.config.js and update the content array to include paths to your React component files:



/\*\* @type {import('tailwindcss').Config} \*/

module.exports = {

&nbsp; content: \[

&nbsp;   "./src/\*\*/\*.{js,jsx,ts,tsx}",

&nbsp;   "./public/index.html",

&nbsp; ],

&nbsp; theme: {

&nbsp;   extend: {

&nbsp;     fontFamily: {

&nbsp;       inter: \['Inter', 'sans-serif'],

&nbsp;     },

&nbsp;   },

&nbsp; },

&nbsp; plugins: \[],

}



Create or update src/index.css and add the Tailwind directives:



@tailwind base;

@tailwind components;

@tailwind utilities;



body {

&nbsp; font-family: 'Inter', sans-serif;

}



4\. Copy the Code Files

Copy the content from the immersive code blocks provided above into their respective files within your attendance-tracker project.



public/index.html



src/index.js



src/index.css



tailwind.config.js



package.json (ensure your dependencies and scripts match)



src/firebase.js



src/components/LoadingSpinner.js



src/components/Auth.js



src/components/AttendanceLog.js



src/components/EmployeeDashboard.js



src/components/AdminDashboard.js



src/App.js



5\. Firebase Project Setup

This is a critical step to make the app work with a database.



Create a Firebase Project:



Go to the Firebase Console.



Click "Add project" and follow the steps to create a new project.



Add a Web App:



Once your project is created, click the web icon (</>) to add a new web app.



Register your app and Firebase will provide you with a firebaseConfig object.



Update src/firebase.js with your Firebase Config:



Open src/firebase.js.



Locate the line:



const firebaseConfig = JSON.parse(typeof \_\_firebase\_config !== 'undefined' ? \_\_firebase\_config : '{}');



Replace this line with your actual firebaseConfig object obtained from the Firebase Console. It will look something like this:



const firebaseConfig = {

&nbsp; apiKey: "YOUR\_API\_KEY",

&nbsp; authDomain: "YOUR\_PROJECT\_ID.firebaseapp.com",

&nbsp; projectId: "YOUR\_PROJECT\_ID",

&nbsp; storageBucket: "YOUR\_PROJECT\_ID.appspot.com",

&nbsp; messagingSenderId: "YOUR\_MESSAGING\_SENDER\_ID",

&nbsp; appId: "YOUR\_APP\_ID"

};



For \_\_app\_id, you can use a placeholder string for local development, e.g., 'local-dev-app-id'. The \_\_initial\_auth\_token can remain an empty string as you'll be using email/password login.



Enable Authentication:



In the Firebase Console, navigate to "Build" > "Authentication".



Go to the "Sign-in method" tab.



Enable the "Email/Password" provider.



Enable Firestore Database:



In the Firebase Console, navigate to "Build" > "Firestore Database".



Click "Create database".



Choose "Start in production mode" (you can adjust rules later) and select a location.



Set up Security Rules: Go to the "Rules" tab in Firestore and replace the default rules with these to allow authenticated users to read and write data:



rules\_version = '2';

service cloud.firestore {

&nbsp; match /databases/{database}/documents {

&nbsp;   // Public data (for sharing with other users or collaborative apps)

&nbsp;   match /artifacts/{appId}/public/data/{collection=\*\*} {

&nbsp;     allow read, write: if request.auth != null;

&nbsp;   }



&nbsp;   // Private data (default)

&nbsp;   match /artifacts/{appId}/users/{userId}/{collection=\*\*} {

&nbsp;     allow read, write: if request.auth != null \&\& request.auth.uid == userId;

&nbsp;   }



&nbsp;   // Global users collection for admin to see all users

&nbsp;   match /artifacts/{appId}/users/{userId} {

&nbsp;     allow read: if request.auth != null; // Admins need to read all user profiles

&nbsp;     allow write: if request.auth != null \&\& request.auth.uid == userId; // Users can update their own profile

&nbsp;   }

&nbsp; }

}



Click "Publish" after updating the rules.



6\. Run the Application

In your terminal, from the attendance-tracker directory, run:



npm start

\# Or if you prefer yarn:

\# yarn start



This will open the application in your browser, usually at http://localhost:3000.



Usage

First-time Login/Admin Setup:



When you first run the app, you'll see the login screen.



Enter an email and password.



Click the "Register/Set Admin Role" button. This will attempt to update the role of the currently signed-in Firebase user (which might be an anonymous user initially) to 'admin'. In a real production app, user registration and admin role assignment would be more controlled.



You can then log in with the email and password you just used.



Employee View: After logging in, if the user's role is 'employee', you'll see the check-in/check-out buttons and your personal attendance history.



Admin View: If the user's role is 'admin', you'll see the admin controls, including the ability to filter attendance, upload Excel files, and export reports.

