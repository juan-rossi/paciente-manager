import { NextRequest, NextResponse } from "next/server";
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { ESPECIALIDAD_LABELS } from "@/lib/especialidad";
import {
  generoDeTitulo,
  nombreConTitulo,
  palabraBienvenida,
  type GeneroPlaca,
} from "@/lib/marketing-bienvenidas-texto";

type RouteParams = { params: Promise<{ id: string }> };

const SIZE = 1080;

const fontDir = join(process.cwd(), "src/assets/fonts");
const [sora700, sora800, inter500, inter600, logo] = await Promise.all([
  readFile(join(fontDir, "sora-latin-700-normal.woff")),
  readFile(join(fontDir, "sora-latin-800-normal.woff")),
  readFile(join(fontDir, "inter-latin-500-normal.woff")),
  readFile(join(fontDir, "inter-latin-600-normal.woff")),
  readFile(join(process.cwd(), "src/assets/logo_placa.png")),
]);
const LOGO_SRC = `data:image/png;base64,${logo.toString("base64")}`;

// Pieza 1080x1080 para redes (variante "banda de marca"): fondo azul noche,
// foto circular, nombre, especialidad, ciudades y el logo completo sobre una
// banda blanca. La misma maqueta que se aprobó en el diseño, en píxeles.
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;
  const medico = await prisma.user.findFirst({
    where: { id, role: "DOCTOR" },
    select: {
      nombre: true,
      apellido: true,
      tituloCortesia: true,
      especialidad: true,
      ciudad: true,
      fotoPerfilBase64: true,
      reservaPublicaHabilitada: true,
      lugaresDeTrabajo: {
        where: { deletedAt: null, perfilVisible: true },
        select: { ciudad: true, reservaPublicaHabilitada: true, publicSlug: true },
      },
    },
  });
  if (!medico) {
    return NextResponse.json({ error: "Médico no encontrado." }, { status: 404 });
  }

  const generoParam = request.nextUrl.searchParams.get("genero");
  const genero: GeneroPlaca | null =
    generoParam === "MASCULINO" || generoParam === "FEMENINO"
      ? generoParam
      : generoDeTitulo(medico.tituloCortesia);

  const ciudades = [
    ...new Set(medico.lugaresDeTrabajo.map((l) => l.ciudad).filter((c): c is string => !!c)),
  ];
  if (ciudades.length === 0 && medico.ciudad) ciudades.push(medico.ciudad);
  const ciudadesTexto =
    ciudades.slice(0, 3).join(" · ") + (ciudades.length > 3 ? ` +${ciudades.length - 3}` : "");

  const agendaVirtual =
    medico.reservaPublicaHabilitada &&
    medico.lugaresDeTrabajo.some((l) => l.reservaPublicaHabilitada && !!l.publicSlug);

  const nombre = nombreConTitulo(medico);
  const especialidad = medico.especialidad ? ESPECIALIDAD_LABELS[medico.especialidad] : "";
  const iniciales = `${medico.nombre.charAt(0)}${medico.apellido.charAt(0)}`.toUpperCase();
  // Satori solo decodifica PNG/JPEG; Mi perfil solo deja subir esos dos, pero
  // si llegara otro formato se cae a las iniciales en vez de romper la imagen.
  const foto = medico.fotoPerfilBase64;
  const fotoValida = foto && /^data:image\/(png|jpe?g);base64,/i.test(foto) ? foto : null;

  const tamanoNombre = nombre.length > 26 ? 66 : nombre.length > 20 ? 76 : 86;

  const image = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          color: "white",
          background: "linear-gradient(150deg, #0a1128 0%, #0f2554 62%, #0d3a78 100%)",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -172,
            top: -172,
            width: 605,
            height: 605,
            borderRadius: 9999,
            border: "11px solid rgba(76,180,245,0.14)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: -130,
            bottom: 151,
            width: 389,
            height: 389,
            borderRadius: 9999,
            border: "11px solid rgba(76,180,245,0.14)",
          }}
        />
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "43px 86px 32px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 291,
              height: 291,
              borderRadius: 9999,
              border: "12px solid white",
              boxShadow: "0 0 0 13px rgba(10,155,255,0.45)",
              background: "#1b3f7a",
              overflow: "hidden",
              fontFamily: "Sora",
              fontWeight: 800,
              fontSize: 100,
            }}
          >
            {fotoValida ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fotoValida} alt="" width={267} height={267} style={{ objectFit: "cover" }} />
            ) : (
              iniciales
            )}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 32,
              fontFamily: "Inter",
              fontWeight: 500,
              fontSize: 40,
              opacity: 0.85,
            }}
          >
            {`${palabraBienvenida(genero)} a Semio360`}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: 22,
              fontFamily: "Sora",
              fontWeight: 800,
              fontSize: tamanoNombre,
              lineHeight: 1.05,
              letterSpacing: -1.5,
            }}
          >
            {nombre}
          </div>
          {especialidad && (
            <div
              style={{
                display: "flex",
                marginTop: 22,
                padding: "14px 37px",
                borderRadius: 9999,
                background: "linear-gradient(90deg, #0a9bff, #00b3c4)",
                fontFamily: "Sora",
                fontWeight: 700,
                fontSize: 39,
              }}
            >
              {especialidad}
            </div>
          )}
          {ciudadesTexto && (
            <div
              style={{
                display: "flex",
                marginTop: 22,
                fontFamily: "Inter",
                fontWeight: 500,
                fontSize: 37,
                opacity: 0.88,
              }}
            >
              {ciudadesTexto}
            </div>
          )}
          <div
            style={{
              display: "flex",
              marginTop: 22,
              fontFamily: "Inter",
              fontWeight: 600,
              fontSize: 37,
              color: "#7fd6ff",
            }}
          >
            {agendaVirtual ? "Reservá turno online" : "Encontralo en el directorio"}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: 205,
            background: "white",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_SRC} alt="" width={475} height={127} />
        </div>
      </div>
    ),
    {
      width: SIZE,
      height: SIZE,
      fonts: [
        { name: "Sora", data: sora700, weight: 700, style: "normal" },
        { name: "Sora", data: sora800, weight: 800, style: "normal" },
        { name: "Inter", data: inter500, weight: 500, style: "normal" },
        { name: "Inter", data: inter600, weight: 600, style: "normal" },
      ],
      headers: {
        "Cache-Control": "private, no-store",
        ...(request.nextUrl.searchParams.get("descargar") === "1"
          ? { "Content-Disposition": `attachment; filename="bienvenida-${id}.png"` }
          : {}),
      },
    }
  );
  return image;
}
