import { ESPECIALIDAD_LABELS, type Especialidad } from "@/lib/especialidad";
import { FAQS } from "@/lib/faq";
import { absoluteUrl, getSiteUrl } from "@/lib/site-url";
import { formatNombreConTitulo, type TituloCortesia } from "@/lib/titulo-cortesia";

export const SITE_NAME = "Semio360";
export const SITE_DESCRIPTION =
  "Software para consultorios médicos: turnos, historia clínica electrónica y dictado de la consulta, conforme a la Ley 26.529.";

export function nombreDoctor(d: { tituloCortesia: TituloCortesia | null; nombre: string; apellido: string }): string {
  return formatNombreConTitulo(d.tituloCortesia, `${d.nombre} ${d.apellido}`.trim());
}

// Recorta en límite de palabra para descriptions de ~155 caracteres.
export function recortar(texto: string, max = 155): string {
  const limpio = texto.replace(/\s+/g, " ").trim();
  if (limpio.length <= max) return limpio;
  const corte = limpio.slice(0, max - 1);
  return `${corte.slice(0, corte.lastIndexOf(" ") > 60 ? corte.lastIndexOf(" ") : corte.length)}…`;
}

export function descripcionPerfil(d: {
  tituloCortesia: TituloCortesia | null;
  nombre: string;
  apellido: string;
  especialidad: Especialidad | null;
  ciudad: string;
  biografia: string | null;
  prepagas: string[];
  reservaOnline: boolean;
}): string {
  const nombre = nombreDoctor(d);
  const esp = d.especialidad ? ESPECIALIDAD_LABELS[d.especialidad] : null;
  const partes = [
    `${nombre}${esp ? `, ${esp}` : ""}${d.ciudad ? ` en ${d.ciudad}` : ""}.`,
    d.reservaOnline ? "Reservá tu turno online." : "Consultá su perfil y lugares de atención.",
  ];
  if (d.prepagas.length > 0) partes.push(`Coberturas: ${d.prepagas.slice(0, 4).map((p) => p.replace(/\s*\(.*\)$/, "")).join(", ")}.`);
  if (d.biografia) partes.push(d.biografia);
  return recortar(partes.join(" "));
}

export function organizationJsonLd() {
  const url = getSiteUrl();
  return {
    "@type": "Organization",
    "@id": `${url}/#organization`,
    name: SITE_NAME,
    url,
    logo: absoluteUrl("/icon.png"),
    email: "contacto@semio360.com",
    description: SITE_DESCRIPTION,
  };
}

export function homeJsonLd() {
  const url = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationJsonLd(),
      {
        "@type": "WebSite",
        "@id": `${url}/#website`,
        url,
        name: SITE_NAME,
        inLanguage: "es-AR",
        publisher: { "@id": `${url}/#organization` },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${url}/#software`,
        name: SITE_NAME,
        applicationCategory: "HealthApplication",
        operatingSystem: "Web",
        inLanguage: "es-AR",
        description: SITE_DESCRIPTION,
        url,
        publisher: { "@id": `${url}/#organization` },
        featureList: [
          "Historia clínica electrónica",
          "Agenda de turnos y reserva online",
          "Dictado y transcripción de la consulta",
          "Consentimiento informado",
          "Recordatorios de turno por WhatsApp",
          "Auditoría de cambios y roles de usuario",
        ],
        offers: [
          { "@type": "Offer", name: "Plan Básico", description: "60 días de prueba gratis, sin tarjeta." },
          { "@type": "Offer", name: "Plan Premium", description: "Suma resúmenes y autocompletado con IA." },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${url}/#faq`,
        mainEntity: FAQS.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  };
}

export function directorioJsonLd(doctores: { nombre: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: "Directorio de médicos",
        url: absoluteUrl("/directorio"),
        inLanguage: "es-AR",
        isPartOf: { "@id": `${getSiteUrl()}/#website` },
      },
      breadcrumbJsonLd([
        { name: "Inicio", path: "/" },
        { name: "Directorio", path: "/directorio" },
      ]),
      {
        "@type": "ItemList",
        numberOfItems: doctores.length,
        itemListElement: doctores.map((d, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: absoluteUrl(d.path),
          name: d.nombre,
        })),
      },
    ],
  };
}

export function perfilJsonLd(d: {
  slug: string;
  nombre: string;
  especialidad: Especialidad | null;
  descripcion: string;
  fotoUrl: string | null;
  prepagas: string[];
  lugares: { nombre: string | null; direccion: string; ciudad: string | null; telefono: string }[];
}) {
  const url = absoluteUrl(`/directorio/${encodeURIComponent(d.slug)}`);
  const esp = d.especialidad ? ESPECIALIDAD_LABELS[d.especialidad] : null;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["Physician", "MedicalBusiness"],
        "@id": `${url}#physician`,
        name: d.nombre,
        url,
        description: d.descripcion,
        ...(esp ? { medicalSpecialty: esp } : {}),
        ...(d.fotoUrl ? { image: absoluteUrl(d.fotoUrl) } : {}),
        ...(d.prepagas.length > 0 ? { knowsAbout: d.prepagas.map((p) => `Cobertura ${p}`) } : {}),
        ...(d.lugares[0]?.telefono ? { telephone: d.lugares[0].telefono } : {}),
        ...(d.lugares.length > 0
          ? {
              location: d.lugares.map((l) => ({
                "@type": "Place",
                name: l.nombre ?? "Consulta particular",
                ...(l.telefono ? { telephone: l.telefono } : {}),
                address: {
                  "@type": "PostalAddress",
                  streetAddress: l.direccion,
                  ...(l.ciudad ? { addressLocality: l.ciudad } : {}),
                  addressCountry: "AR",
                },
              })),
            }
          : {}),
      },
      breadcrumbJsonLd([
        { name: "Inicio", path: "/" },
        { name: "Directorio", path: "/directorio" },
        ...(d.especialidad
          ? [{ name: ESPECIALIDAD_LABELS[d.especialidad], path: `/directorio?especialidad=${d.especialidad}` }]
          : []),
        { name: d.nombre, path: `/directorio/${encodeURIComponent(d.slug)}` },
      ]),
    ],
  };
}
