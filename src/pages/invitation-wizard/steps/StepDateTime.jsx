// src/pages/invitation-wizard/steps/StepDateTime.jsx
// MOD: Se agrega País, Ciudad y Moneda al paso de Fecha/Hora.
// - Mantiene fecha (YYYY-MM-DD) y hora (HH:mm) como cadenas (sin new Date('YYYY-MM-DD')).
// - País con bandera y países comunes (default: Colombia).
// - Moneda asociada al país por defecto (auto), pero editable (default: COP).
// - Campo de ciudad libre.
// - Todo se guarda en formData: eventDate, eventTime, eventCountry, eventCity, eventCurrency.

import React, { useEffect, useMemo, useState } from 'react';

// Países comunes con su moneda principal
const COMMON_COUNTRIES = [
  { code: 'CO', name: 'Colombia', currency: 'COP', currencyName: 'Peso colombiano' },
  { code: 'US', name: 'Estados Unidos', currency: 'USD', currencyName: 'Dólar estadounidense' },
  { code: 'MX', name: 'México', currency: 'MXN', currencyName: 'Peso mexicano' },
  { code: 'ES', name: 'España', currency: 'EUR', currencyName: 'Euro' },
  { code: 'AR', name: 'Argentina', currency: 'ARS', currencyName: 'Peso argentino' },
  { code: 'CL', name: 'Chile', currency: 'CLP', currencyName: 'Peso chileno' },
  { code: 'PE', name: 'Perú', currency: 'PEN', currencyName: 'Sol peruano' },
  { code: 'EC', name: 'Ecuador', currency: 'USD', currencyName: 'Dólar estadounidense' },
  { code: 'BR', name: 'Brasil', currency: 'BRL', currencyName: 'Real brasileño' },
  { code: 'GB', name: 'Reino Unido', currency: 'GBP', currencyName: 'Libra esterlina' },
  { code: 'CA', name: 'Canadá', currency: 'CAD', currencyName: 'Dólar canadiense' },
  { code: 'DE', name: 'Alemania', currency: 'EUR', currencyName: 'Euro' },
  { code: 'FR', name: 'Francia', currency: 'EUR', currencyName: 'Euro' },
  { code: 'IT', name: 'Italia', currency: 'EUR', currencyName: 'Euro' },
];

function flagEmojiFromCountry(code) {
  // Convierte código ISO-2 a bandera (emoji regional indicators)
  // Ej: 'CO' -> 🇨🇴
  if (!code || code.length !== 2) return '🏳️';
  const base = 127397; // 0x1F1E6 - 'A'
  const chars = code.toUpperCase().split('').map(c => String.fromCodePoint(base + c.charCodeAt(0)));
  return chars.join('');
}

