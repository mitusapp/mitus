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

  // Restaurar sesión al cargar + escuchar cambios (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc.)
  useEffect(() => {
    let active = true;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Si falla la renovación silenciosa del token, fuerza sign-out limpio
      if (event === 'TOKEN_REFRESH_FAILED') {
        supabase.auth.signOut();
      }
    });

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email, password, options) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        ...options,
        // Tras registrarse, llegará un correo y volverá a la app según este redirect
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error al crear la cuenta',
        description: error.message || 'Algo salió mal.',
      });
    } else {
      // Mantiene tu flujo actual: pantalla informativa
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
    } else if (data.session) {
      // Estos set ayudan a actualizar UI de inmediato (el listener también lo hará)
      setSession(data.session);
      setUser(data.user);
      let redirectTo = '/profile';
      try {
        redirectTo = sessionStorage.getItem('postLoginRedirect') || '/profile';
        sessionStorage.removeItem('postLoginRedirect');
      } catch {}
      navigate(redirectTo, { replace: true });
    }
    setLoading(false);
    return { error };
  }, [toast, navigate]);

  const signInWithProvider = useCallback(async (provider) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        // Tras OAuth el navegador regresará aquí; el listener restaurará la sesión
        redirectTo: `${window.location.origin}/profile`,
      },
    });
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error de autenticación',
        description: error.message || 'No se pudo iniciar sesión con el proveedor.',
      });
    }
    setLoading(false);
  }, [toast]);

  const signOut = useCallback(async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    if (error && error.code !== 'session_not_found') {
      toast({
        variant: 'destructive',
        title: 'Error al cerrar sesión',
        description: error.message,
      });
    }
    navigate('/', { replace: true });
    setLoading(false);
  }, [toast, navigate]);

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
