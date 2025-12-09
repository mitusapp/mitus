// src/components/invitation/InviteFormModal.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Plus, Eye } from 'lucide-react';

// Estilos base de campos (evita texto “invisible” y mejora foco)
const CONTROL =
    "w-full rounded-md bg-white text-[#1E1E1E] placeholder:text-slate-400 " +
    "border border-[#E6E3E0] p-2 " +
    "focus:outline-none focus:ring-2 focus:ring-[#B9A7F9]/40 focus:border-[#B9A7F9]";

const TEXTAREA = CONTROL + " min-h-24";
const CHECK = "h-4 w-4 accent-[#6B5CC8]";


function toBase64Url(obj) {
    try {
        const json = JSON.stringify(obj);
        const bytes = new TextEncoder().encode(json);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } catch {
        return '';
    }
}

const emptyLocation = () => ({ type: 'ceremony', title: '', time: '', address: '', lat: null, lng: null, place_id: '' });
const emptyHotel = () => ({ name: '', address: '', phone: '', url: '' });
const emptyTransport = () => ({ type: '', details: '', phone: '', url: '' });
const emptyRegistryItem = () => ({ label: '', url: '' });

const TabButton = ({ active, onClick, children }) => (
    <button
        type="button"
        onClick={onClick}
        className={`px-3 py-1.5 rounded-md text-sm border outline-none
   ${active
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 focus:ring-2 focus:ring-[#B9A7F9]/40'}`}
    >
        {children}
    </button>
);

