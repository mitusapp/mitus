// src/pages/AuthCallback.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [working, setWorking] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const url = new URL(window.location.href);

        // Por si viene un error del IdP:
        const err =
          url.searchParams.get('error_description') || url.searchParams.get('error');
        if (err) {
          toast({
            title: 'Error de autenticación',
            description: err,
            variant: 'destructive',
          });
          navigate('/login', { replace: true });
          return;
        }

        // Si ya hubiera sesión (por ejemplo, si detectSessionInUrl hizo su trabajo antes)
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session) {
          navigate('/profile', { replace: true });
          return;
        }

        // Canjear el code PKCE -> sesión
        const { error } = await supabase.auth.exchangeCodeForSession(url.toString());
        if (error) {
          toast({
            title: 'No se pudo iniciar sesión',
            description: error.message,
            variant: 'destructive',
          });
          navigate('/login', { replace: true });
          return;
        }

        // Listo, vamos al perfil
        navigate('/profile', { replace: true });
      } catch (e) {
        toast({
          title: 'Error inesperado',
          description: (e && e.message) || 'Reintenta en unos segundos.',
          variant: 'destructive',
        });
        navigate('/login', { replace: true });
      } finally {
        setWorking(false);
      }
    })();
  }, [navigate]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-[#5E5E5E]">Autenticando…</div>
    </div>
  );
}
