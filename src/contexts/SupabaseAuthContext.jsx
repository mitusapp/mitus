
import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);

  const signUp = useCallback(async (email, password, options) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        ...options,
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error al crear la cuenta",
        description: error.message || "Algo salió mal.",
      });
    } else {
       navigate('/signup-confirm');
    }
    setLoading(false);
    return { data, error };
  }, [toast, navigate]);

  const signIn = useCallback(async (email, password) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error al iniciar sesión",
        description: error.message || "Credenciales incorrectas.",
      });
    } else if (data.session) {
      setSession(data.session);
      setUser(data.user);
      const redirectTo = sessionStorage.getItem('postLoginRedirect') || '/profile';
      sessionStorage.removeItem('postLoginRedirect');
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
        redirectTo: `${window.location.origin}/profile`,
      },
    });
    if (error) {
      toast({
        variant: "destructive",
        title: "Error de autenticación",
        description: error.message || "No se pudo iniciar sesión con el proveedor.",
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
        variant: "destructive",
        title: "Error al cerrar sesión",
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
