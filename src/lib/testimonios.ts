// Fuente única de los testimonios reales publicados en la landing -- si se
// agrega una página dedicada de testimonios en el futuro, debe leer de acá
// en vez de duplicar el contenido.
export type Testimonio = {
  nombre: string;
  rol: string;
  texto: string;
};

export const TESTIMONIOS: Testimonio[] = [
  {
    nombre: "Dra. M. G.",
    rol: "Clínica Médica",
    texto:
      "Dejé de perder tiempo buscando la ficha de cada paciente. Ahora está todo en un mismo lugar, y dictar la evolución me ahorra un rato largo por consulta.",
  },
  {
    nombre: "Dr. F. T.",
    rol: "Consultorio particular",
    texto:
      "Mi secretaria maneja los turnos sola, sin que yo tenga que estar encima. Los recordatorios por WhatsApp bajaron muchísimo las ausencias.",
  },
  {
    nombre: "Dra. M. V.",
    rol: "Medicina General",
    texto:
      "Empecé con la prueba gratis para ver si valía la pena migrar desde Excel, y a la semana ya no me imaginaba volver atrás.",
  },
];
