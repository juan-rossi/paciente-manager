// Inyecta datos estructurados (schema.org). Se escapa `<` para que un texto
// con "</script>" (p. ej. una biografía) no pueda cerrar el tag.
export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
