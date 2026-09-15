// Datos ficticios únicamente para las demostraciones visuales de la landing.
// Ningún dato de paciente real se usa ni se referencia acá.

export type DemoTurno = {
  hora: string;
  nombre: string;
  motivo: string;
  estado: "confirmado" | "pendiente" | "libre";
};

export const DEMO_TURNOS: DemoTurno[] = [
  { hora: "09:00", nombre: "María González", motivo: "Control anual", estado: "confirmado" },
  { hora: "10:00", nombre: "Carlos Ramírez", motivo: "Primera consulta", estado: "pendiente" },
  { hora: "11:30", nombre: "Laura Fernández", motivo: "Seguimiento", estado: "confirmado" },
  { hora: "12:00", nombre: "—", motivo: "Turno libre", estado: "libre" },
];

export const DEMO_PACIENTE = {
  nombre: "María González",
  edad: 42,
  dni: "28.4XX.XXX",
  obraSocial: "OSDE",
  antecedentes: ["Hipertensión arterial", "Sin alergias conocidas"],
  ultimaConsulta: "12/08/2026",
  proximoTurno: "Hoy, 09:00",
};

export const DEMO_TIMELINE = [
  { fecha: "12 ago 2026", titulo: "Consulta de seguimiento", texto: "Buen estado general. Se ajusta medicación." },
  { fecha: "03 may 2026", titulo: "Control anual", texto: "Estudios de rutina solicitados, sin hallazgos relevantes." },
  { fecha: "14 ene 2026", titulo: "Primera consulta", texto: "Antecedente de hipertensión arterial. Inicia tratamiento." },
];
