import { ImageResponse } from "next/og";
import { getDoctorPublicoPorSlug } from "@/lib/directorio";
import { ESPECIALIDAD_LABELS } from "@/lib/especialidad";
import { nombreDoctor } from "@/lib/seo";
import { prisma } from "@/lib/prisma";

export const alt = "Perfil de médico en Semio360";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Tarjeta para compartir el perfil: nombre y especialidad sobre la marca. La
// foto (base64 en la base) se incrusta como data URL, que Satori acepta.
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doctor = await getDoctorPublicoPorSlug(slug);
  const nombre = doctor ? nombreDoctor(doctor) : "Directorio de médicos";
  const esp = doctor?.especialidad ? ESPECIALIDAD_LABELS[doctor.especialidad] : "";
  // Satori solo decodifica PNG/JPEG; otros formatos caen a las iniciales.
  const foto = doctor
    ? (
        await prisma.user.findUnique({
          where: { publicSlug: slug },
          select: { fotoPerfilBase64: true },
        })
      )?.fotoPerfilBase64
    : null;
  const fotoValida = foto && /^data:image\/(png|jpe?g);base64,/i.test(foto) ? foto : null;
  const iniciales = doctor ? `${doctor.nombre.charAt(0)}${doctor.apellido.charAt(0)}`.toUpperCase() : "S";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          padding: 80,
          background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
          color: "white",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 220,
            height: 220,
            borderRadius: 110,
            background: "rgba(255,255,255,0.15)",
            fontSize: 90,
            fontWeight: 800,
            marginRight: 64,
            overflow: "hidden",
          }}
        >
          {fotoValida ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fotoValida} alt="" width={220} height={220} style={{ objectFit: "cover" }} />
          ) : (
            iniciales
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 72, fontWeight: 800, lineHeight: 1.1 }}>{nombre}</div>
          {esp && <div style={{ display: "flex", fontSize: 40, marginTop: 20, opacity: 0.85 }}>{esp}</div>}
          <div style={{ display: "flex", fontSize: 30, marginTop: 36, opacity: 0.7 }}>
            Reservá turno online · Semio360
          </div>
        </div>
      </div>
    ),
    size
  );
}
