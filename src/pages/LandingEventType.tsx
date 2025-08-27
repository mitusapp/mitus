import { Link, useNavigate } from 'react-router-dom'

const CATS = [
  { id: 'wedding', name: 'Boda', desc: 'Ceremonia + recepción', emoji: '💍' },
  { id: 'birthday', name: 'Cumpleaños', desc: 'Fiesta y RSVP', emoji: '🎉' },
  { id: 'baptism', name: 'Bautizo', desc: 'Familia y amigos', emoji: '🕊️' },
  { id: 'fifteen', name: '15 Años', desc: 'Clásico o moderno', emoji: '👑' },
  { id: 'babyshower', name: 'Baby Shower', desc: 'Agenda y regalos', emoji: '🍼' },
  { id: 'other', name: 'Otro', desc: 'Personalizado', emoji: '✨' },
]

export default function LandingEventType() {
  const nav = useNavigate()
  const start = (cat: string) => nav('/wizard?type='+encodeURIComponent(cat))
  return (
    <div className="container py-16">
      <div className="grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h1 className="title mb-3">Invitaciones digitales Mitus</h1>
          <p className="text-gray-600 mb-6 max-w-prose">Crea una tarjeta de prueba gratis: personaliza textos e imagen, elige plantilla y previsualiza. Solo pagas cuando quieras publicar y compartir.</p>
          <div className="flex gap-3">
            <Link to="/wizard" className="btn btn-primary">Crear tarjeta de prueba</Link>
            <a className="btn btn-ghost" href="#categorias">Explorar categorías</a>
          </div>
        </div>
        <div className="card">
          <img className="rounded-xl" alt="Ejemplo de invitación" src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac" />
        </div>
      </div>

      <section id="categorias" className="mt-12">
        <h2 className="text-xl font-semibold mb-4">¿Qué vas a festejar?</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {CATS.map(c => (
            <button key={c.id} onClick={()=>start(c.id)} className="card text-left hover:shadow-md transition">
              <div className="text-3xl">{c.emoji}</div>
              <div className="font-medium">{c.name}</div>
              <div className="text-xs text-gray-500">{c.desc}</div>
              <div className="mt-2"><span className="pill">Crear tarjeta de prueba</span></div>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}