// src/contexts/SupabaseAuthContext.jsx
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  // Arranca en true para no “parpadear” sin sesión restaurada
  const [loading, setLoading] = useState(true);

  const handleSessionChange = useCallback((currentSession) => {
    setSession(currentSession);
    setUser(currentSession?.user ?? null);
    setLoading(false);
  }, []);

  // Restaurar sesión y escuchar cambios
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      handleSessionChange(session);
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      handleSessionChange(session);

      // ✅ Al iniciar sesión (email/pass u OAuth), redirige al destino original o /profile
      if (event === 'SIGNED_IN') {
        try {
          const target = sessionStorage.getItem('postLoginRedirect');
          if (target) {
            sessionStorage.removeItem('postLoginRedirect');
            navigate(target, { replace: true });
          } else {
            navigate('/profile', { replace: true });
          }
        } catch {
          navigate('/profile', { replace: true });
        }
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [handleSessionChange, navigate]);

  const signUp = useCallback(async (email, password, options) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        ...options,
        // Tras registrarse, el usuario confirma y vuelve a /login
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error al crear la cuenta',
        description: error.message || 'Intenta de nuevo.',
      });
    } else {
      toast({
        title: 'Confirma tu correo',
        description: 'Te enviamos un enlace para activar tu cuenta.',
      });
      navigate('/signup-confirm', { replace: true });
    }
    setLoading(false);
    return { data, error };
  }, [toast, navigate]);

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
      let next = '/profile';
      try {
        const stored = sessionStorage.getItem('postLoginRedirect');
        if (stored) {
          sessionStorage.removeItem('postLoginRedirect');
          next = stored;
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
        // ✅ Vuelve a una ruta pública; el listener decidirá el destino final
        redirectTo: `${window.location.origin}/login`,
        // En Google, forzar selector de cuenta ayuda a evitar sesiones pegadas
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

    // Supabase redirige; al volver, onAuthStateChange hará la navegación.
    return { data, error: null };
  }, [toast]);

  /**
   * Cerrar sesión robusto:
   * - Intenta revocar en servidor (scope: 'global').
   * - Si la sesión ya no existe (403 session_not_found), lo tratamos como “ya estabas fuera”.
   * - Siempre limpia estado local y navega al Home.
   */
  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error && error.code !== 'session_not_found') {
        throw error;
      }
    } catch (e) {
      const msg = String(e?.message || e?.msg || e || '');
      if (!msg.includes('session_not_found')) {
        console.error('Error al cerrar sesión:', e);
      }
    } finally {
      // Limpieza local garantizada
      try { await supabase.auth.signOut({ scope: 'local' }); } catch {}
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
