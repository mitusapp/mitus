// src/components/common/SearchableSelect.jsx
import React from 'react';
import { ChevronsUpDown, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';

export default function SearchableSelect({
  value = '',
  onChange = () => {},
  options = [],            // [{ value, label }]
  placeholder = 'Seleccionar…',  // en tus filtros usas "Todos"/"Todas"
  label,                   // opcional: título arriba del control
  emptyText = 'Sin coincidencias…',
  className = '',
}) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find(o => String(o.value) === String(value));

  return (
    <div className={`flex flex-col ${className}`}>
      {label && (
        <label className="text-[11px] uppercase tracking-wide text-white/70 mb-1">
          {label}
        </label>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between bg-white/90 text-gray-900 border border-white/20 hover:bg-white"
          >
            <span className={selected ? '' : 'text-gray-500'}>
              {selected ? selected.label : placeholder}
            </span>
            <span className="flex items-center gap-1">
              {value !== '' && (
                <X
                  className="h-4 w-4 opacity-60 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(''); // limpiar → “Todos/Todas”
                  }}
                />
              )}
              <ChevronsUpDown className="ml-1 h-4 w-4 opacity-60" />
            </span>
          </Button>
        </PopoverTrigger>

        {/* Ancho igual al trigger: usar var(...) para asegurar compatibilidad */}
        <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]">
          <Command>
            <CommandInput placeholder="Buscar…" />
            <CommandList className="max-h-56">
              <CommandEmpty className="px-3 py-2 text-sm text-gray-500">
                {emptyText}
              </CommandEmpty>

              <CommandGroup>
                {/* Opción “Todos/Todas”: value vacío */}
                <CommandItem
                  value={`__all__`}
                  onSelect={() => {
                    onChange('');
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <Check className={`mr-2 h-4 w-4 ${value === '' ? 'opacity-100' : 'opacity-0'}`} />
                  {placeholder}
                </CommandItem>

                {options.map((opt) => {
                  const active = String(opt.value) === String(value);
                  return (
                    <CommandItem
                      key={opt.value}
                      value={`${opt.label} ${opt.value}`}
                      onSelect={() => {
                        onChange(opt.value);
                        setOpen(false);
                      }}
                      className="cursor-pointer"
                    >
                      <Check className={`mr-2 h-4 w-4 ${active ? 'opacity-100' : 'opacity-0'}`} />
                      {opt.label}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
