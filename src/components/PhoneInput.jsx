// src/components/PhoneInput.jsx
import React, { useEffect, useMemo, useState } from 'react';

/**
 * PhoneInput
 * - Selector de país con bandera + código y campo de número.
 * - Devuelve un string combinado E.164-ish: "+57 3001234567"
 * Props:
 *  - value: string (p.ej., "+57 3001234567")
 *  - onChange: (value: string) => void
 *  - placeholder?: string
 */
const COUNTRIES = [
  { code: 'CO', dial: '57', name: 'Colombia', flag: '🇨🇴' },
  { code: 'MX', dial: '52', name: 'México', flag: '🇲🇽' },
  { code: 'PE', dial: '51', name: 'Perú', flag: '🇵🇪' },
  { code: 'CL', dial: '56', name: 'Chile', flag: '🇨🇱' },
  { code: 'AR', dial: '54', name: 'Argentina', flag: '🇦🇷' },
  { code: 'US', dial: '1',  name: 'Estados Unidos', flag: '🇺🇸' },
  { code: 'ES', dial: '34', name: 'España', flag: '🇪🇸' },
  { code: 'BR', dial: '55', name: 'Brasil', flag: '🇧🇷' },
  { code: 'EC', dial: '593', name: 'Ecuador', flag: '🇪🇨' },
  { code: 'VE', dial: '58', name: 'Venezuela', flag: '🇻🇪' },
  { code: 'PA', dial: '507', name: 'Panamá', flag: '🇵🇦' },
];

function parseValueToState(val) {
  if (!val) return { dial: '57', national: '' }; // por defecto CO
  const m = String(val).trim().match(/^\+?(\d{1,3})\s*(.*)$/);
  if (m) {
    const dial = m[1];
    const national = (m[2] || '').replace(/[^\d]/g, '');
    return { dial, national };
  }
  return { dial: '57', national: '' };
}

export default function PhoneInput({ value, onChange, placeholder }) {
  const init = useMemo(() => parseValueToState(value), []);
  const [dial, setDial] = useState(init.dial);
  const [national, setNational] = useState(init.national);

  useEffect(() => {
    onChange?.(`+${dial} ${national}`.trim());
  }, [dial, national]);

  const selected = COUNTRIES.find((c) => c.dial === dial) || COUNTRIES[0];

  return (
    <div className="flex gap-2">
      <select
        className="min-w-[140px] p-2 rounded border border-white/20 bg-white text-gray-900"
        value={dial}
        onChange={(e) => setDial(e.target.value)}
      >
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.dial}>
            {c.flag} +{c.dial}
          </option>
        ))}
      </select>
      <input
        className="flex-1 p-2 rounded bg-white/10 border border-white/20"
        inputMode="numeric"
        pattern="[0-9]*"
        placeholder={placeholder || `+${selected.dial} 3001234567`}
        value={national}
        onChange={(e) => {
          const only = e.target.value.replace(/[^\d]/g, '');
          setNational(only);
        }}
      />
    </div>
  );
}