export default function StepDateTime({ formData, setFormData }) {
  // Defaults seguros (no Date objects)
  const [localDate, setLocalDate] = useState(formData?.eventDate || ''); // 'YYYY-MM-DD'
  const [localTime, setLocalTime] = useState(formData?.eventTime || ''); // 'HH:mm'
  const [country, setCountry] = useState(formData?.eventCountry || 'CO');
  const [city, setCity] = useState(formData?.eventCity || '');
  const [currency, setCurrency] = useState(formData?.eventCurrency || 'COP');

  // Mapa rápido por país
  const countryMap = useMemo(() => {
    const m = new Map();
    COMMON_COUNTRIES.forEach(c => m.set(c.code, c));
    return m;
  }, []);

  // Lista de monedas únicas derivadas de COMMON_COUNTRIES (para el picker)
  const currencyOptions = useMemo(() => {
    const uniq = new Map();
    COMMON_COUNTRIES.forEach(({ currency, currencyName }) => {
      if (!uniq.has(currency)) uniq.set(currency, currencyName);
    });
    // Garantizamos USD y EUR presentes (por compatibilidad) aunque ya estén
    if (!uniq.has('USD')) uniq.set('USD', 'Dólar estadounidense');
    if (!uniq.has('EUR')) uniq.set('EUR', 'Euro');
    return Array.from(uniq.entries()).map(([code, name]) => ({ code, name }));
  }, []);

  // Al cambiar país, auto-seleccionar su moneda principal (editable luego)
  useEffect(() => {
    const info = countryMap.get(country);
    if (info && info.currency) {
      setCurrency(info.currency);
    }
  }, [country, countryMap]);

  // Sincronizar hacia formData (única fuente de verdad para el wizard)
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      eventDate: localDate,      // string 'YYYY-MM-DD'
      eventTime: localTime,      // string 'HH:mm'
      eventCountry: country,     // ISO-2
      eventCity: city,           // texto libre
      eventCurrency: currency,   // ISO moneda
    }));
  }, [localDate, localTime, country, city, currency, setFormData]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Fecha, hora, país y moneda</h2>
        <p className="text-sm text-muted-foreground">Configura la fecha y hora del evento, así como el país, ciudad y moneda que se utilizarán.</p>
      </div>

      {/* Fecha (cadena local YYYY-MM-DD) */}
      <div className="grid gap-2">
        <label className="text-sm font-medium">Fecha del evento</label>
        <input
          type="date"
          value={localDate}
          onChange={(e) => setLocalDate(e.target.value)}
          className="w-full rounded-md border px-3 py-2"
        />
        <p className="text-xs text-muted-foreground">Se guarda como cadena <code>YYYY-MM-DD</code> (sin convertir a UTC).</p>
      </div>

      {/* Hora (cadena local HH:mm) */}
      <div className="grid gap-2">
        <label className="text-sm font-medium">Hora del evento</label>
        <input
          type="time"
          value={localTime}
          onChange={(e) => setLocalTime(e.target.value)}
          className="w-full rounded-md border px-3 py-2"
        />
        <p className="text-xs text-muted-foreground">Se guarda como <code>HH:mm</code> local del evento (sin Date).</p>
      </div>

      {/* País con bandera */}
      <div className="grid gap-2">
        <label className="text-sm font-medium">País del evento</label>
        <div className="relative">
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full appearance-none rounded-md border px-3 py-2 pr-8"
          >
            {COMMON_COUNTRIES.map(c => (
              <option key={c.code} value={c.code}>
                {flagEmojiFromCountry(c.code)} {c.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-sm">▾</div>
        </div>
        <p className="text-xs text-muted-foreground">Al cambiar de país, la moneda se selecciona automáticamente, pero puedes modificarla.</p>
      </div>

      {/* Ciudad */}
      <div className="grid gap-2">
        <label className="text-sm font-medium">Ciudad</label>
        <input
          type="text"
          placeholder="Ej: Medellín"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="w-full rounded-md border px-3 py-2"
          autoComplete="address-level2"
        />
      </div>

      {/* Moneda con autoselección desde país, pero editable */}
      <div className="grid gap-2">
        <label className="text-sm font-medium">Moneda del evento</label>
        <div className="relative">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full appearance-none rounded-md border px-3 py-2 pr-8"
          >
            {currencyOptions.map(opt => (
              <option key={opt.code} value={opt.code}>
                {opt.code} — {opt.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-sm">▾</div>
        </div>
        <p className="text-xs text-muted-foreground">Default: Colombia (CO) y Peso colombiano (COP). Puedes cambiar la moneda si tu evento usa otra.</p>
      </div>

      {/* Notas de implementación para el equipo (no afectan UI) */}
      <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
        <ul className="list-disc pl-5 space-y-1">
          <li>Evitar <code>new Date('YYYY-MM-DD')</code>. Tratar la fecha como cadena local.</li>
          <li>Para persistencia: enviar <code>eventDate</code>, <code>eventTime</code>, <code>eventCountry</code>, <code>eventCity</code>, <code>eventCurrency</code>.</li>
          <li>El manejo de zona horaria se añadirá a nivel de evento (ej. <code>eventTimezone</code>) en pasos posteriores.</li>
        </ul>
      </div>
    </div>
  );
}
