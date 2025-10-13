// FILE: src/components/common/CategorySelect.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useCategories } from '@/features/categories/useCategories';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

/** Stopwords en español */
const STOPWORDS_ES = new Set([
  'de','del','la','el','los','las','y','o','u','en','para','por','con','al','lo','un','una','unos','unas',
  'a','se','su','sus','mi','mis','tu','tus'
]);

/** Normaliza: minúsculas, sin tildes, solo [a-z0-9] y espacios */
function normalizeStr(s = '') {
  return String(s)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ')
    .trim().replace(/\s+/g, ' ');
}

/** Tokeniza y remueve stopwords */
function tokensFrom(str) {
  const norm = normalizeStr(str);
  if (!norm) return [];
  return norm.split(' ').filter(t => t && !STOPWORDS_ES.has(t));
}

export default function CategorySelect({
  value,
  onChange,
  allowCreate = true,
  label = 'Categoría',
  placeholder = 'Buscar categoría…',
  showParentOption = true,
}) {
  const { loading, parents, childrenByParentId, items, ensure, remove } = useCategories();

  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [createParentId, setCreateParentId] = useState('');

  const containerRef = useRef(null);
  const inputRef = useRef(null);

  /** Construcción de filas con clave de búsqueda normalizada y metadatos */
  const rows = useMemo(() => {
    const out = [];
    const byId = Object.fromEntries(items.map(c => [c.id, c]));
    const sortedParents = parents.slice().sort((a, b) => a.name.localeCompare(b.name));
    for (const p of sortedParents) {
      const kids = (childrenByParentId[p.id] || []).slice().sort((a, b) => a.name.localeCompare(b.name));
      if (showParentOption) {
        out.push({
          id: p.id,
          label: p.name,
          group: p.name,
          isParent: true,
          isUserOwned: !!p.user_id,
          searchKey: normalizeStr(p.name),
          raw: p,
        });
      }
      for (const k of kids) {
        out.push({
          id: k.id,
          label: k.name,
          group: p.name,
          isParent: false,
          isUserOwned: !!k.user_id,
          searchKey: normalizeStr(`${p.name} ${k.name}`),
          raw: k,
          parentRaw: byId[k.parent_id],
        });
      }
    }
    return out;
  }, [items, parents, childrenByParentId, showParentOption]);

  /** Filtro con scoring (padres priorizados) */
  const filtered = useMemo(() => {
    const qTokens = tokensFrom(term);
    if (!qTokens.length) return rows.slice(0, 40); // sugerencias iniciales

    const scored = [];
    for (const r of rows) {
      const ok = qTokens.every(t => r.searchKey.includes(t));
      if (!ok) continue;

      const phrase = qTokens.join(' ');
      let score = r.searchKey.includes(phrase) ? 0 : 1000;

      for (const t of qTokens) {
        const pos = r.searchKey.indexOf(t);
        score += pos >= 0 ? pos : 5000;
      }

      // BONUS a padres
      if (r.isParent) score -= 300;

      scored.push([score, r]);
    }
    scored.sort((a, b) => a[0] - b[0]);
    return scored.map(x => x[1]).slice(0, 50);
  }, [rows, term]);

  const byId = useMemo(() => Object.fromEntries(items.map(c => [c.id, c])), [items]);
  const selected = value ? byId[value] : null;
  const selectedParent = selected?.parent_id ? byId[selected.parent_id] : (selected || null);
  const selectedLabel = selected
    ? (selected?.parent_id ? `${selectedParent?.name} › ${selected?.name}` : `${selected?.name}`)
    : '';

  // Cerrar dropdown al clicar fuera
  useEffect(() => {
    const onDocClick = (e) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const pick = (id) => {
    onChange?.(id || null);
    setTerm('');
    setOpen(false);
  };

  // Crear sin usar <form> anidado (evita submit del formulario padre)
  const handleCreateClick = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const created = await ensure(name, createParentId || null);
      setNewName('');
      setCreateParentId('');
      pick(created.id); // selecciona, cierra y limpia
    } finally {
      setCreating(false);
    }
  };

  // Evita que Enter en el input de creación envíe el form padre
  const handleCreateKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleCreateClick();
    }
  };

  // Borrar categoría del usuario desde el dropdown
  const handleDeleteInList = async (e, id) => {
    e.preventDefault();
    e.stopPropagation(); // no seleccionar la fila
    const ok = window.confirm('¿Eliminar esta categoría?');
    if (!ok) return;
    try {
      await remove(id);
      if (value === id) pick(null); // si era la seleccionada, limpiar
    } catch (err) {
      console.error(err);
      alert(err.message || 'No se pudo eliminar esta categoría.');
    }
  };

  const inputCls =
    'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#1E1E1E] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#9E7977] focus:border-transparent';

  return (
    <div className="space-y-2" ref={containerRef}>
      <Label>{label}</Label>

      {/* Buscador (abre al tipear) */}
      <div className="relative">
        <input
          ref={inputRef}
          value={term}
          onChange={(e) => { setTerm(e.target.value); setOpen(true); }}
          placeholder={placeholder}
          className={inputCls}
          disabled={loading}
        />

        {open && filtered.length > 0 && (
          <ul className="absolute z-50 mt-1 w-full max-h-64 overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
            {filtered.map((opt) => (
              <li
                key={opt.id}
                className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-gray-100"
                onMouseDown={() => pick(opt.id)}
                title={`${opt.group}${opt.isParent ? '' : ' › ' + opt.label}`}
              >
                <div className="truncate">
                  {opt.isParent ? (
                    <span>{opt.group}</span>
                  ) : (
                    <span>{opt.group} <span className="text-gray-400">›</span> {opt.label}</span>
                  )}
                </div>

                {/* Botón eliminar solo para categorías del usuario */}
                {opt.isUserOwned && (
                  <button
                    type="button"
                    className="shrink-0 rounded px-2 py-0.5 text-xs text-red-600 hover:bg-red-50 border border-red-200"
                    onMouseDown={(e) => handleDeleteInList(e, opt.id)}
                    title="Eliminar categoría"
                    aria-label="Eliminar categoría"
                  >
                    🗑
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Tag de selección */}
      {selected && (
        <div className="flex items-center gap-2 w-fit rounded-full bg-gray-100 px-3 py-1 text-sm">
          <span className="text-[#1E1E1E]">{selectedLabel}</span>
          <button
            type="button"
            onClick={() => pick(null)}
            className="ml-1 text-gray-500 hover:text-gray-700"
            aria-label="Quitar categoría"
            title="Quitar categoría"
          >
            ×
          </button>
        </div>
      )}

      {/* Crear nueva categoría */}
      {allowCreate && (
        <details>
          <summary className="cursor-pointer text-sm text-[#2A5BD7]">Crear nueva categoría</summary>

          <div className="mt-2 space-y-2">
            <div className="space-y-1">
              <Label>Categoría principal</Label>
              <select
                value={createParentId}
                onChange={(e)=>setCreateParentId(e.target.value)}
                className={`${inputCls} pr-8`}
              >
                <option value="">— Categoría principal</option>
                {parents
                  .slice()
                  .sort((a,b)=>a.name.localeCompare(b.name))
                  .map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
              </select>
            </div>

            <div className="flex gap-2">
              <input
                value={newName}
                onChange={(e)=>setNewName(e.target.value)}
                onKeyDown={handleCreateKeyDown}
                placeholder="Nombre de la nueva categoría"
                className={inputCls}
              />
              <Button type="button" onClick={handleCreateClick} disabled={!newName.trim() || creating}>
                Crear
              </Button>
            </div>
          </div>
        </details>
      )}
    </div>
  );
}
