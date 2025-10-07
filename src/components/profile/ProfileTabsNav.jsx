import React from 'react';
import { NavLink } from 'react-router-dom';
import { Calendar, CheckSquare, Users, Pencil } from 'lucide-react';

const tabs = [
  { to: '/profile', label: 'Eventos', icon: Calendar, end: true },
  { to: '/profile/tasks', label: 'Tareas', icon: CheckSquare },
  { to: '/profile/contacts', label: 'Proveedores y contactos', icon: Users },
  { to: '/profile/edit', label: 'Editar perfil', icon: Pencil },
];

const linkBase =
  'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap';
const activeClasses = 'text-[#1E1E1E] border-b-2 border-[#B9A7F9]';
const inactiveClasses = 'text-[#5E5E5E] hover:text-[#1E1E1E] hover:bg-[#F8F3F2]';

export default function ProfileTabsNav({ className = '' }) {
  return (
    <div className={`sticky top-0 z-30 bg-white border-b border-[#F0EEEE] ${className}`}>
      <div className="max-w-7xl mx-auto">
        <nav className="flex gap-2 overflow-x-auto px-1 py-2">
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `${linkBase} ${isActive ? activeClasses : inactiveClasses}`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