const Row = ({ children, cols = 2 }) => (
    <div className={`grid gap-3 ${cols === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>{children}</div>
);

const Field = ({ label, children, hint }) => (
    <div className="space-y-1.5">
        {label && <Label className="text-sm text-[#2D2D2D]">{label}</Label>}
        {children}
        {hint && <p className="text-xs text-[#5E5E5E]">{hint}</p>}
    </div>
);

export default function InviteFormModal({ open, onOpenChange, event, eventId, onSaved }) {
    const [tab, setTab] = useState('basicos');
    const [saving, setSaving] = useState(false);

    const base = React.useMemo(() => {
        const v = event?.invitation_details;
        let parsed = v;
        if (typeof v === 'string') {
            try { parsed = JSON.parse(v); } catch { parsed = {}; }
        }
        return parsed || {};
    }, [event]);

    const [form, setForm] = useState({
        hosts: [],
        welcome_message: '',
        invitation_text: '',
        countdown: true,
        event_time: '',
        date_block: { show: true, city: event?.event_city || '', style: 'classic' },
        locations: [emptyLocation()],
        dress_code: { men: '', women: '', notes: '' },
        gift_info: { message: '', registry: [] },
        calendar: { enabled: true, endTime: '', timezone: event?.event_timezone || 'America/Bogota' },
        policy: { rsvp_deadline: '', plus_one: '', children: '', parking: '', photos: '', hashtag: '' },
        travel: { hotels: [], transport: [] },
        hero: { heading_mode: 'names', tagline: '', cta: { label: '', href: '' } },
        template: 'template1',
    });

    useEffect(() => {
        const merged = {
            ...form,
            ...base,
            date_block: { show: true, city: event?.event_city || base?.date_block?.city || '', style: base?.date_block?.style || 'classic' },
            calendar: { enabled: true, endTime: base?.calendar?.endTime || '', timezone: event?.event_timezone || base?.calendar?.timezone || 'America/Bogota' },
            locations: Array.isArray(base?.locations) && base.locations.length ? base.locations : [emptyLocation()],
            hosts: Array.isArray(base?.hosts) ? base.hosts : (base?.hosts ? [String(base.hosts)] : []),
            gift_info: base?.gift_info || { message: '', registry: [] },
            travel: base?.travel || { hotels: [], transport: [] },
            dress_code: base?.dress_code || { men: '', women: '', notes: '' },
            hero: base?.hero || { heading_mode: 'names', tagline: '', cta: { label: '', href: '' } },
            template: base?.template || 'template1',
        };
        setForm(merged);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const previewHref = useMemo(() => {
        if (!eventId) return '';
        return `${window.location.origin}/invitation/${eventId}?d=${toBase64Url({ invitation_details: form })}`;
    }, [eventId, form]);

    const up = (path, value) => {
        setForm(prev => {
            const next = structuredClone(prev);
            const segs = path.split('.');
            let cur = next;
            for (let i = 0; i < segs.length - 1; i++) {
                const k = segs[i];
                if (cur[k] == null) cur[k] = {};
                cur = cur[k];
            }
            cur[segs[segs.length - 1]] = value;
            return next;
        });
    };

    const addItem = (path, factory) => {
        setForm(prev => {
            const next = structuredClone(prev);
            const arr = path.split('.').reduce((acc, k) => acc[k], next);
            arr.push(factory());
            return next;
        });
    };

    const removeItem = (path, index) => {
        setForm(prev => {
            const next = structuredClone(prev);
            const arr = path.split('.').reduce((acc, k) => acc[k], next);
            arr.splice(index, 1);
            return next;
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (!form?.hosts?.length) throw new Error('Falta el/los anfitriones.');
            if (!form?.event_time) throw new Error('Falta la hora del evento.');
            const payload = {
                invitation_details: form,
                event_city: form?.date_block?.city || event?.event_city || null,
                event_timezone: form?.calendar?.timezone || event?.event_timezone || null,
            };
            const { error } = await supabase.from('events').update(payload).eq('id', eventId);
            if (error) throw error;
            toast({ title: 'Invitación guardada' });
            onOpenChange(false);
            if (onSaved) onSaved();
        } catch (e) {
            console.error(e);
            toast({ title: 'No se pudo guardar', description: e.message, variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    if (!open) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[980px] w-[92vw] bg-white max-h-[90vh] md:max-h-[90svh] p-0 flex flex-col">
                <DialogHeader className="px-6 pt-6">
                    <DialogTitle>Configurar invitación</DialogTitle>
                    <DialogDescription>Edita todos los campos de la invitación y previsualiza los cambios.</DialogDescription>
                </DialogHeader>

                {/* Tabs */}
                <div className="flex flex-wrap gap-2 my-1 px-6">
                    {[
                        ['basicos', 'Básicos'],
                        ['ubicaciones', 'Ubicaciones'],
                        ['vestuario', 'Vestuario'],
                        ['regalos', 'Regalos'],
                        ['politicas', 'Políticas'],
                        ['viajes', 'Viajes'],
                        ['apariencia', 'Apariencia'],
                        ['preview', 'Vista previa'],
                    ].map(([key, label]) => (
                        <TabButton key={key} active={tab === key} onClick={() => setTab(key)}>{label}</TabButton>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto px-6 pb-6 mt-3">
                    {tab === 'basicos' && (
                        <div className="grid gap-4">
                            <Row>
                                <Field label="Anfitriones (separar con “y” o “&”)" hint="Ej.: Laura y Cristian">
                                    <input
                                        className={CONTROL}
                                        value={form.hosts.join(' y ')}
                                        onChange={(e) => {
                                            const arr = e.target.value.split(/\s+y\s+|&/i).map(s => s.trim()).filter(Boolean);
                                            up('hosts', arr);
                                        }}
                                    />
                                </Field>
                                <Field label="Ciudad del evento">
                                    <input className={CONTROL} value={form.date_block.city} onChange={(e) => up('date_block.city', e.target.value)} />
                                </Field>
                            </Row>

                            <Row>
                                <Field label="Hora del evento">
                                    <input type="time" className={`${CONTROL} appearance-none`} value={form.event_time} onChange={(e) => up('event_time', e.target.value)} />
                                </Field>
                                <Field label="Zona horaria">
                                    <select className={CONTROL} value={form.calendar.timezone} onChange={(e) => up('calendar.timezone', e.target.value)}>
                                        {['America/Bogota', 'America/Mexico_City', 'America/Guatemala', 'America/Lima', 'America/Santiago', 'America/Argentina/Buenos_Aires', 'Europe/Madrid', 'UTC'].map(tz => (
                                            <option key={tz} value={tz}>{tz}</option>
                                        ))}
                                    </select>
                                </Field>
                            </Row>

                            <Row cols={1}>
                                <Field label="Mensaje de bienvenida">
                                    <textarea className={TEXTAREA} value={form.welcome_message} onChange={(e) => up('welcome_message', e.target.value)} />
                                </Field>
                            </Row>

                            <Row cols={1}>
                                <Field label="Texto de invitación">
                                    <textarea className={TEXTAREA} value={form.invitation_text} onChange={(e) => up('invitation_text', e.target.value)} />
                                </Field>
                            </Row>

                            <Row>
                                <Field label="Mostrar conteo regresivo (countdown)">
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" className={CHECK} checked={!!form.countdown} onChange={(e) => up('countdown', e.target.checked)} />
                                        <span className="text-sm text-[#5E5E5E]">Activar</span>
                                    </div>
                                </Field>
                                <Field label="Bloque de fecha visible">
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" className={CHECK} checked={!!form.date_block.show} onChange={(e) => up('date_block.show', e.target.checked)} />
                                        <span className="text-sm text-[#5E5E5E]">Mostrar</span>
                                    </div>
                                </Field>
                            </Row>
                        </div>
                    )}

                    {tab === 'ubicaciones' && (
                        <div className="grid gap-4">
                            {form.locations.map((loc, idx) => (
                                <div key={idx} className="rounded-xl border border-[#E6E3E0] p-3 bg-[#F9F8F7]">
                                    <div className="flex items-center justify-between">
                                        <div className="font-medium text-sm text-[#2D2D2D]">Lugar #{idx + 1}</div>
                                        <button
                                            type="button"
                                            onClick={() => removeItem('locations', idx)}
                                            className="text-xs text-red-600 hover:underline disabled:opacity-50"
                                            disabled={form.locations.length === 1}
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                    <div className="grid md:grid-cols-4 gap-2 mt-2">
                                        <select className={CONTROL} value={loc.type} onChange={(e) => {
                                            const v = e.target.value; setForm(prev => {
                                                const next = structuredClone(prev); next.locations[idx].type = v; return next;
                                            });
                                        }}>
                                            <option value="ceremony">Ceremonia</option>
                                            <option value="reception">Recepción</option>
                                            <option value="party">Fiesta</option>
                                            <option value="other">Otro</option>
                                        </select>
                                        <input className={CONTROL} placeholder="Título" value={loc.title} onChange={(e) => {
                                            const v = e.target.value; setForm(prev => { const next = structuredClone(prev); next.locations[idx].title = v; return next; });
                                        }} />
                                        <input type="time" className={CONTROL} value={loc.time || ''} onChange={(e) => {
                                            const v = e.target.value; setForm(prev => { const next = structuredClone(prev); next.locations[idx].time = v; return next; });
                                        }} />
                                        <input className={`${CONTROL} col-span-1 md:col-span-4`} placeholder="Dirección" value={loc.address} onChange={(e) => {
                                            const v = e.target.value; setForm(prev => { const next = structuredClone(prev); next.locations[idx].address = v; return next; });
                                        }} />
                                    </div>
                                </div>
                            ))}
                            <Button type="button" onClick={() => addItem('locations', emptyLocation)} className="w-full">
                                <Plus className="w-4 h-4 mr-2" /> Añadir ubicación
                            </Button>
                        </div>
                    )}

                    {tab === 'vestuario' && (
                        <div className="grid gap-4">
                            <Row>
                                <Field label="Etiqueta (Hombres)"><input className={CONTROL} value={form.dress_code.men} onChange={(e) => up('dress_code.men', e.target.value)} /></Field>
                                <Field label="Etiqueta (Damas)"><input className={CONTROL} value={form.dress_code.women} onChange={(e) => up('dress_code.women', e.target.value)} /></Field>
                            </Row>
                            <Row cols={1}>
                                <Field label="Notas de vestuario"><input className={CONTROL} value={form.dress_code.notes} onChange={(e) => up('dress_code.notes', e.target.value)} /></Field>
                            </Row>
                        </div>
                    )}

                    {tab === 'regalos' && (
                        <div className="grid gap-4">
                            <Row cols={1}>
                                <Field label="Mensaje sobre regalos / lluvia de sobres">
                                    <textarea className={`${TEXTAREA} min-h-[72px]`} value={form.gift_info.message} onChange={(e) => up('gift_info.message', e.target.value)} />
                                </Field>
                            </Row>

                            <div className="space-y-2">
                                <div className="text-sm font-medium text-[#2D2D2D]">Registro de regalos (opcional)</div>
                                {form.gift_info.registry?.map((it, idx) => (
                                    <div key={idx} className="grid md:grid-cols-2 gap-2 items-start">
                                        <input className={CONTROL} placeholder="Etiqueta (ej. Amazon, Falabella)" value={it.label} onChange={(e) => {
                                            const v = e.target.value; setForm(prev => { const next = structuredClone(prev); next.gift_info.registry[idx].label = v; return next; });
                                        }} />
                                        <div className="flex gap-2">
                                            <input className={`${CONTROL} flex-1`} placeholder="URL" value={it.url} onChange={(e) => {
                                                const v = e.target.value; setForm(prev => { const next = structuredClone(prev); next.gift_info.registry[idx].url = v; return next; });
                                            }} />
                                            <button type="button" className="text-xs text-red-600 border border-red-200 rounded px-2 py-1" onClick={() => {
                                                setForm(prev => { const next = structuredClone(prev); next.gift_info.registry.splice(idx, 1); return next; });
                                            }}>Quitar</button>
                                        </div>
                                    </div>
                                ))}
                                <Button type="button" variant="outline" onClick={() => {
                                    setForm(prev => { const next = structuredClone(prev); if (!next.gift_info.registry) next.gift_info.registry = []; next.gift_info.registry.push(emptyRegistryItem()); return next; });
                                }}>
                                    <Plus className="w-4 h-4 mr-2" /> Añadir enlace de registro
                                </Button>
                            </div>
                        </div>
                    )}

                    {tab === 'politicas' && (
                        <div className="grid gap-4">
                            <Row>
                                <Field label="Fecha límite para confirmar (texto)">
                                    <input className={CONTROL} value={form.policy.rsvp_deadline} onChange={(e) => up('policy.rsvp_deadline', e.target.value)} />
                                </Field>
                                <Field label="Invitado adicional (plus one)">
                                    <input className={CONTROL} value={form.policy.plus_one} onChange={(e) => up('policy.plus_one', e.target.value)} />
                                </Field>
                            </Row>
                            <Row>
                                <Field label="Niños">
                                    <input className={CONTROL} value={form.policy.children} onChange={(e) => up('policy.children', e.target.value)} />
                                </Field>
                                <Field label="Parqueadero / Transporte">
                                    <input className={CONTROL} value={form.policy.parking} onChange={(e) => up('policy.parking', e.target.value)} />
                                </Field>
                            </Row>
                            <Row>
                                <Field label="Fotos (restricciones / hashtag)">
                                    <input className={CONTROL} value={form.policy.photos} onChange={(e) => up('policy.photos', e.target.value)} />
                                </Field>
                                <Field label="Hashtag">
                                    <input className={CONTROL} value={form.policy.hashtag} onChange={(e) => up('policy.hashtag', e.target.value)} />
                                </Field>
                            </Row>
                        </div>
                    )}

                    {tab === 'viajes' && (
                        <div className="grid gap-6">
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <div className="text-sm font-medium text-[#2D2D2D]">Hoteles recomendados</div>
                                    <Button type="button" variant="outline" onClick={() => {
                                        setForm(prev => { const next = structuredClone(prev); next.travel.hotels.push(emptyHotel()); return next; });
                                    }}><Plus className="w-4 h-4 mr-2" /> Añadir hotel</Button>
                                </div>
                                {form.travel.hotels?.length ? (
                                    <div className="space-y-2">
                                        {form.travel.hotels.map((h, idx) => (
                                            <div key={idx} className="grid md:grid-cols-4 gap-2 bg-[#F9F8F7] border border-[#E6E3E0] p-2 rounded-lg">
                                                <input className={CONTROL} placeholder="Nombre" value={h.name} onChange={(e) => {
                                                    const v = e.target.value; setForm(prev => { const next = structuredClone(prev); next.travel.hotels[idx].name = v; return next; });
                                                }} />
                                                <input className={CONTROL} placeholder="Dirección" value={h.address} onChange={(e) => {
                                                    const v = e.target.value; setForm(prev => { const next = structuredClone(prev); next.travel.hotels[idx].address = v; return next; });
                                                }} />
                                                <input className={CONTROL} placeholder="Teléfono" value={h.phone} onChange={(e) => {
                                                    const v = e.target.value; setForm(prev => { const next = structuredClone(prev); next.travel.hotels[idx].phone = v; return next; });
                                                }} />
                                                <div className="flex gap-2">
                                                    <input className={`${CONTROL} flex-1`} placeholder="URL" value={h.url} onChange={(e) => {
                                                        const v = e.target.value; setForm(prev => { const next = structuredClone(prev); next.travel.hotels[idx].url = v; return next; });
                                                    }} />
                                                    <button type="button" className="text-xs text-red-600 border border-red-200 rounded px-2 py-1" onClick={() => {
                                                        setForm(prev => { const next = structuredClone(prev); next.travel.hotels.splice(idx, 1); return next; });
                                                    }}>Quitar</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : <p className="text-sm text-[#5E5E5E]">No hay hoteles agregados.</p>}
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <div className="text-sm font-medium text-[#2D2D2D]">Transporte recomendado</div>
                                    <Button type="button" variant="outline" onClick={() => {
                                        setForm(prev => { const next = structuredClone(prev); next.travel.transport.push(emptyTransport()); return next; });
                                    }}><Plus className="w-4 h-4 mr-2" /> Añadir transporte</Button>
                                </div>
                                {form.travel.transport?.length ? (
                                    <div className="space-y-2">
                                        {form.travel.transport.map((t, idx) => (
                                            <div key={idx} className="grid md:grid-cols-4 gap-2 bg-[#F9F8F7] border border-[#E6E3E0] p-2 rounded-lg">
                                                <input className={CONTROL} placeholder="Tipo (taxi, bus, shuttle)" value={t.type} onChange={(e) => {
                                                    const v = e.target.value; setForm(prev => { const next = structuredClone(prev); next.travel.transport[idx].type = v; return next; });
                                                }} />
                                                <input className={CONTROL} placeholder="Detalles" value={t.details} onChange={(e) => {
                                                    const v = e.target.value; setForm(prev => { const next = structuredClone(prev); next.travel.transport[idx].details = v; return next; });
                                                }} />
                                                <input className={CONTROL} placeholder="Teléfono" value={t.phone} onChange={(e) => {
                                                    const v = e.target.value; setForm(prev => { const next = structuredClone(prev); next.travel.transport[idx].phone = v; return next; });
                                                }} />
                                                <div className="flex gap-2">
                                                    <input className={`${CONTROL} flex-1`} placeholder="URL" value={t.url} onChange={(e) => {
                                                        const v = e.target.value; setForm(prev => { const next = structuredClone(prev); next.travel.transport[idx].url = v; return next; });
                                                    }} />
                                                    <button type="button" className="text-xs text-red-600 border border-red-200 rounded px-2 py-1" onClick={() => {
                                                        setForm(prev => { const next = structuredClone(prev); next.travel.transport.splice(idx, 1); return next; });
                                                    }}>Quitar</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : <p className="text-sm text-[#5E5E5E]">No hay transportes agregados.</p>}
                            </div>
                        </div>
                    )}

                    {tab === 'apariencia' && (
                        <div className="grid gap-4">
                            <Row>
                                <Field label="Modo de encabezado">
                                    <select className={CONTROL} value={form.hero.heading_mode} onChange={(e) => up('hero.heading_mode', e.target.value)}>
                                        <option value="names">Nombres completos</option>
                                        <option value="initials">Iniciales</option>
                                    </select>
                                </Field>
                                <Field label="Tagline (frase corta)">
                                    <input className={CONTROL} value={form.hero.tagline} onChange={(e) => up('hero.tagline', e.target.value)} />
                                </Field>
                            </Row>
                            <Row>
                                <Field label="CTA - Texto del botón">
                                    <input className={CONTROL} value={form.hero.cta.label} onChange={(e) => up('hero.cta.label', e.target.value)} />
                                </Field>
                                <Field label="CTA - URL (opcional)">
                                    <input className={CONTROL} value={form.hero.cta.href} onChange={(e) => up('hero.cta.href', e.target.value)} />
                                </Field>
                            </Row>
                            <Row>
                                <Field label="Plantilla (template key)">
                                    <input className={CONTROL} placeholder="template1 / classic / minimal / elegant / draft" value={form.template} onChange={(e) => up('template', e.target.value)} />
                                </Field>
                                <div />
                            </Row>
                        </div>
                    )}

                    {tab === 'preview' && (
                        <div className="border rounded-xl overflow-hidden h-[560px] bg-white">
                            <iframe title="Vista previa" className="w-full h-full border-0" src={previewHref} />
                        </div>
                    )}
                </div>

                <DialogFooter className="shrink-0 px-6 py-4 bg-white border-t">
                    <Button variant="outline" className="border-[#E6E3E0] text-[#E6E3E0]" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button asChild variant="outline" className="border-[#E6E3E0] text-[#E6E3E0]">
                        <a href={previewHref} target="_blank" rel="noreferrer">
                            <Eye className="w-4 h-4 mr-2" /> Abrir vista previa
                        </a>
                    </Button>
                    <Button onClick={handleSave} disabled={saving} className="bg-[#6B5CC8] hover:bg-[#5748b8] text-white">
                        {saving ? 'Guardando…' : 'Guardar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
