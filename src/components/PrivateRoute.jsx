// src/components/PrivateRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import LoadingSpinner from '@/components/LoadingSpinner'; 
// Si tu spinner está en /components/ui/LoadingSpinner.jsx usa:
// import LoadingSpinner from '@/components/ui/LoadingSpinner';

const PrivateRoute = ({ children }) => {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner />;

  if (!session) {
    // Guarda la ruta a la que intentaba ir para redirigir tras login
    const target = location.pathname + location.search + location.hash;
    try { sessionStorage.setItem('postLoginRedirect', target); } catch {}
    // ⬅️ Ahora redirige al HOME ("/") cuando no hay sesión
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return children;
};

export default PrivateRoute;
