"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { textoBienvenida, type GeneroPlaca } from "@/lib/marketing-bienvenidas-texto";

export type BienvenidaFila = {
  id: string;
  nombreCompleto: string;
  especialidad: string;
  ciudades: string[];
  agendaVirtual: boolean;
  url: string;
  generoSugerido: GeneroPlaca | null;
  genero: GeneroPlaca | null;
  altaTexto: string;
  publicadaTexto: string | null;
};

type Props = {
  estado: "pendientes" | "publicadas";
  medicos: BienvenidaFila[];
  conteo: { pendientes: number; publicadas: number };
};

const SELECT_CLASS =
  "h-8 rounded-lg border border-input bg-white px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function BienvenidasScreen({ estado, medicos, conteo }: Props) {
  const router = useRouter();
  const [abiertoId, setAbiertoId] = useState<string | null>(null);
  const [genero, setGenero] = useState<GeneroPlaca | "">("");
  const [guardando, setGuardando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abierto = medicos.find((m) => m.id === abiertoId) ?? null;
  const publicada = abierto?.publicadaTexto !== null && abierto?.publicadaTexto !== undefined;

  function abrir(m: BienvenidaFila) {
    setAbiertoId(m.id);
    setGenero(m.genero ?? m.generoSugerido ?? "");
    setCopiado(false);
    setError(null);
  }

  const generoElegido: GeneroPlaca | null = genero === "" ? null : genero;
  const texto = abierto
    ? textoBienvenida({
        nombreCompleto: abierto.nombreCompleto,
        especialidad: abierto.especialidad,
        ciudades: abierto.ciudades,
        agendaVirtual: abierto.agendaVirtual,
        url: abierto.url,
        genero: generoElegido,
      })
    : "";
  const placaUrl = abierto
    ? `/api/admin/marketing/bienvenidas/${abierto.id}/placa${generoElegido ? `?genero=${generoElegido}` : ""}`
    : "";
  const descargaUrl = `${placaUrl}${placaUrl.includes("?") ? "&" : "?"}descargar=1`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setError("No se pudo copiar. Seleccioná el texto y copialo a mano.");
    }
  }

  async function cambiarEstado(publicar: boolean) {
    if (!abierto) return;
    setGuardando(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/marketing/bienvenidas/${abierto.id}`, {
        method: publicar ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: publicar ? JSON.stringify({ genero: generoElegido }) : undefined,
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error ?? "No se pudo guardar el cambio.");
        return;
      }
      setAbiertoId(null);
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-border bg-card p-0.5 text-sm font-medium">
          {(
            [
              { value: "pendientes", label: "Pendientes", count: conteo.pendientes },
              { value: "publicadas", label: "Publicadas", count: conteo.publicadas },
            ] as const
          ).map((tab) => (
            <Link
              key={tab.value}
              href={tab.value === "pendientes" ? "/admin/marketing/bienvenidas" : "/admin/marketing/bienvenidas?estado=publicadas"}
              aria-current={estado === tab.value ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-1 transition-colors",
                estado === tab.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label} · {tab.count}
            </Link>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Solo médicos con perfil público, perfil completo, foto, biografía y horarios.
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Profesional</TableHead>
            <TableHead>Especialidad</TableHead>
            <TableHead>Ciudades</TableHead>
            <TableHead>Agenda virtual</TableHead>
            <TableHead>{estado === "publicadas" ? "Publicada" : "Alta"}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {medicos.length === 0 && (
            <TableRow className="bg-white">
              <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                {estado === "pendientes"
                  ? "No hay bienvenidas pendientes. Cuando un médico complete su perfil, aparece acá."
                  : "Todavía no marcaste ninguna bienvenida como publicada."}
              </TableCell>
            </TableRow>
          )}
          {medicos.map((m) => (
            <TableRow key={m.id} className="bg-white">
              <TableCell>
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{m.nombreCompleto}</span>
                  {m.generoSugerido === null && m.genero === null && (
                    <Badge
                      variant="outline"
                      className="w-fit border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400"
                    >
                      Falta género
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>{m.especialidad}</TableCell>
              <TableCell>{m.ciudades.join(", ") || "—"}</TableCell>
              <TableCell>{m.agendaVirtual ? "Sí" : "No"}</TableCell>
              <TableCell className="text-muted-foreground">
                {estado === "publicadas" ? m.publicadaTexto : m.altaTexto}
              </TableCell>
              <TableCell className="text-right">
                <Button type="button" size="sm" onClick={() => abrir(m)}>
                  {estado === "publicadas" ? "Ver" : "Preparar"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={abierto !== null} onOpenChange={(open) => !open && setAbiertoId(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          {abierto && (
            <>
              <DialogHeader>
                <DialogTitle>{abierto.nombreCompleto}</DialogTitle>
                <DialogDescription>
                  {abierto.especialidad} · {abierto.ciudades.join(", ") || "sin ciudad cargada"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-5 sm:grid-cols-2">
                {/* La placa se genera en el servidor (ImageResponse), así que lo
                    que se ve acá es exactamente el PNG que se descarga. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={placaUrl}
                  src={placaUrl}
                  alt={`Placa de bienvenida de ${abierto.nombreCompleto}`}
                  className="aspect-square w-full rounded-lg border border-border bg-muted"
                />
                <div className="flex min-w-0 flex-col gap-3">
                  <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                    Forma de la placa
                    <select
                      className={SELECT_CLASS}
                      value={genero}
                      onChange={(e) => setGenero(e.target.value as GeneroPlaca | "")}
                      disabled={publicada}
                    >
                      <option value="">Elegí una opción</option>
                      <option value="MASCULINO">Bienvenido</option>
                      <option value="FEMENINO">Bienvenida</option>
                    </select>
                    {abierto.generoSugerido === null && !publicada && (
                      <span className="font-normal">
                        Su título no define el género. Elegilo para poder publicar.
                      </span>
                    )}
                  </label>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      Texto para la publicación
                    </span>
                    <pre className="max-h-56 overflow-y-auto rounded-lg border border-border bg-muted/50 p-3 font-sans text-[13px] leading-relaxed whitespace-pre-wrap break-words">
                      {texto}
                    </pre>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={descargaUrl}
                      download={`bienvenida-${abierto.id}.png`}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium transition-colors hover:bg-muted"
                    >
                      <Download className="size-3.5" />
                      Descargar placa
                    </a>
                    <Button type="button" variant="outline" onClick={copiar}>
                      {copiado ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                      {copiado ? "Copiado" : "Copiar texto"}
                    </Button>
                  </div>
                  {error && <p className="text-xs text-destructive">{error}</p>}
                  {publicada ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={guardando}
                      onClick={() => cambiarEstado(false)}
                    >
                      Volver a pendientes
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      disabled={guardando || generoElegido === null}
                      onClick={() => cambiarEstado(true)}
                    >
                      Marcar como publicada
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
