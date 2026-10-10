export type TurnoInfo = {
  id: string;
  nombreYApellido: string;
  fechaNacimiento: string | null;
  dni: string | null;
  telefono: string;
  obraSocial: string | null;
  obraSocialNro: string | null;
  patientId?: string | null;
  origen: string;
};

export type Slot = {
  inicio: string;
  fin: string;
  lugarId: string;
  turno: TurnoInfo | null;
  bloqueado: { bloqueoId: string; motivo: string | null } | null;
};

export type BloqueoDelDia = {
  id: string;
  lugarId: string | null;
  inicio: string;
  fin: string;
  motivo: string | null;
};

export type LugarInfo = {
  id: string;
  nombre: string | null;
  tipo: string;
  ciudad: string | null;
};

// Estado de resolución por bloque del wizard de "Bloquear horarios" --
// ver `useBloqueo`.
export type ResolucionBloqueState = {
  resolucion: "cancelar" | "mover_dia_libre" | "mover_siguiente_libre";
  diaLibreElegido: string;
  horariosConsecutivos: boolean;
  habilitarTurnosNuevos: boolean;
};
