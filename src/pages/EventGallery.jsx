// src/pages/EventGallery.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import LoadingSpinner from '@/components/LoadingSpinner';

import HeroHeader from '@/components/gallery/HeroHeader';
import CategoryBar from '@/components/gallery/CategoryBar';
import ImageGrid from '@/components/gallery/ImageGrid';
import LightboxModal from '@/components/gallery/LightboxModal';
import SlideshowModal from '@/components/gallery/SlideshowModal';

// ⬇️ Provider de plantillas (no altera el look por defecto)
import { GalleryThemeProvider } from '@/gallery/theme';
// ⬇️ variables CSS de plantillas
import '@/gallery/theme/templates.css';

// === IndexedDB cache (metadatos de uploads) ===
const uploadsCache = (() => {
  let dbPromise;
  const DB = 'mitus-cache';
  const STORE = 'uploadsByEvent';
  const open = () =>
    dbPromise ||
    (dbPromise = new Promise((res, rej) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    }));
  const get = async (key) => {
    const db = await open();
    return new Promise((res, rej) => {
      const tx = db.transaction(STORE, 'readonly');
      const rq = tx.objectStore(STORE).get(key);
      rq.onsuccess = () => res(rq.result || null);
      rq.onerror = () => rej(rq.error);
    });
  };
  const set = async (key, val) => {
    const db = await open();
    return new Promise((res, rej) => {
      const tx = db.transaction(STORE, 'readwrite');
      const rq = tx.objectStore(STORE).put(val, key);
      rq.onsuccess = () => res();
      rq.onerror = () => rej(rq.error);
    });
  };
  return { get, set };
})();

// === Campos mínimos y paginación ===
const PAGE_SIZE = 90;
const MIN_FIELDS = [
  'id', 'type', 'category', 'approved', 'uploaded_at', 'file_name',
  'web_url', 'web_width', 'web_height', 'web_size',
  'thumb_url', 'thumb_width', 'thumb_height', 'thumb_size'
].join(',');

// === Registrar Service Worker (cache de imágenes) ===
if ('serviceWorker' in navigator) {
  // No rompe si ya está registrado
  navigator.serviceWorker.register('/sw-mitus.js').catch(() => { });
}


// Canon por defecto (soportamos mayúsculas/nuevas categorías y las antiguas)
const DEFAULT_CATEGORY = 'MÁS MOMENTOS';
const CATEGORY_ORDER = [
  'DESTACADO',
  'PREPARACIÓN',
  'PRIMERA VISTA',
  'CEREMONIA',
  'RETRATOS',
  'PROTOCOLO',
  'FAMILIA',
  'AMIGOS',
  'FAMILIA & AMIGOS', // compatibilidad con galerías antiguas
  'RECEPCIÓN',
  'LA FIESTA',
  'DETALLES & DECORACIÓN',
  DEFAULT_CATEGORY,
];

const MOSTRAR_TODO = 'MOSTRAR TODO';

const isLandscapeViewport = () => window.innerWidth >= window.innerHeight;

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.split(/&|y/i).map(p => p.trim()).filter(Boolean);
  if (parts.length > 1) return `${parts[0][0]} & ${parts[1][0]}`.toUpperCase();
  return name[0].toUpperCase();
};

// Normaliza nombres de categoría a un canon único (mayúsculas, tildes y alias)
const canonicalCategory = (val) => {
  let t = String(val || '').trim();
  if (!t) return DEFAULT_CATEGORY;
  t = t.replace(/\s*&\s*/g, ' & ').replace(/\s+/g, ' ');
  let up = t.toLocaleUpperCase('es-ES');

  // Alias y equivalencias
  if (up === 'FIESTA') up = 'LA FIESTA';
  if (up === 'DETALLES & DECORACION') up = 'DETALLES & DECORACIÓN';
  if (up === 'MAS MOMENTOS') up = DEFAULT_CATEGORY;
  if (up === 'MÁS  MOMENTOS' || up === 'MÁS MOMENTO') up = DEFAULT_CATEGORY;

  return up || DEFAULT_CATEGORY;
};

