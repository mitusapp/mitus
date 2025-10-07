import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, User as UserIcon, Pencil } from 'lucide-react';

/**
 * Barra superior reutilizable del perfil (avatar + saludo a la izquierda; acciones a la derecha)
 *
 * Props:
 * - profile: { full_name?: string, avatar_url?: string }
 * - greeting?: string (texto a la derecha del nombre)
 * - onEdit?: () => void
 * - onChat?: () => void
 * - showEdit?: boolean (default true)
 * - showChat?: boolean (default true)
 * - className?: string
 */
export default function ProfileHeaderBar({
  profile,
  greeting = 'Mira tus próximos eventos.',
  onEdit,
  onChat,
  showEdit = true,
  showChat = true,
  className = '',
}) {
  const firstName = useMemo(() => {
    const full = profile?.full_name?.trim() || '';
    return full ? full.split(/\s+/)[0] : '';
  }, [profile?.full_name]);

  return (
    <div className={`bg-white rounded-2xl border border-[#F0EEEE] px-5 py-4 mb-4 flex items-center justify-between ${className}`}>
      {/* Identidad (izquierda) */}
      <div className="flex items-center gap-4">
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile?.full_name || 'Usuario'}
            className="w-10 h-10 rounded-full object-cover border border-[#E6E3E0]"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[#F8F3F2] border border-[#E6E3E0] flex items-center justify-center">
            <UserIcon className="w-5 h-5 text-[#B9A7F9]" />
          </div>
        )}
        <p className="text-base md:text-lg font-semibold text-[#1E1E1E]">
          Hola{firstName ? `, ${firstName}` : ''}. {greeting}
        </p>
      </div>

      {/* Acciones (derecha) */}
      <div className="flex items-center gap-2">
        {showEdit && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Editar perfil"
            onClick={onEdit}
            className="text-[#1E1E1E] hover:text-[#B9A7F9] hover:bg-[#F8F3F2]"
          >
            <Pencil className="w-5 h-5" />
          </Button>
        )}
        {showChat && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Chat de soporte"
            onClick={onChat}
            className="text-[#1E1E1E] hover:text-[#B9A7F9] hover:bg-[#F8F3F2]"
          >
            <MessageCircle className="w-5 h-5" />
          </Button>
        )}
      </div>
    </div>
  );
}
