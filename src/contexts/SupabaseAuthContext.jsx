// src/contexts/SupabaseAuthContext.jsx
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const AuthContext = createContext(undefined);

// Rutas públicas que NO queremos guardar como "última visitada"
const PUBLIC_PATHS = new Set([
  '/', '/login', '/signup', '/signup-confirm', '/reset-password'
]);

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleSessionChange = useCallback((currentSession) => {
    setSession(currentSession);
    setUser(currentSession?.user ?? null);
    setLoading(false);
  }, []);

  // 🧠 Guardar última ruta privada visitada (para volver exactamente ahí)
  useEffect(() => {
    if (!loading && user) {
      const isPublic = PUBLIC_PATHS.has(location.pathname);
      if (!isPublic) {
        try {
          const full = `${location.pathname}${location.search || ''}${location.hash || ''}`;
          sessionStorage.setItem('lastVisitedPath', full);
        } catch {}
      }
    }
  }, [loading, user, location]);

  // ✅ Bootstrap simple: validar REMOTO UNA sola vez al montar, sin listeners extras
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        // Lo que haya en storage (puede estar obsoleto)
        const { data: { session: localSession } } = await supabase.auth.getSession();

        // Validar contra servidor
        const { data, error } = await supabase.auth.getUser();
        if (!mounted) return;

        if (error || !data?.user) {
          handleSessionChange(null);
        } else {
          handleSessionChange(localSession ? { ...localSession, user: data.user } : { user: data.user });
        }
      } catch {
        if (mounted) handleSessionChange(null);
      }
    })();

    // Escuchar cambios del SDK
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      handleSessionChange(newSession);

      // ✅ Si hay una ruta pendiente, úsala también en TOKEN_REFRESHED / USER_UPDATED
      const eventsThatRestore = ['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED'];
      if (newSession && eventsThatRestore.includes(event)) {
        // ⬇️ NUEVO: si venimos de un cierre forzado, priorizar /profile e ignorar redirects previos
        try {
          const forceFlag = sessionStorage.getItem('forceNextLoginToProfile');
          if (forceFlag) {
            sessionStorage.removeItem('forceNextLoginToProfile');
            navigate('/profile', { replace: true });
            return;
          }
        } catch {}

        try {
          const pending = sessionStorage.getItem('postLoginRedirect');
          if (pending) {
            sessionStorage.removeItem('postLoginRedirect');
            navigate(pending, { replace: true });
            return;
          }
          const last = sessionStorage.getItem('lastVisitedPath');
          if (last && !PUBLIC_PATHS.has(new URL(last, window.location.origin).pathname)) {
            navigate(last, { replace: true });
            return;
          }
        } catch {}
      }

      // Comportamiento por defecto tras login si NO había redirect/lastRoute
      if (event === 'SIGNED_IN' && newSession) {
        navigate('/profile', { replace: true });
      }

      // Si el SDK emite SIGNED_OUT (p.ej., revocación global), ir a Home si estás en ruta privada
      if (event === 'SIGNED_OUT') {
        // ⬇️ NUEVO: marcar que el próximo login debe ir a /profile e invalidar redirect pendiente
        try {
          sessionStorage.setItem('forceNextLoginToProfile', '1');
          sessionStorage.removeItem('postLoginRedirect');
        } catch {}
        const path = location.pathname;
        if (!PUBLIC_PATHS.has(path)) {
          navigate('/', { replace: true });
        }
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [handleSessionChange, navigate, location.pathname]);

  // === Helpers de autenticación ===
  const signUp = useCallback(async (email, password, options) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { ...options, emailRedirectTo: `${window.location.origin}/login` },
    });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error al crear la cuenta',
        description: error.message || 'Intenta de nuevo.',
      });
    } else {
      // Entrar directo (si el proyecto exige confirmación, caerá al fallback)
      const { error: signInError, data: signInData } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        toast({ title: 'Cuenta creada', description: 'Inicia sesión con tu correo y contraseña.' });
        navigate('/login', { replace: true });
      } else {
        if (signInData?.session) handleSessionChange(signInData.session);
        navigate('/profile', { replace: true });
      }
    }
    setLoading(false);
    return { data, error };
  }, [toast, navigate, handleSessionChange]);

  const signIn = useCallback(async (email, password) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error al iniciar sesión',
        description: error.message || 'Credenciales incorrectas.',
      });
      setLoading(false);
      return { data, error };
    }

    if (data?.session) {
      handleSessionChange(data.session);
      // 🔁 Prioridad (ajustada):
      //  1) Si hay forceNextLoginToProfile -> /profile
      //  2) postLoginRedirect
      //  3) lastVisitedPath
      //  4) /profile
      let next = '/profile';
      try {
        const forceFlag = sessionStorage.getItem('forceNextLoginToProfile');
        if (forceFlag) {
          sessionStorage.removeItem('forceNextLoginToProfile');
          // next ya es '/profile'
        } else {
          const pending = sessionStorage.getItem('postLoginRedirect');
          if (pending) {
            sessionStorage.removeItem('postLoginRedirect');
            next = pending;
          } else {
            const last = sessionStorage.getItem('lastVisitedPath');
            if (last && !PUBLIC_PATHS.has(new URL(last, window.location.origin).pathname)) {
              next = last;
            }
          }
        }
      } catch {}
      navigate(next, { replace: true });
    }
    setLoading(false);
    return { data, error };
  }, [navigate, toast, handleSessionChange]);

  const signInWithProvider = useCallback(async (provider) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: provider === 'google' ? { prompt: 'select_account' } : undefined,
      },
    });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error de autenticación',
        description: error.message || 'No se pudo iniciar sesión con el proveedor.',
      });
      setLoading(false);
      return { data, error };
    }
    // Redirigirá el proveedor; al volver, onAuthStateChange hará la navegación
    return { data, error: null };
  }, [toast]);

  /**
   * Cerrar sesión robusto (idempotente y sin 403 en consola).
   */
  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      // ✅ Solo llamar a /logout si HAY sesión real
      const { data, error } = await supabase.auth.getUser();
      const hasRealSession = !error && !!data?.user;

      if (hasRealSession) {
        try { await supabase.auth.signOut({ scope: 'global' }); } catch {}
        try { await supabase.auth.signOut({ scope: 'local' }); } catch {}
      }
    } catch {
      // silencioso
    } finally {
      try {
        sessionStorage.removeItem('postLoginRedirect');
        sessionStorage.removeItem('lastVisitedPath');
        // También limpiamos el flag por si se dispara desde este dispositivo
        sessionStorage.removeItem('forceNextLoginToProfile');
      } catch {}
      handleSessionChange(null);
      navigate('/', { replace: true });
      setLoading(false);
    }
  }, [navigate, handleSessionChange]);

  const value = useMemo(() => ({
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithProvider,
    signOut,
  }), [user, session, loading, signUp, signIn, signInWithProvider, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
