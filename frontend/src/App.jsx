import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

// Pages (will be implemented next)
import Login from './pages/Login';
import Register from './pages/Register';
import ClientDashboard from './pages/ClientDashboard';
import LawyerDashboard from './pages/LawyerDashboard';
import SearchLawyers from './pages/SearchLawyers';
import Subscription from './pages/Subscription';
import Landing from './pages/Landing';
import CaseDetails from './pages/CaseDetails';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  const userType = localStorage.getItem('userType');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userType)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <div className="min-h-screen text-slate-200">
        <div className="bg-scene" /> {/* Animated Background */}
        <div className="relative z-10">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Client Routes */}
            <Route
              path="/client-dashboard"
              element={
                <ProtectedRoute allowedRoles={['client']}>
                  <ClientDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/search-lawyers"
              element={
                <ProtectedRoute allowedRoles={['client']}>
                  <SearchLawyers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscription"
              element={
                <ProtectedRoute allowedRoles={['client', 'lawyer']}>
                  <Subscription />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cases/:id"
              element={
                <ProtectedRoute allowedRoles={['client', 'lawyer']}>
                  <CaseDetails />
                </ProtectedRoute>
              }
            />

            {/* Lawyer Routes */}
            <Route
              path="/lawyer-dashboard"
              element={
                <ProtectedRoute allowedRoles={['lawyer']}>
                  <LawyerDashboard />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