// Carga dimensiones reales de una imagen (para masonry)
const loadImageSize = (src) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = src;
  });

// Decodifica ?d=<base64 json> en overrides
function decodeDesignOverrides(search) {
  try {
    const q = new URLSearchParams(search);
    const d = q.get('d');
    if (!d) return null;
    // Base64 URL-safe → estándar
    const b64 = d.replace(/-/g, '+').replace(/_/g, '/');
    const pad = '='.repeat((4 - (b64.length % 4)) % 4);
    const json = atob(b64 + pad);
    return JSON.parse(json);
  } catch {
    try {
      // fallback: por si viene como JSON URI-encoded
      const q = new URLSearchParams(search);
      const raw = q.get('d');
      return raw ? JSON.parse(decodeURIComponent(raw)) : null;
    } catch {
      return null;
    }
  }
}

const EventGallery = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // ⬇️ Vista previa por ?tpl=
  // - classic/clean/overlay/... → usar esa plantilla
  // - draft → usar la plantilla guardada (no pasar "draft" al provider)
  const previewTemplate = useMemo(() => {
    const q = new URLSearchParams(location.search);
    const tpl = q.get('tpl');
    if (!tpl) return null;
    const key = String(tpl).toLowerCase();
    return key === 'draft' ? null : key;
  }, [location.search]);

  // ⬇️ Overrides por URL (?d=base64json). Prioridad: URL > BD.
  const urlOverrides = useMemo(() => decodeDesignOverrides(location.search) || {}, [location.search]);

  const [event, setEvent] = useState(null);
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtro por categoría (MOSTRAR TODO por defecto)
  const [activeCategory, setActiveCategory] = useState(MOSTRAR_TODO);

  // Viewer (clic en imagen)
  const [lightboxIndex, setLightboxIndex] = useState(null);

  // Slideshow (botón play o desde space en viewer)
  const [slideshowIndex, setSlideshowIndex] = useState(null);

  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [downloadCode, setDownloadCode] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  const [coverUrl, setCoverUrl] = useState(null);
  const [heroLoaded, setHeroLoaded] = useState(false);

  // Paginación & cache
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingPage, setIsFetchingPage] = useState(false);
  const [cachedSummary, setCachedSummary] = useState(null);
  const loadMoreRef = useRef(null);


  // Sticky shadow para la barra de categorías
  const [stickyShadow, setStickyShadow] = useState(false);
  const stickySentinelRef = useRef(null);

  // Referencias para layout grid
  const gridWrapperRef = useRef(null);

  // Referencia para devolver el foco al cerrar los modales
  const lastActiveElRef = useRef(null);
  const closeBtnRef = useRef(null);

  // === GRID MASONRY: funciones de layout ===
  const relayoutCard = useCallback((cardEl) => {
    const gridEl = cardEl?.closest?.('.grid-masonry');
    if (!gridEl) return;

    const styles = window.getComputedStyle(gridEl);
    const rowGap = parseFloat(styles.rowGap);
    const rowHeight = parseFloat(styles.gridAutoRows);

    const mediaEl = cardEl.querySelector('[data-media]');
    if (!mediaEl) return;

    const cardWidth = cardEl.clientWidth;

    const dw = parseFloat(mediaEl.getAttribute('data-w'));
    const dh = parseFloat(mediaEl.getAttribute('data-h'));
    let height = 0;
    if (dw > 0 && dh > 0) {
      height = (cardWidth * dh) / dw;
    } else if (mediaEl.tagName === 'IMG' && mediaEl.naturalWidth && mediaEl.naturalHeight) {
      height = (cardWidth * mediaEl.naturalHeight) / mediaEl.naturalWidth;
    } else if (mediaEl.tagName === 'VIDEO' && mediaEl.videoWidth && mediaEl.videoHeight) {
      height = (cardWidth * mediaEl.videoHeight) / mediaEl.videoWidth;
    } else {
      height = mediaEl.offsetHeight || Math.ceil(mediaEl.getBoundingClientRect().height);
    }

    const span = Math.ceil((Math.ceil(height) + rowGap) / (rowHeight + rowGap));
    cardEl.style.gridRowEnd = `span ${span}`;
  }, []);

  const relayoutAll = useCallback(() => {
    const root = gridWrapperRef.current;
    if (!root) return;
    const cards = root.querySelectorAll('.grid-item');
    cards.forEach((c) => relayoutCard(c));
  }, [relayoutCard]);

  useEffect(() => {
    if (!gridWrapperRef.current) return;
    const ro = new ResizeObserver(() => {
      relayoutAll();
    });
    ro.observe(gridWrapperRef.current);
    window.addEventListener('load', relayoutAll);
    return () => {
      ro.disconnect();
      window.removeEventListener('load', relayoutAll);
    };
  }, [relayoutAll]);

  const onImageReady = useCallback((mediaEl) => {
    const run = async () => {
      try {
        if (mediaEl?.tagName === 'IMG' && 'decode' in mediaEl) {
          await mediaEl.decode();
        }
      } catch { }
      if (!mediaEl) return;
      const card = mediaEl.closest?.('.grid-item');
      if (!card) return;
      requestAnimationFrame(() => requestAnimationFrame(() => relayoutCard(card)));
    };
    run();
  }, [relayoutCard]);

  // HEAD de uploads: cuenta total y última fecha (para revalidar cache)
  const getUploadsHead = useCallback(async (moderated) => {
    let q = supabase
      .from('uploads')
      .select('uploaded_at', { count: 'exact' })
      .eq('event_id', eventId)
      .order('uploaded_at', { ascending: false })
      .limit(1);
    if (moderated) q = q.eq('approved', true);
    const { data, error, count } = await q;
    if (error) throw error;
    const latest = data?.[0]?.uploaded_at || null;
    return { count: count || 0, latest };
  }, [eventId]);

  // Página de uploads (select mínimo + paginación)
  const fetchUploadsPage = useCallback(async (pageIdx, moderated) => {
    const from = pageIdx * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    let q = supabase
      .from('uploads')
      .select(MIN_FIELDS)
      .eq('event_id', eventId)
      .order('uploaded_at', { ascending: false })
      .range(from, to);
    if (moderated) q = q.eq('approved', true);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }, [eventId]);

  // Carga inicial: evento + cache local + revalidación + primera página
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);

        // 1) Evento
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('id, title, date, cover_image_url, settings, invitation_details')
          .eq('id', eventId)
          .single();

        if (eventError || !eventData) {
          toast({ title: 'Evento no encontrado', variant: 'destructive' });
          navigate('/');
          return;
        }
        if (!alive) return;
        setEvent(eventData);

        const moderated = !!(eventData.settings?.requireModeration);
        const cacheKey = `uploads:${eventId}${moderated ? ':approved' : ''}`;

        // 2) Mostrar CACHE si existe (render instantáneo)
        const cached = await uploadsCache.get(cacheKey).catch(() => null);
        if (cached?.items?.length) {
          if (!alive) return;
          setUploads(cached.items);
          setCachedSummary(cached.summary || null);
          setLoading(false);
          setPage(Math.ceil(cached.items.length / PAGE_SIZE));
          setHasMore(!cached.summary || cached.items.length < (cached.summary.count || 0));
        }

        // 3) Revalidar con HEAD
        const head = await getUploadsHead(moderated);
        if (!alive) return;

        const cacheIsFresh =
          cached?.summary &&
          cached.summary.count === head.count &&
          cached.summary.latest === head.latest;

        if (cacheIsFresh) {
          // Cache válido: nada más que hacer
          if (cached && !cached.items?.length) setHasMore(false);
          return;
        }

        // 4) Cache desactualizado o ausente → pedir primera página
        const first = await fetchUploadsPage(0, moderated);
        if (!alive) return;
        setUploads(first);
        setPage(1);
        setHasMore(first.length === PAGE_SIZE);
        setCachedSummary(head);
        await uploadsCache.set(cacheKey, { items: first, summary: head, savedAt: Date.now() });
        setLoading(false);
      } catch (error) {
        console.error('Error fetching gallery data:', error);
        toast({
          title: 'Error al cargar la galería',
          description: error.message,
          variant: 'destructive'
        });
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [eventId, navigate, getUploadsHead, fetchUploadsPage, toast, setEvent]);

  // Cargar más páginas al hacer scroll
  const loadMore = useCallback(async () => {
    if (isFetchingPage || !hasMore || !event) return;
    setIsFetchingPage(true);
    try {
      const moderated = !!(event.settings?.requireModeration);
      const next = await fetchUploadsPage(page, moderated);
      const combined = [...uploads, ...next];
      setUploads(combined);
      setPage(prev => prev + 1);
      setHasMore(next.length === PAGE_SIZE);

      const head = cachedSummary || await getUploadsHead(moderated);
      const cacheKey = `uploads:${eventId}${moderated ? ':approved' : ''}`;
      await uploadsCache.set(cacheKey, { items: combined, summary: head, savedAt: Date.now() });
    } catch (e) {
      console.error(e);
    } finally {
      setIsFetchingPage(false);
    }
  }, [isFetchingPage, hasMore, event, fetchUploadsPage, page, uploads, cachedSummary, getUploadsHead, eventId]);

  // Observer del sentinel
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMore();
    }, { rootMargin: '800px' });
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore, hasMore]);


  // Filtrar por moderación (si está activa, solo aprobados)
  const moderatedUploads = useMemo(() => {
    const req = !!(event?.settings?.requireModeration);
    return req ? (uploads || []).filter(u => u.approved) : (uploads || []);
  }, [uploads, event?.settings?.requireModeration]);

  // Normalizar categorías y ordenar globalmente por orden de categoría + nombre
  const normalizedSorted = useMemo(() => {
    const withCat = moderatedUploads.map(u => ({ ...u, _cat: canonicalCategory(u.category || DEFAULT_CATEGORY) }));
    const orderIndex = (cat) => {
      const i = CATEGORY_ORDER.indexOf(cat);
      return i === -1 ? 9_000 : i;
    };
    const nameOf = (u) =>
      (u.file_name || u.title || (u.file_url?.split('/')?.pop()?.split('?')[0]) || '')
        .toLocaleLowerCase('es');
    return [...withCat].sort((a, b) => {
      const ca = orderIndex(a._cat), cb = orderIndex(b._cat);
      if (ca !== cb) return ca - cb;
      const n = nameOf(a).localeCompare(nameOf(b), 'es', { numeric: true, sensitivity: 'base' });
      if (n !== 0) return n;
      return String(a.id).localeCompare(String(b.id));
    });
  }, [moderatedUploads]);

  // Categorías presentes (orden respetando CATEGORY_ORDER). Usamos dataset moderado.
  const categoriesPresent = useMemo(() => {
    const present = new Set(normalizedSorted.map(u => u._cat));
    const ordered = CATEGORY_ORDER.filter(c => present.has(c));
    return ordered;
  }, [normalizedSorted]);

  // Mostrar barra de categorías SOLO si hay 2 o más categorías
  const showCategoryBar = categoriesPresent.length >= 2;

  // Cambiar selección: MOSTRAR TODO o una categoría en específico
  const barItems = useMemo(() => {
    return showCategoryBar ? [MOSTRAR_TODO, ...categoriesPresent] : [];
  }, [showCategoryBar, categoriesPresent]);

  // Items visibles según el filtro activo
  const filteredByCategory = useMemo(() => {
    if (activeCategory === MOSTRAR_TODO || !showCategoryBar) return normalizedSorted;
    return normalizedSorted.filter(u => u._cat === activeCategory);
  }, [normalizedSorted, activeCategory, showCategoryBar]);

  // Deduplicar fotos por clave base; videos siempre pasan
  const displayItems = useMemo(() => {
    const baseKey = (u) => {
      const raw = (u.file_name || u.web_url || u.file_url || '').toLowerCase();
      const last = raw.split('/').pop()?.split('?')[0] || '';  // nombre.ext
      const stem = last.replace(/\.[a-z0-9]+$/i, '');          // nombre sin extensión
      return stem
        .replace(/@(?:2|3)x|-\d{2,4}w|-\d{2,4}h|_\d{2,4}x\d{2,4}/g, '')
        .replace(/(?:^|[_-])(web|webp|mobile|thumb|sm|md|lg|xl|orig(?:inal)?|full|hires)(?:[_-]\d+)?$/, '');
    };
    const seen = new Set();
    return filteredByCategory
      .filter(u => u.type === 'video' || !!u.web_url)
      .filter(u => {
        if (u.type === 'video') return true;
        const k = baseKey(u);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
  }, [filteredByCategory]);

  // Re-layout cuando cambie el dataset visible
  useEffect(() => {
    const t = setTimeout(relayoutAll, 0);
    return () => clearTimeout(t);
  }, [displayItems, relayoutAll]);

  // Portada sin descargar: usa dimensiones ya guardadas (web_width/height)
  const pickCoverFromMeta = useCallback((allUploads) => {
    if (event?.cover_image_url) return event.cover_image_url;

    const wantLandscape = isLandscapeViewport();
    const imgs = (allUploads || []).filter(u => u.type !== 'video' && u.web_url && u.web_width && u.web_height);
    if (!imgs.length) return null;

    const candidate =
      imgs.find(u => wantLandscape ? u.web_width >= u.web_height : u.web_height >= u.web_width) ||
      imgs[0];

    return candidate.web_url || null;
  }, [event?.cover_image_url]);

  useEffect(() => {
    const chosen = pickCoverFromMeta(uploads);
    setCoverUrl(chosen || 'https://images.unsplash.com/photo-1617183478968-6e7f5a6406fd?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0');
  }, [uploads, pickCoverFromMeta]);


  // Sticky shadow: cuando el sentinel sale de vista, activamos sombra
  useEffect(() => {
    const el = stickySentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setStickyShadow(!entry.isIntersecting),
      { root: null, threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Acciones
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: 'Enlace copiado al portapapeles' });
  };

  const openSlideshow = () => {
    if (displayItems.length === 0) {
      toast({ title: 'Galería vacía', description: 'No hay imágenes para el slideshow.' });
      return;
    }
    setSlideshowIndex(0);
  };

  const handleDownloadRequest = () => {
    if (!event?.settings?.downloadCode) {
      toast({
        title: 'Descarga no habilitada',
        description: 'El anfitrión no ha configurado un código de descarga.',
        variant: 'destructive'
      });
      return;
    }
    setIsDownloadModalOpen(true);
  };

  const handleConfirmDownload = async () => {
    if (isDownloading) return;

    if (downloadCode !== event.settings.downloadCode) {
      toast({ title: 'Código incorrecto', variant: 'destructive' });
      return;
    }
    if (event.settings.downloadLimit <= 0) {
      toast({ title: 'Límite de descargas alcanzado', variant: 'destructive' });
      return;
    }

    setIsDownloading(true);
    toast({ title: 'Preparando descarga...', description: 'Esto puede tardar unos minutos.' });

    const zip = new JSZip();
    for (const upload of normalizedSorted) {
      try {
        const src = upload.web_url || upload.thumb_url;
        if (!src) continue;
        const response = await fetch(src);
        const blob = await response.blob();
        const name = (upload.file_name || `${upload.id}`).replace(/\.[a-z0-9]+$/i, '') + '.webp';
        zip.file(name, blob);
      } catch (e) {
        console.error('Failed to fetch asset for zip', e);
      }
    }


    zip.generateAsync({ type: 'blob' }).then(async (content) => {
      saveAs(content, `mitus-galeria-${eventId}.zip`);
      toast({ title: '¡Descarga completa!', description: 'Tu archivo ZIP está listo.' });

      const newLimit = event.settings.downloadLimit - 1;
      const { error } = await supabase
        .from('events')
        .update({ settings: { ...event.settings, downloadLimit: newLimit } })
        .eq('id', eventId);
      if (error) console.error('Error updating download limit:', error);

      setIsDownloadModalOpen(false);
      setIsDownloading(false);
      setDownloadCode('');
    });
  };

  const eventDate = event ? new Date(event.date?.replace(/-/g, '/')) : null;
  const hostsText = event?.invitation_details?.hosts?.join(' & ') || event?.title || '';
  const eventType = event?.title || '';
  const initials = getInitials(hostsText);

  // ⬇️ Merge final de overrides: BD + URL (URL tiene prioridad)
  const effectiveOverrides = useMemo(() => {
    const base = (event?.settings?.design) || {};
    return { ...base, ...urlOverrides };
  }, [event?.settings?.design, urlOverrides]);

  // ⬇️ Carga dinámica de Google Fonts si la tipografía base lo requiere
  useEffect(() => {
    const familyBase = effectiveOverrides['font-family-base'];
    if (!familyBase) return;

    // extrae la primera familia, p.ej. "'Inter', system-ui, ..." -> Inter
    const primary = String(familyBase).split(',')[0].trim().replace(/^['"]|['"]$/g, '');
    const FONT_URLS = {
      Inter: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
      Montserrat: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap',
      'Playfair Display': 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap',
      'DM Serif Display': 'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap',
      // Lato y Raleway ya se importan en el <style> inline
    };
    const href = FONT_URLS[primary];
    if (!href) return;

    const id = `gf-base-${primary.replace(/\s+/g, '-').toLowerCase()}`;
    if (document.getElementById(id)) return;

    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }, [effectiveOverrides]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <GalleryThemeProvider
      template={previewTemplate ?? event?.settings?.galleryTemplate}
      overrides={effectiveOverrides}
    >
      <div className="bg-white text-[#1E1E1E] min-h-screen">
        <style>
          {`
            @import url('https://fonts.googleapis.com/css2?family=Raleway:wght@600;700&family=Lato:wght@300;400;500&display=swap');
            .font-raleway{font-family:'Raleway',sans-serif;}
            .font-lato{font-family:'Lato',sans-serif;}

            /* Tipografía base (no invasivo) */
            .gallery-theme {
              font-size: var(--font-size-base, 16px);
              font-family: var(--font-family-base, 'Lato', sans-serif);
            }

            /* === Masonry por filas con CSS Grid ===
               NOTA: columnas y gap los impone templates.css con !important */
            .grid-masonry {
              display: grid;
              grid-auto-rows: 1px;
              grid-auto-flow: row;
            }
            .grid-item { position: relative; box-sizing: border-box; }
            .grid-masonry img,
            .grid-masonry video { display: block; width: 100%; height: 100%; vertical-align: bottom; }

            /* Altura estable del hero */
            .hero-grid { display: grid; grid-template-rows: 1fr; min-height: 100vh; height: 100vh; overflow: visible; }
            @supports (height: 100svh) { .hero-grid { min-height: 100svh; height: 100svh; } }
            @supports (height: 100dvh) { .hero-grid { min-height: 100dvh; height: 100dvh; } }
            .hero-grid > .hero-bg { height: 100%; /* opcional: min-height: - height: 100%; */ }

            .hero-bg { position: relative; overflow: hidden; }
            .hero-bg img {
              width: 100%; height: 100%; object-fit: cover;
              /* Set Focal (x/y en %) */
              object-position: var(--hero-focal-x, 50%) var(--hero-focal-y, 50%);
              transform: scale(1.05);
              transition: filter .5s ease, opacity .4s ease; filter: blur(6px); opacity: .85;
            }
            .hero-bg img.loaded { filter: blur(0); opacity: 1; }

            /* Overlay con alias hacia --hero-overlay */
            .hero-overlay {
              position: absolute; inset: 0;
              background: var(--gallery-hero-overlay, var(--hero-overlay, rgba(0,0,0,.45)));
            }

            /* Borde del círculo con alias hacia --hero-initials-border */
            .initials-circle {
              width: clamp(120px, 22vw, 200px); height: clamp(120px, 22vw, 200px);
              border-radius: 9999px; display: flex; align-items: center; justify-content: center;
              background: transparent; backdrop-filter: none;
              border: 3px solid var(--gallery-hero-circle-border, var(--hero-initials-border, rgba(255,255,255,.55)));
              box-shadow: 0 8px 30px rgba(0,0,0,.25);
            }
            .initials-circle span{
              font-family: 'Lato', sans-serif; font-weight: 800;
              font-size: clamp(28px, 6vw, 48px); color: #fff; letter-spacing: .04em; white-space: nowrap;
              text-shadow: 0 2px 12px rgba(0,0,0,.45);
            }

            .lightbox-media { max-width: 100vw; max-height: 100vh; width: auto; height: auto; object-fit: contain; }

            @keyframes nudge { 0% { transform: translateY(0); opacity: .9; } 50% { transform: translateY(4px); opacity: 1; } 100% { transform: translateY(0); opacity: .9; } }
            .chevron-anim { animation: nudge 1.6s ease-in-out infinite; }
          `}
        </style>

        <HeroHeader
          coverUrl={coverUrl}
          heroLoaded={heroLoaded}
          setHeroLoaded={setHeroLoaded}
          hostsText={hostsText}
          initials={initials}
          eventTitle={event?.title}
          eventDate={eventDate}
          onScrollToGallery={() => {
            const el = document.getElementById('topbar-start') || document.getElementById('gallery-start');
            el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}

          onDownloadRequest={handleDownloadRequest}
          onShare={handleShare}
          onOpenSlideshow={openSlideshow}
          eventType={eventType}
        />

        {/* Sentinel para detectar sticky activo */}
        <div ref={stickySentinelRef} />

        {/* Barra de categorías */}
        <CategoryBar
          show={showCategoryBar}
          stickyShadow={stickyShadow}
          items={barItems}
          active={activeCategory}
          onChange={setActiveCategory}
        />

        <div id="gallery-start" />

        {/* Lista de imágenes (grid) */}
        <ImageGrid
          displayItems={displayItems}
          onItemClick={(index) => {
            lastActiveElRef.current = document.activeElement;
            setLightboxIndex(index);
          }}
          onImageReady={onImageReady}
          gridWrapperRef={gridWrapperRef}
        />

        {/* Sentinel para carga incremental */}
        <div ref={loadMoreRef} style={{ height: 1 }} />


        <footer className="text-center py-10 border-t border-black/5">
          <p className="text-xs text-black/60">Powered by Mitus</p>
        </footer>

        {/* Modales */}
        <AnimatePresence>
          {lightboxIndex !== null && (
            <LightboxModal
              event={event}
              uploads={displayItems}
              startIndex={lightboxIndex}
              onClose={() => {
                setLightboxIndex(null);
                if (lastActiveElRef.current && lastActiveElRef.current.focus) {
                  try { lastActiveElRef.current.focus(); } catch { }
                }
              }}
              closeBtnRef={closeBtnRef}
              onRequestSlideshow={(idx) => {
                setLightboxIndex(null);
                setSlideshowIndex(idx ?? 0);
              }}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {slideshowIndex !== null && (
            <SlideshowModal
              event={event}
              uploads={displayItems}
              startIndex={slideshowIndex}
              onClose={() => {
                setSlideshowIndex(null);
                if (lastActiveElRef.current && lastActiveElRef.current.focus) {
                  try { lastActiveElRef.current.focus(); } catch { }
                }
              }}
              closeBtnRef={closeBtnRef}
            />
          )}
        </AnimatePresence>

        {/* Modal de descarga por código */}
        <Dialog open={isDownloadModalOpen} onOpenChange={setIsDownloadModalOpen}>
          <DialogContent className="sm:max-w-[425px] bg-white">
            <DialogHeader>
              <DialogTitle className="flex items-center"> Descargar galería completa</DialogTitle>
              <DialogDescription>Ingresa el código de descarga proporcionado por el anfitrión para descargar todos los archivos en un solo ZIP.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="download-code" className="text-right">Código</Label>
                <input id="download-code" value={downloadCode} onChange={(e) => setDownloadCode(e.target.value)} className="col-span-3 p-2 border rounded-md" placeholder="XXXXXX" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleConfirmDownload} disabled={isDownloading} className="bg-black text-white hover:bg-black/80">{isDownloading ? 'Descargando...' : 'Confirmar y descargar'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </GalleryThemeProvider>
  );
};

export default EventGallery;
