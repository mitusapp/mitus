import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { fetchPlaceDetails, fetchPredictions } from '@/lib/googlePlaces';

// Reutiliza el mismo diseño/UX del archivo original
const LocationForm = ({ locations, setFormData }) => {
  const [predictions, setPredictions] = useState({});
  const timers = useRef({});
  const [mapPreview, setMapPreview] = useState({ open: false, src: '', link: '' });

  const GMAPS_EMBED_KEY =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    import.meta.env.VITE_GOOGLE_PLACES_API_KEY ||
    '';

  const buildEmbedSrc = ({ lat, lng, placeId, address }) => {
    const base = 'https://www.google.com/maps/embed/v1';
    const key = `key=${encodeURIComponent(GMAPS_EMBED_KEY)}&language=es`;
    if (placeId) return `${base}/place?${key}&q=place_id:${encodeURIComponent(placeId)}`;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return `${base}/view?${key}&center=${lat},${lng}&zoom=16&maptype=roadmap`;
    }
    return `${base}/search?${key}&q=${encodeURIComponent(address || '')}`;
  };

  const buildMapsLink = ({ lat, lng, placeId, address }) => {
    if (placeId) return `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(placeId)}`;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || '')}`;
  };

  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach(clearTimeout);
    };
  }, []);

  const handleLocationChange = (index, field, value) => {
    const next = [...locations];
    next[index] = { ...next[index], [field]: value };
    setFormData((p) => ({ ...p, locations: next }));

    if (field === 'address') {
      if (timers.current[index]) clearTimeout(timers.current[index]);
      if ((value || '').length > 2) {
        timers.current[index] = setTimeout(async () => {
          try {
            const res = await fetchPredictions(value);
            setPredictions((prev) => ({ ...prev, [index]: res || [] }));
          } catch {
            setPredictions((prev) => ({ ...prev, [index]: [] }));
          }
        }, 300);
      } else {
        setPredictions((prev) => ({ ...prev, [index]: [] }));
      }
    }
  };

  const handleSelectPrediction = async (index, p) => {
    const placeIdFromPrediction = p?.placeId || p?.place_id || p?.id;
    if (!placeIdFromPrediction) return;

    const details = await fetchPlaceDetails(placeIdFromPrediction);
    if (!details) return;

    const comps = details.addressComponents || details.address_components || [];
    const getComp = (type) => {
      const c = comps.find((comp) => (comp.types || []).includes(type));
      return c?.longText || c?.long_name || '';
    };

    const formatted = details.formattedAddress || details.formatted_address || '';

    const geo = details.location || details.latLng || details.geometry?.location;
    let lat = null,
      lng = null;
    if (geo) {
      const rawLat = typeof geo.lat === 'function' ? geo.lat() : geo.latitude ?? geo.lat;
      const rawLng = typeof geo.lng === 'function' ? geo.lng() : geo.longitude ?? geo.lng;
      lat = Number(rawLat);
      lng = Number(rawLng);
    }

    const placeId = details.id || details.place_id || placeIdFromPrediction;

    const next = [...locations];
    next[index] = {
      ...next[index],
      address: formatted || next[index].address,
      city: getComp('locality') || getComp('administrative_area_level_2'),
      state: getComp('administrative_area_level_1'),
      country: getComp('country'),
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
      placeId: placeId || next[index].placeId,
    };

    setFormData((prev) => ({ ...prev, locations: next }));
    setPredictions((prev) => ({ ...prev, [index]: [] }));

    const src = buildEmbedSrc({ lat, lng, placeId, address: formatted || next[index].address });
    const link = buildMapsLink({ lat, lng, placeId, address: formatted || next[index].address });
    setMapPreview({ open: true, src, link });
  };

  const addLocation = () => {
    setFormData((prev) => ({
      ...prev,
      locations: [
        ...prev.locations,
        {
          title: '',
          time: '',
          address: '',
          city: '',
          state: '',
          country: '',
          lat: null,
          lng: null,
          placeId: undefined,
        },
      ],
    }));
  };

  return (
    <div className="space-y-4">
      {locations.map((loc, index) => (
        <div key={index} className="p-4 bg-white rounded-xl border border-slate-200 space-y-3 relative">
          <input
            type="text"
            value={loc.title}
            onChange={(e) => handleLocationChange(index, 'title', e.target.value)}
            placeholder="Título (ej: Ceremonia)"
            className="w-full px-3 py-2 bg-white rounded-lg border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300"
          />
          <input
            type="time"
            value={loc.time}
            onChange={(e) => handleLocationChange(index, 'time', e.target.value)}
            className="w-full px-3 py-2 bg-white rounded-lg border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300"
          />
          <input
            type="text"
            value={loc.address}
            onChange={(e) => handleLocationChange(index, 'address', e.target.value)}
            onDoubleClick={() => {
              const src = buildEmbedSrc({
                lat: loc.lat,
                lng: loc.lng,
                placeId: loc.placeId,
                address: loc.address,
              });
              const link = buildMapsLink({
                lat: loc.lat,
                lng: loc.lng,
                placeId: loc.placeId,
                address: loc.address,
              });
              if (link) setMapPreview({ open: true, src, link });
            }}
            placeholder="Buscar lugar o dirección"
            className="w-full px-3 py-2 bg-white rounded-lg border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300"
          />

          {predictions[index]?.length > 0 && (
            <ul className="absolute left-0 right-0 bg-white text-slate-900 border border-slate-200 rounded-xl mt-1 w-full z-20 max-h-56 overflow-y-auto shadow-lg">
              {predictions[index].map((p, i) => (
                <li
                  key={`${p.placeId || p.place_id || p.id}-${i}`}
                  className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm text-slate-900"
                  onClick={() => handleSelectPrediction(index, p)}
                >
                  {(p.mainText || p.structured_formatting?.main_text || p.description || '').toString()}{' '}
                  {(p.secondaryText || p.structured_formatting?.secondary_text) && (
                    <span className="opacity-70">
                      – {p.secondaryText || p.structured_formatting?.secondary_text}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}

      <Button onClick={addLocation} variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50">
        Añadir otra ubicación
      </Button>

      {/* Mapa (iframe) */}
      <Dialog open={mapPreview.open} onOpenChange={(o) => setMapPreview((p) => ({ ...p, open: o }))}>
        <DialogContent className="sm:max-w-[900px]" aria-describedby="map-desc">
          <DialogHeader>
            <DialogTitle>Ubicación en el mapa</DialogTitle>
            <DialogDescription id="map-desc">Vista previa del mapa con la ubicación seleccionada.</DialogDescription>
          </DialogHeader>
          <div className="w-full aspect-video rounded-lg overflow-hidden border">
            <iframe
              title="map-preview"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              src={mapPreview.src}
            />
          </div>
          <DialogFooter>
            <a href={mapPreview.link} target="_blank" rel="noreferrer" className="text-sm underline text-slate-700">
              Abrir en Google Maps
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const StepLocations = ({ formData, setFormData }) => {
  return <LocationForm locations={formData.locations} setFormData={setFormData} />;
};

export default StepLocations;
