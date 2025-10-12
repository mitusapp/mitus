// src/components/PrivateRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import LoadingSpinner from '@/components/LoadingSpinner'; 
// Si tu spinner está en /components/ui/LoadingSpinner.jsx usa:
// import LoadingSpinner from '@/components/ui/LoadingSpinner';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth(); // ✅ usamos `user`
  const location = useLocation();

  // Si hay usuario autenticado en este dispositivo, recordamos que "alguna vez hubo sesión"
  React.useEffect(() => {
    if (!loading && user) {
      try { sessionStorage.setItem('lastKnownUserId', user.id || '1'); } catch {}
    }
  }, [loading, user]);

  // Mientras se valida la sesión inicial, no decidir (evita loops/parpadeos)
  if (loading) return <LoadingSpinner />;

  // Si NO hay usuario autenticado, decidir a dónde y qué recordar
  if (!user) {
    const target = location.pathname + location.search + location.hash;

    try {
      const hadUserBefore = !!sessionStorage.getItem('lastKnownUserId');
      if (hadUserBefore) {
        // Cierre forzado / sesión expirada en este dispositivo → ir a /profile tras login
        sessionStorage.setItem('forceNextLoginToProfile', '1');
        sessionStorage.removeItem('postLoginRedirect'); // no queremos volver a la ruta guardada
      } else {
        // Usuario nunca había iniciado sesión aquí → mantener comportamiento estándar
        sessionStorage.setItem('postLoginRedirect', target);
      }
    } catch {}

    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Hay usuario -> permite acceder a la ruta privada
  return children;
};

export default PrivateRoute;
