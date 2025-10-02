
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const countries = [
  { name: 'Colombia', code: 'CO', dial_code: '+57', flag: '🇨🇴' },
  { name: 'United States', code: 'US', dial_code: '+1', flag: '🇺🇸' },
  { name: 'Spain', code: 'ES', dial_code: '+34', flag: '🇪🇸' },
  { name: 'Mexico', code: 'MX', dial_code: '+52', flag: '🇲🇽' },
  { name: 'Argentina', code: 'AR', dial_code: '+54', flag: '🇦🇷' },
  { name: 'Peru', code: 'PE', dial_code: '+51', flag: '🇵🇪' },
  { name: 'Chile', code: 'CL', dial_code: '+56', flag: '🇨🇱' },
  { name: 'Ecuador', code: 'EC', dial_code: '+593', flag: '🇪🇨' },
  { name: 'Venezuela', code: 'VE', dial_code: '+58', flag: '🇻🇪' },
  { name: 'Brazil', code: 'BR', dial_code: '+55', flag: '🇧🇷' },
];

const CountryCodePicker = ({ onSelect, defaultCountryCode = 'CO' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState(
    countries.find(c => c.code === defaultCountryCode) || countries[0]
  );
  const pickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (country) => {
    setSelected(country);
    onSelect(country.dial_code);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={pickerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-full h-full px-3 py-3 bg-white/10 border border-white/20 rounded-l-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
      >
        <span className="mr-2">{selected.flag}</span>
        <span className="text-sm">{selected.dial_code}</span>
        <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.ul
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-10 bottom-full mb-2 w-48 bg-slate-800 border border-white/20 rounded-lg shadow-lg max-h-60 overflow-auto"
          >
            {countries.map((country) => (
              <li
                key={country.code}
                onClick={() => handleSelect(country)}
                className="flex items-center px-4 py-2 text-sm text-white cursor-pointer hover:bg-white/10"
              >
                <span className="mr-3">{country.flag}</span>
                <span className="flex-1">{country.name}</span>
                <span>{country.dial_code}</span>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CountryCodePicker;
