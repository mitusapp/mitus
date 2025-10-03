// src/pages/GuestBook.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Video as VideoIcon, Send, Heart, User, Calendar, Mic, Square, RefreshCw, Upload as UploadIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const VIDEO_CATEGORY = 'Saludos';
const DEFAULT_TITLE_PREFIX = 'Saludo de';

const pickSupportedMime = () => {
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4;codecs=h264',
    'video/mp4',
  ];
  for (const t of candidates) {
    try { if (window.MediaRecorder && MediaRecorder.isTypeSupported(t)) return t; } catch {}
  }
  return '';
};

const GuestBook = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [guestName, setGuestName] = useState('');
  const [activeTab, setActiveTab] = useState('text');
  const [textMessage, setTextMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // --- Video recording state ---
  const [recSupportedType, setRecSupportedType] = useState('');
  const [recording, setRecording] = useState(false);
  const [stream, setStream] = useState(null);
  const [recorder, setRecorder] = useState(null);
  const chunksRef = useRef([]);
  const [previewUrl, setPreviewUrl] = useState('');
  const [videoBlob, setVideoBlob] = useState(null); // Blob cuando grabamos con MediaRecorder o archivo nativo
  const fileInputRef = useRef(null); // fallback para captura nativa (móvil)
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef(null);

  const fetchGuestbookData = useCallback(async () => {
    setLoading(true);
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('id, title, settings')
      .eq('id', eventId)
      .single();

    if (eventError || !eventData) {
      toast({ title: 'Evento no encontrado', description: 'El evento que buscas no existe.', variant: 'destructive' });
      navigate('/');
      return;
    }
    setEvent(eventData);

    const { data: messagesData, error: messagesError } = await supabase
      .from('guestbook_messages')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
    } else {
      setMessages(messagesData || []);
    }
    setLoading(false);
  }, [eventId, navigate]);

  useEffect(() => {
    const storedGuestName = sessionStorage.getItem('guestName') || localStorage.getItem(`mitus_guest_name_${eventId}`);
    if (!storedGuestName) { navigate(`/event/${eventId}`); return; }
    setGuestName(storedGuestName);
    fetchGuestbookData();
    setRecSupportedType(pickSupportedMime());
  }, [eventId, navigate, fetchGuestbookData]);

  useEffect(() => {
    return () => {
      if (previewUrl) { try { URL.revokeObjectURL(previewUrl); } catch {} }
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [previewUrl, stream]);

  const handleSubmitMessage = async () => {
    if (!textMessage.trim()) {
      toast({ title: 'Mensaje vacío', description: 'Por favor escribe un mensaje antes de enviar', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const payload = { event_id: eventId, guest_name: guestName, type: 'text', content: textMessage.trim() };
      const { data, error } = await supabase.from('guestbook_messages').insert(payload).select().single();
      if (error) throw error;
      setMessages(prev => [data, ...prev]);
      setTextMessage('');
      toast({ title: '¡Mensaje enviado!', description: 'Tu mensaje se ha agregado al libro de visitas' });
    } catch (error) {
      toast({ title: 'Error al enviar mensaje', description: error.message || 'Hubo un problema. Inténtalo de nuevo.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // --- Recording controls ---
  const startRecording = async () => {
    if (recording) return;
    if (event?.settings?.allowVideoUpload === false) {
      toast({ title: 'Grabación deshabilitada', description: 'Este evento no permite subir video.', variant: 'destructive' });
      return;
    }
    try {
      if (previewUrl) { try { URL.revokeObjectURL(previewUrl); } catch {} }
      setVideoBlob(null);
      setSeconds(0);
      const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true });
      setStream(media);
      const recType = pickSupportedMime();
      const rec = new MediaRecorder(media, recType ? { mimeType: recType } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'video/webm' });
        const url = URL.createObjectURL(blob);
        setVideoBlob(blob);
        setPreviewUrl(url);
        media.getTracks().forEach(t => t.stop());
        setStream(null);
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        setRecording(false);
      };
      rec.start();
      setRecorder(rec);
      setRecording(true);
      // contador simple
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } catch (err) {
      console.error('getUserMedia error', err);
      toast({ title: 'No se pudo acceder a la cámara/micrófono', description: 'Activa los permisos o usa la captura nativa del teléfono.', variant: 'destructive' });
    }
  };

  const stopRecording = () => { if (recorder && recording) { try { recorder.stop(); } catch {} } };

  const discardRecording = () => {
    if (previewUrl) { try { URL.revokeObjectURL(previewUrl); } catch {} }
    setPreviewUrl('');
    setVideoBlob(null);
    setSeconds(0);
  };

  const openNativeCapture = () => { if (fileInputRef.current) fileInputRef.current.click(); };

  const onNativeFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    discardRecording();
    setVideoBlob(f);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
  };

  const uploadVideo = async () => {
    if (!videoBlob) { toast({ title: 'Nada para subir', description: 'Graba un video o elige uno primero.' }); return; }
    setUploadingVideo(true);
    try {
      const now = new Date();
      const stamp = now.toISOString().replace(/[-:TZ.]/g, '');
      const rand = Math.random().toString(36).slice(2, 8);
      const baseName = `${DEFAULT_TITLE_PREFIX} ${guestName || 'Invitado'}`.trim().replace(/ +/g, '-');
      const ext = (videoBlob.type.includes('mp4') ? 'mp4' : 'webm');
      const safeName = `${baseName}.${ext}`.toLowerCase().replace(/[^a-z0-9._-]/g, '_');
      const filePath = `${eventId}/saludos/${stamp}_${rand}_${safeName}`;

      const { error: uploadErr } = await supabase.storage
        .from('event-media')
        .upload(filePath, videoBlob, { contentType: videoBlob.type || (ext === 'mp4' ? 'video/mp4' : 'video/webm'), cacheControl: '3600', upsert: false });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('event-media').getPublicUrl(filePath);

      // Insertar en uploads para que aparezca en la galería
      const row = {
        event_id: eventId,
        guest_name: guestName || null,
        file_name: safeName,
        file_size: videoBlob.size,
        file_type: videoBlob.type || (ext === 'mp4' ? 'video/mp4' : 'video/webm'),
        file_url: urlData.publicUrl,    // ORIGINAL (para videos)
        web_url: urlData.publicUrl,     // usamos el mismo para videos
        title: `${DEFAULT_TITLE_PREFIX} ${guestName || ''}`.trim(),
        description: '',
        type: 'video',
        category: VIDEO_CATEGORY,
        approved: !(event?.settings?.requireModeration ?? false),
        uploaded_at: new Date().toISOString(),
      };

      const { error: dbError } = await supabase.from('uploads').insert([row]);
      if (dbError) throw dbError;

      // También crear una entrada en guestbook_messages con link al video
      const messagePayload = {
        event_id: eventId,
        guest_name: guestName || null,
        type: 'video',
        content: urlData.publicUrl,
      };
      const { data: msgData, error: msgError } = await supabase
        .from('guestbook_messages')
        .insert(messagePayload)
        .select()
        .single();
      if (msgError) throw msgError;
      setMessages(prev => [msgData, ...prev]);

      toast({ title: '¡Video enviado!', description: 'Tu saludo aparecerá en la galería y en el libro de visitas.' });
      // Reset estados
      discardRecording();
    } catch (err) {
      console.error('Upload video error', err);
      toast({ title: 'Error al subir el video', description: err.message || 'Inténtalo nuevamente.', variant: 'destructive' });
    } finally {
      setUploadingVideo(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400 mx-auto mb-4"></div>
          <p>Cargando libro de visitas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-6 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          {/* Header */}
          <div className="flex items-center mb-8">
            <Button variant="ghost" onClick={() => navigate(`/event/${eventId}`)} className="text-gray-700 hover:bg-gray-200/60 mr-4">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Libro de Visitas</h1>
              <p className="text-gray-600">Deja un mensaje especial para {event?.title}</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Columna izquierda: enviar mensaje / video */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <Heart className="w-5 h-5 mr-2 text-gray-500" />
                Deja tu mensaje, {guestName}
              </h2>

              {/* Tabs */}
              <div className="flex bg-gray-100 rounded-xl p-1 mb-6 border border-gray-200">
                <button
                  onClick={() => setActiveTab('text')}
                  className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-300 flex items-center justify-center ${
                    activeTab === 'text' ? 'bg-white border border-gray-300 text-gray-900' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Mensaje de Texto
                </button>
                <button
                  onClick={() => setActiveTab('video')}
                  className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-300 flex items-center justify-center ${
                    activeTab === 'video' ? 'bg-white border border-gray-300 text-gray-900' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <VideoIcon className="w-4 h-4 mr-2" />
                  Video Mensaje
                </button>
              </div>

              {activeTab === 'text' && (
                <div className="space-y-4">
                  <textarea
                    value={textMessage}
                    onChange={(e) => setTextMessage(e.target.value)}
                    placeholder="Escribe un mensaje hermoso para los anfitriones..."
                    rows={6}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent resize-none"
                  />

                  <Button
                    onClick={handleSubmitMessage}
                    disabled={!textMessage.trim() || submitting}
                    className="w-full bg-gradient-to-r from-gray-700 to-gray-500 hover:from-gray-800 hover:to-gray-600 text-white py-3 rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Enviar Mensaje
                      </>
                    )}
                  </Button>
                </div>
              )}

              {activeTab === 'video' && (
                <div className="space-y-4">
                  {/* Vista previa o stream */}
                  <div className="aspect-video w-full bg-gray-100 border border-gray-200 rounded-xl overflow-hidden flex items-center justify-center">
                    {/* Cuando estamos grabando, mostramos el stream en vivo */}
                    {recording && stream ? (
                      <video
                        className="w-full h-full object-cover"
                        ref={(el) => { if (el && stream) { try { el.srcObject = stream; el.muted = true; el.playsInline = true; el.play().catch(() => {}); } catch {} } }}
                        autoPlay
                      />
                    ) : previewUrl ? (
                      <video src={previewUrl} controls className="w-full h-full object-contain bg-black" />
                    ) : (
                      <div className="text-center text-gray-500">
                        <VideoIcon className="w-12 h-12 mx-auto mb-2" />
                        <p>Tu video aparecerá aquí</p>
                      </div>
                    )}
                  </div>

                  {/* Controles de grabación */}
                  <div className="flex flex-wrap gap-2">
                    {!recording && !previewUrl && (
                      <Button onClick={startRecording} className="bg-gray-900 hover:bg:black text-white">
                        <Mic className="w-4 h-4 mr-2" /> Iniciar grabación
                      </Button>
                    )}
                    {recording && (
                      <Button onClick={stopRecording} variant="destructive" className="bg-red-600 hover:bg-red-700 text-white">
                        <Square className="w-4 h-4 mr-2" /> Detener
                      </Button>
                    )}
                    {!recording && previewUrl && (
                      <Button onClick={discardRecording} variant="outline" className="border-gray-300">
                        <RefreshCw className="w-4 h-4 mr-2" /> Regrabar
                      </Button>
                    )}

                    {/* Captura nativa en móviles (fallback) */}
                    {!recording && (
                      <Button onClick={openNativeCapture} variant="outline" className="border-gray-300">
                        <UploadIcon className="w-4 h-4 mr-2" /> Usar cámara del teléfono
                      </Button>
                    )}

                    {/* Timer simple */}
                    {recording && (
                      <span className="inline-flex items-center px-3 py-2 text-sm rounded-lg bg-gray-100 border border-gray-200 text-gray-800">
                        {String(Math.floor(seconds / 60)).padStart(2, '0')}
                        :
                        {String(seconds % 60).padStart(2, '0')}
                      </span>
                    )}
                  </div>

                  <div className="pt-2">
                    <Button
                      onClick={uploadVideo}
                      disabled={!videoBlob || uploadingVideo}
                      className="w-full bg-gradient-to-r from-gray-700 to-gray-500 hover:from-gray-800 hover:to-gray-600 text-white py-3 rounded-xl shadow-md disabled:opacity-50"
                    >
                      {uploadingVideo ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Subiendo...
                        </>
                      ) : (
                        <>
                          <VideoIcon className="w-4 h-4 mr-2" />
                          Enviar Video Mensaje a la Galería
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-gray-500 mt-2">Se guardará en la categoría <span className="font-medium">{VIDEO_CATEGORY}</span> con el título “{DEFAULT_TITLE_PREFIX} {guestName || 'Invitado'}”.</p>
                  </div>

                  {/* input para captura nativa */}
                  <input ref={fileInputRef} type="file" accept="video/*" capture="user" hidden onChange={onNativeFile} />
                </div>
              )}
            </div>

            {/* Columna derecha: mensajes existentes */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <MessageSquare className="w-5 h-5 mr-2 text-gray-500" />
                Mensajes de los Invitados ({messages.length})
              </h2>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="text-center py-8 text-gray-600">
                    <Heart className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p>Aún no hay mensajes. ¡Sé el primero en dejar uno!</p>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center text-sm text-gray-700">
                          <User className="w-4 h-4 mr-2" />
                          <span className="font-medium text-gray-900">{message.guest_name}</span>
                        </div>
                        <div className="flex items-center text-xs text-gray-500">
                          <Calendar className="w-3 h-3 mr-1" />
                          <span>{new Date(message.created_at).toLocaleDateString('es-ES')}</span>
                        </div>
                      </div>

                      {message.type === 'video' ? (
                        <a href={message.content} target="_blank" rel="noreferrer" className="text-gray-700 underline break-all">
                          Ver video mensaje
                        </a>
                      ) : (
                        <p className="text-gray-800 leading-relaxed">{message.content}</p>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default GuestBook;
