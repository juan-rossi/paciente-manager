"use client";

import type { FotoValue } from "@/lib/foto-clinica";

// Vercel corta los cuerpos de más de 4,5 MB y una foto de celular suele
// pesar más: se achica en el navegador antes de subirla. El servidor la
// vuelve a validar y re-codificar (ver normalizarFotoClinica()).
const LADO_SUBIDA = 2000;

export async function achicarFoto(archivo: File): Promise<Blob> {
  const imagen = await createImageBitmap(archivo, { imageOrientation: "from-image" });
  const escala = Math.min(1, LADO_SUBIDA / Math.max(imagen.width, imagen.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(imagen.width * escala);
  canvas.height = Math.round(imagen.height * escala);
  canvas.getContext("2d")!.drawImage(imagen, 0, 0, canvas.width, canvas.height);
  imagen.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/jpeg", 0.88)
  );
}

export function urlFoto(patientId: string, foto: Pick<FotoValue, "id">, mini = false): string {
  return `/api/patients/${patientId}/fotos/${foto.id}${mini ? "?tam=mini" : ""}`;
}

// Una foto elegida en el diálogo de la evolución, todavía sin subir (se sube
// al guardar la evolución, que es la que le da la fecha).
export type FotoPendiente = { clave: string; archivo: File; previa: string; zona: string; nota: string };

// Sube las fotos pendientes a una evolución ya guardada, o a la consulta
// inicial (`{ fecha }`). Devuelve las que se subieron y las que fallaron (con
// el motivo de la primera falla).
export async function subirFotosPendientes(
  patientId: string,
  destino: { evolucionId: string } | { fecha: string },
  pendientes: readonly FotoPendiente[]
): Promise<{ subidas: FotoValue[]; fallidas: FotoPendiente[]; motivo: string | null }> {
  const subidas: FotoValue[] = [];
  const fallidas: FotoPendiente[] = [];
  let motivo: string | null = null;
  for (const p of pendientes) {
    try {
      let blob: Blob;
      try {
        blob = await achicarFoto(p.archivo);
      } catch {
        throw new Error("No se pudo leer la imagen. Probá con una foto JPG o PNG.");
      }
      const datos = new FormData();
      datos.append("foto", blob, "foto.jpg");
      if ("evolucionId" in destino) datos.append("evolucionId", destino.evolucionId);
      else datos.append("fecha", destino.fecha);
      datos.append("zona", p.zona.trim());
      datos.append("nota", p.nota);
      const res = await fetch(`/api/patients/${patientId}/fotos`, { method: "POST", body: datos });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "No se pudo subir la foto.");
      subidas.push(body.foto);
    } catch (e) {
      fallidas.push(p);
      motivo ??= e instanceof Error ? e.message : "No se pudo subir la foto.";
    }
  }
  return { subidas, fallidas, motivo };
}
