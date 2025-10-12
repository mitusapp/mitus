// src/components/PrivateRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import LoadingSpinner from '@/components/LoadingSpinner'; 
// Si tu spinner está en /components/ui/LoadingSpinner.jsx usa:
// import LoadingSpinner from '@/components/ui/LoadingSpinner';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth(); // ✅ usamos `user` en lugar de `session`
  const location = useLocation();

  // Mientras se valida la sesión inicial, no decidir (evita loops/parpadeos)
  if (loading) return <LoadingSpinner />;

  // Si NO hay usuario autenticado, guarda el destino y redirige al Login
  if (!user) {
    const target = location.pathname + location.search + location.hash;
    try { sessionStorage.setItem('postLoginRedirect', target); } catch {}
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Hay usuario -> permite acceder a la ruta privada
  return children;
};

export default PrivateRoute;
