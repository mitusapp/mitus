import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Users, CheckCircle, Table, QrCode, Home, Image, MapPin,
  Sparkles, User, Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const HomePage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // ✅ Si ya hay sesión, enviamos directo al dashboard
  useEffect(() => {
    if (!loading && user) {
      navigate('/profile', { replace: true });
    }
  }, [loading, user, navigate]);

  // Pequeño fallback visual mientras redirige
  if (!loading && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBF8F7]">
        <LoadingSpinner />
      </div>
    );
  }

  const features = [
    {
      icon: <Calendar className="w-8 h-8" />,
      title: "Crea tu evento",
      description: "Define fecha, lugar, portada y detalles en minutos."
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Invitados organizados",
      description: "Administra lista, segmentos y notas en un solo lugar."
    },
    {
      icon: <CheckCircle className="w-8 h-8" />,
      title: "RSVP en tiempo real",
      description: "Recibe confirmaciones y seguimiento instantáneo."
    },
    {
      icon: <Table className="w-8 h-8" />,
      title: "Mesas y asientos",
      description: "Asigna lugares y visualiza el plano fácilmente."
    },
    {
      icon: <QrCode className="w-8 h-8" />,
      title: "QR del evento",
      description: "Genera y descarga códigos para acceso, galería y acciones clave."
    },
    {
      icon: <Home className="w-8 h-8" />,
      title: "Landing del evento",
      description: "Información central en un enlace listo para compartir."
    },
    {
      icon: <Image className="w-8 h-8" />,
      title: "Álbum digital con QR",
      description: "Tus invitados suben fotos y videos escaneando un código."
    },
    {
      icon: <MapPin className="w-8 h-8" />,
      title: "Encuentra tu mesa",
      description: "Escanea el QR y ubica tu asiento al instante."
    }
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FBF8F7]">
      <header className="absolute top-0 left-0 right-0 p-4 z-20">
        <div className="max-w-7xl mx-auto flex justify-end">
          {loading ? (
            <div className="h-10 w-24 bg-white/20 rounded-xl animate-pulse"></div>
          ) : user ? (
            <Button
              onClick={() => navigate('/profile')}
              variant="outline"
              className="border-white/70 text-white hover:bg-white/20 backdrop-blur-sm"
            >
              <User className="w-4 h-4 mr-2" />
              Mi Perfil
            </Button>
          ) : (
            <Button
              onClick={() => navigate('/login')}
              variant="outline"
              className="border-white/70 text-white hover:bg-white/20 backdrop-blur-sm"
            >
              Iniciar Sesión
            </Button>
          )}
        </div>
      </header>

      <section className="relative min-h-screen flex items-center justify-center">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-white/20"></div>
          <img
            className="w-full h-full object-cover"
            alt="Decoración elegante de un evento con flores y luces"
            src="https://images.unsplash.com/photo-1586245021641-a6ef44a4a1ff?q=80&w=2070" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="flex justify-center mb-8">
              <motion.div
                animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="relative bg-white/90 backdrop-blur-sm rounded-full p-6 border border-[#E6E3E0]"
              >
                <Heart className="w-16 h-16 text-[#E8A4B8]" />
              </motion.div>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 drop-shadow-lg">
              Mitus
            </h1>

            <p className="text-xl md:text-2xl text-white mb-8 max-w-3xl mx-auto leading-relaxed drop-shadow">
              Una plataforma exclusiva para planificar tus eventos y crear experiencias memorables.
              <span className="text-[#B9A7F9] font-semibold"> Gestión de invitados, invitaciones digitales, álbumes de fotos y mucho más</span> en un solo lugar.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                onClick={() => navigate('/wizard')}
                className="bg-gradient-to-r from-[#B9A7F9] to-[#E8A4B8] hover:from-[#A793F2] hover:to-[#D48FA6] text-white px-8 py-4 text-lg rounded-xl shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Crear Evento
              </Button>

              <Button
                variant="outline"
                className="border-white/70 text-white hover:bg-white/20 px-8 py-4 text-lg rounded-xl backdrop-blur-sm"
                onClick={() => {
                  const eventId = prompt('Ingresa el código de tu evento:');
                  if (eventId) navigate(`/invitation/${eventId}`);
                }}
              >
                Ver Evento
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-20 bg-[#FFFFFF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-[#2D2D2D] mb-6">
              Una experiencia inolvidable
            </h2>
            <p className="text-xl text-[#5E5E5E] max-w-2xl mx-auto">
              Desde la invitación hasta los recuerdos, todo en una plataforma elegante y fácil de usar.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white rounded-2xl p-6 border border-[#E6E3E0] hover:border-[#B9A7F9] hover:shadow-[0_0_15px_rgba(185,167,249,0.3)] hover:-translate-y-2 transition-all duration-300 group"
              >
                <div className="text-[#B9A7F9] mb-4 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-[#2D2D2D] mb-3">
                  {feature.title}
                </h3>
                <p className="text-[#5E5E5E] leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-[#FBF8F7]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-[#2D2D2D] mb-6">
              ¿Listo para crear tu próximo evento?
            </h2>
            <p className="text-xl text-[#5E5E5E] mb-8">
              Configura tu invitación y tu álbum de recuerdos en minutos.
            </p>
            <Button
              onClick={() => navigate('/wizard')}
              className="bg-gradient-to-r from-[#E8A4B8] to-[#B9A7F9] hover:from-[#D48FA6] hover:to-[#A793F2] text-white px-10 py-4 text-xl rounded-xl shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              Empezar Ahora
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
