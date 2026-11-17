import { NextRequest, NextResponse } from "next/server";
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { ESPECIALIDAD_LABELS } from "@/lib/especialidad";
import {
  esFormatoPlaca,
  FORMATOS_PLACA,
  generoDeTitulo,
  nombreConTitulo,
  palabraBienvenida,
  type FormatoPlaca,
  type GeneroPlaca,
} from "@/lib/marketing-bienvenidas-texto";

type RouteParams = { params: Promise<{ id: string }> };

// El diseño base es el vertical 1080x1350. Los otros formatos lo escalan:
// el cuadrado lo achica para que entre en menos alto, y la historia lo agranda
// y deja libres arriba y abajo las franjas que tapa la interfaz de Instagram
// (barra de progreso y perfil arriba, caja de respuesta abajo).
const LAYOUT: Record<FormatoPlaca, { escala: number; margenArriba: number; margenAbajo: number }> = {
  cuadrado: { escala: 0.8, margenArriba: 40, margenAbajo: 50 },
  vertical: { escala: 1, margenArriba: 60, margenAbajo: 65 },
  historia: { escala: 1.15, margenArriba: 250, margenAbajo: 250 },
};

const fontDir = join(process.cwd(), "src/assets/fonts");
const [sora700, sora800, inter500, inter600, logo] = await Promise.all([
  readFile(join(fontDir, "sora-latin-700-normal.woff")),
  readFile(join(fontDir, "sora-latin-800-normal.woff")),
  readFile(join(fontDir, "inter-latin-500-normal.woff")),
  readFile(join(fontDir, "inter-latin-600-normal.woff")),
  readFile(join(process.cwd(), "src/assets/logo_placa_oscuro.png")),
]);
const LOGO_SRC = `data:image/png;base64,${logo.toString("base64")}`;

// Pieza para redes (cuadrada, vertical o historia): fondo azul noche, foto circular, nombre,
// especialidad, ciudades y un pie con línea divisoria, el logo completo (versión
// para fondo oscuro) a la izquierda y la llamada a la acción a la derecha.
// Maqueta en píxeles de la variación A2 aprobada en el diseño.
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
      fotoPublicaBase64: true,
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

  const formatoParam = request.nextUrl.searchParams.get("formato");
  const formato: FormatoPlaca = esFormatoPlaca(formatoParam) ? formatoParam : "vertical";
  const { width, height } = FORMATOS_PLACA[formato];
  const { escala, margenArriba, margenAbajo } = LAYOUT[formato];
  const px = (n: number) => Math.round(n * escala);

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
  const foto = medico.fotoPublicaBase64;
  const fotoValida = foto && /^data:image\/(png|jpe?g);base64,/i.test(foto) ? foto : null;

  const tamanoNombre = px(nombre.length > 26 ? 66 : nombre.length > 20 ? 76 : 86);

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
            right: px(-172),
            top: px(-172),
            width: px(605),
            height: px(605),
            borderRadius: 9999,
            border: `${px(11)}px solid rgba(76,180,245,0.14)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: px(-150),
            bottom: margenAbajo + px(125),
            width: px(440),
            height: px(440),
            borderRadius: 9999,
            border: `${px(11)}px solid rgba(76,180,245,0.14)`,
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
            padding: `${margenArriba}px ${px(86)}px ${px(40)}px`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: px(360),
              height: px(360),
              borderRadius: 9999,
              border: `${px(12)}px solid white`,
              boxShadow: `0 0 0 ${px(13)}px rgba(10,155,255,0.45)`,
              background: "#1b3f7a",
              overflow: "hidden",
              fontFamily: "Sora",
              fontWeight: 800,
              fontSize: px(124),
            }}
          >
            {fotoValida ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fotoValida} alt="" width={px(336)} height={px(336)} style={{ objectFit: "cover", borderRadius: 9999 }} />
            ) : (
              iniciales
            )}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: px(48),
              fontFamily: "Inter",
              fontWeight: 500,
              fontSize: px(40),
              opacity: 0.85,
            }}
          >
            {`${palabraBienvenida(genero)} a Semio360`}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: px(26),
              fontFamily: "Sora",
              fontWeight: 800,
              fontSize: tamanoNombre,
              lineHeight: 1.05,
              letterSpacing: -1.5 * escala,
            }}
          >
            {nombre}
          </div>
          {especialidad && (
            <div
              style={{
                display: "flex",
                marginTop: px(34),
                padding: `${px(14)}px ${px(37)}px`,
                borderRadius: 9999,
                background: "linear-gradient(90deg, #0a9bff, #00b3c4)",
                fontFamily: "Sora",
                fontWeight: 700,
                fontSize: px(39),
              }}
            >
              {especialidad}
            </div>
          )}
          {ciudadesTexto && (
            <div
              style={{
                display: "flex",
                marginTop: px(28),
                fontFamily: "Inter",
                fontWeight: 500,
                fontSize: px(37),
                opacity: 0.88,
              }}
            >
              {ciudadesTexto}
            </div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            margin: `0 ${px(76)}px ${margenAbajo}px`,
            paddingTop: px(39),
            borderTop: `${Math.max(2, px(3))}px solid rgba(255,255,255,0.22)`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_SRC} alt="" width={px(389)} height={px(104)} />
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              textAlign: "right",
              maxWidth: px(324),
              fontFamily: "Inter",
              fontWeight: 600,
              fontSize: px(33),
              lineHeight: 1.3,
              color: "#7fd6ff",
            }}
          >
            {agendaVirtual ? "Reservá turno online" : "Encontralo en el directorio"}
          </div>
        </div>
      </div>
    ),
    {
      width,
      height,
      fonts: [
        { name: "Sora", data: sora700, weight: 700, style: "normal" },
        { name: "Sora", data: sora800, weight: 800, style: "normal" },
        { name: "Inter", data: inter500, weight: 500, style: "normal" },
        { name: "Inter", data: inter600, weight: 600, style: "normal" },
      ],
      headers: {
        "Cache-Control": "private, no-store",
        ...(request.nextUrl.searchParams.get("descargar") === "1"
          ? { "Content-Disposition": `attachment; filename="bienvenida-${id}-${formato}.png"` }
          : {}),
      },
    }
  );
  return image;
}
