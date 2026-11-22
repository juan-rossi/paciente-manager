"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  FileUp,
  History,
  ShieldCheck,
  ShieldOff,
  Upload,
  X,
} from "lucide-react";
import { SettingsSection } from "@/components/settings-section";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AcuerdoDatosContenido } from "@/components/legal/acuerdo-datos-contenido";
import {
  extensionPermitida,
  IMPORTACION_ACCESO_HORAS,
  IMPORTACION_ARCHIVOS_MAXIMOS,
  IMPORTACION_BYTES_MAXIMOS_ARCHIVO,
  IMPORTACION_DIAS_ARCHIVOS,
  IMPORTACION_EXTENSIONES,
} from "@/lib/importacion";
import type { AccesoImportacion, ImportacionVista } from "@/lib/importacion-vista";
import { cn } from "@/lib/utils";

type Props = {
  importaciones: ImportacionVista[];
  // Con el plan vencido no se puede empezar una importación (es cargar
  // datos), pero sí manejar la que está en curso.
  puedeImportar: boolean;
};

function formatTamano(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("es-AR", { maximumFractionDigits: 1 })} MB`;
}

const ESTADO_LABEL: Record<ImportacionVista["estado"], string> = {
  ENVIADA: "Esperando carga",
  CARGADA: "Lista para revisar",
  CONFIRMADA: "Confirmada",
  CANCELADA: "Cancelada",
  VENCIDA: "Vencida",
  RECHAZADA: "No se pudo cargar",
};

const ESTADO_CLASE: Record<ImportacionVista["estado"], string> = {
  ENVIADA: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  CARGADA: "bg-primary/10 text-primary",
  CONFIRMADA: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
  CANCELADA: "bg-muted text-muted-foreground",
  VENCIDA: "bg-muted text-muted-foreground",
  RECHAZADA: "bg-destructive/10 text-destructive",
};

function EstadoPill({ estado }: { estado: ImportacionVista["estado"] }) {
  return (
    <span className={cn("inline-flex h-5 items-center rounded-full px-2 text-xs font-medium", ESTADO_CLASE[estado])}>
      {ESTADO_LABEL[estado]}
    </span>
  );
}

function describirAcceso(acceso: AccesoImportacion) {
  switch (acceso.tipo) {
    case "DESCARGAR":
      return acceso.esEquipo
        ? `${acceso.quien} (equipo de Semio 360) abrió ${acceso.archivo ?? "un archivo"}`
        : `Abriste ${acceso.archivo ?? "un archivo"}`;
    case "AUTORIZAR_ACCESO":
      return `${acceso.quien === "Vos" ? "Diste" : `${acceso.quien} dio`} permiso al equipo por ${IMPORTACION_ACCESO_HORAS} h`;
    case "REVOCAR_ACCESO":
      return `${acceso.quien === "Vos" ? "Quitaste" : `${acceso.quien} quitó`} el permiso al equipo`;
    case "ELIMINAR":
      return "Se borraron los archivos";
  }
}

function RegistroAccesos({ accesos }: { accesos: AccesoImportacion[] }) {
  if (accesos.length === 0) {
    return <p className="text-xs text-muted-foreground">Todavía nadie abrió tus archivos.</p>;
  }
  return (
    <ul className="flex flex-col gap-1.5">
      {accesos.map((acceso) => (
        <li key={acceso.id} className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs">
          <span className={cn(acceso.esEquipo ? "text-foreground" : "text-muted-foreground")}>
            {describirAcceso(acceso)}
          </span>
          <span className="shrink-0 text-muted-foreground tabular-nums">{acceso.fecha}</span>
        </li>
      ))}
    </ul>
  );
}

async function llamar(url: string, init?: RequestInit): Promise<string | null> {
  try {
    const response = await fetch(url, init);
    if (response.ok) return null;
    const data = await response.json().catch(() => ({}));
    return data.error ?? "No se pudo completar la acción.";
  } catch {
    return "No se pudo conectar con el servidor.";
  }
}

export function ImportacionSettings({ importaciones, puedeImportar }: Props) {
  const router = useRouter();
  const enCurso = importaciones.find((i) => i.estado === "ENVIADA" || i.estado === "CARGADA") ?? null;
  // Si la última que mandó no se pudo cargar, el motivo va arriba del
  // formulario: es lo que necesita para saber qué mandar de nuevo.
  const rechazada = !enCurso && importaciones[0]?.estado === "RECHAZADA" ? importaciones[0] : null;
  const anteriores = importaciones.filter((i) => i !== enCurso && i !== rechazada);

  return (
    <SettingsSection
      title="Importar historias clínicas"
      description="Si usabas otro sistema, planillas o documentos, nuestro equipo carga tus pacientes por vos, sin cargo. Subís los archivos acá: no los mandes por mail, WhatsApp ni Drive."
      icon={FileUp}
    >
      {rechazada && <AvisoRechazada importacion={rechazada} />}

      {enCurso ? (
        <ImportacionEnCurso importacion={enCurso} onCambio={() => router.refresh()} />
      ) : puedeImportar ? (
        <NuevaImportacion onEnviada={() => router.refresh()} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Para importar historias clínicas necesitás un plan activo.
        </p>
      )}

      {anteriores.length > 0 && (
        <details className="group border-t border-dashed border-border pt-3">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
            <History className="size-3.5" />
            Importaciones anteriores ({anteriores.length})
          </summary>
          <ul className="mt-3 flex flex-col gap-3">
            {anteriores.map((imp) => (
              <li key={imp.id} className="flex flex-col gap-2 rounded-lg border border-border/60 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    {imp.enviadaEl} · {imp.archivos.length}{" "}
                    {imp.archivos.length === 1 ? "archivo" : "archivos"}
                  </span>
                  <EstadoPill estado={imp.estado} />
                </div>
                {imp.estado === "RECHAZADA" && imp.notaEquipo && (
                  <p className="text-xs whitespace-pre-line text-muted-foreground">{imp.notaEquipo}</p>
                )}
                <RegistroAccesos accesos={imp.accesos} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </SettingsSection>
  );
}

function AvisoRechazada({ importacion }: { importacion: ImportacionVista }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">
          No pudimos cargar los archivos que enviaste el {importacion.enviadaEl}
        </span>
        {importacion.notaEquipo && <p className="text-sm whitespace-pre-line">{importacion.notaEquipo}</p>}
        <span className="text-xs text-muted-foreground">
          Ya los borramos. Podés enviarnos otros abajo, o escribirnos desde{" "}
          <Link href="/soporte" className="font-medium text-primary underline underline-offset-2">
            Soporte
          </Link>{" "}
          si tenés dudas sobre qué mandar.
        </span>
      </div>
    </div>
  );
}

function NuevaImportacion({ onEnviada }: { onEnviada: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [archivos, setArchivos] = useState<File[]>([]);
  const [nota, setNota] = useState("");
  const [aceptaAcuerdo, setAceptaAcuerdo] = useState(false);
  const [declaraDatos, setDeclaraDatos] = useState(false);
  const [acuerdoAbierto, setAcuerdoAbierto] = useState(false);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function agregarArchivos(lista: FileList | null) {
    if (!lista) return;
    setError(null);
    const nuevos: File[] = [];
    for (const archivo of Array.from(lista)) {
      if (!extensionPermitida(archivo.name)) {
        setError(`"${archivo.name}" no es un formato que podamos importar.`);
        continue;
      }
      if (archivo.size > IMPORTACION_BYTES_MAXIMOS_ARCHIVO) {
        setError(`"${archivo.name}" pesa más de 4 MB. Dividilo en partes o comprimilo en un .zip.`);
        continue;
      }
      nuevos.push(archivo);
    }
    setArchivos((actuales) => {
      const todos = [...actuales, ...nuevos].slice(0, IMPORTACION_ARCHIVOS_MAXIMOS);
      if (actuales.length + nuevos.length > IMPORTACION_ARCHIVOS_MAXIMOS) {
        setError(`Podés enviar hasta ${IMPORTACION_ARCHIVOS_MAXIMOS} archivos por importación.`);
      }
      return todos;
    });
    if (inputRef.current) inputRef.current.value = "";
  }

  async function enviar() {
    setError(null);
    if (archivos.length === 0) {
      setError("Elegí al menos un archivo.");
      return;
    }
    if (!aceptaAcuerdo || !declaraDatos) {
      setError("Para enviar los archivos tenés que marcar las dos casillas.");
      return;
    }

    setEnviando("Preparando…");
    let importacionId: string | null = null;
    try {
      const creada = await fetch("/api/importacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nota: nota.trim() || undefined, aceptaAcuerdo, declaraDatos }),
      });
      const data = await creada.json().catch(() => ({}));
      if (!creada.ok) {
        setError(data.error ?? "No se pudo iniciar la importación.");
        return;
      }
      importacionId = data.id as string;

      for (const [i, archivo] of archivos.entries()) {
        setEnviando(`Subiendo ${i + 1} de ${archivos.length}…`);
        const form = new FormData();
        form.append("archivo", archivo);
        const subido = await llamar(`/api/importacion/${importacionId}/archivos`, { method: "POST", body: form });
        if (subido) throw new Error(subido);
      }

      setEnviando("Enviando…");
      const enviada = await llamar(`/api/importacion/${importacionId}/enviar`, { method: "POST" });
      if (enviada) throw new Error(enviada);

      onEnviada();
    } catch (e) {
      // Se descarta el borrador a medio subir: no queda nada guardado.
      if (importacionId) await llamar(`/api/importacion/${importacionId}`, { method: "DELETE" });
      setError(e instanceof Error ? e.message : "No se pudo conectar con el servidor.");
    } finally {
      setEnviando(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <ol className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        <li className="flex gap-2">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" />
          Al enviarlos, el equipo puede verlos durante {IMPORTACION_ACCESO_HORAS} horas. Podés quitar o renovar el
          permiso cuando quieras.
        </li>
        <li className="flex gap-2">
          <Clock className="mt-0.5 size-3.5 shrink-0 text-primary" />
          Los archivos se borran al terminar la carga, o a los {IMPORTACION_DIAS_ARCHIVOS} días como máximo.
        </li>
        <li className="flex gap-2">
          <FileText className="mt-0.5 size-3.5 shrink-0 text-primary" />
          Ves quién abrió cada archivo y cuándo.
        </li>
        <li className="flex gap-2">
          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
          Al terminar te avisamos para que revises y confirmes.
        </li>
      </ol>

      <div className="flex flex-col gap-2">
        <Label>Archivos</Label>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={IMPORTACION_EXTENSIONES.join(",")}
          className="sr-only"
          id="importacion-archivos"
          onChange={(e) => agregarArchivos(e.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          className="self-start"
          onClick={() => inputRef.current?.click()}
          disabled={!!enviando}
        >
          <Upload className="size-4" />
          Elegir archivos
        </Button>
        <p className="text-xs text-muted-foreground">
          Excel, CSV, Word, PDF o el export de tu sistema anterior (.zip). Hasta {IMPORTACION_ARCHIVOS_MAXIMOS}{" "}
          archivos de 4 MB cada uno.
        </p>
        {archivos.length > 0 && (
          <ul className="flex flex-col divide-y divide-border/60 rounded-lg border border-border/60">
            {archivos.map((archivo, i) => (
              <li key={`${archivo.name}-${i}`} className="flex items-center gap-2 px-3 py-2 text-sm">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{archivo.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {formatTamano(archivo.size)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Quitar ${archivo.name}`}
                  disabled={!!enviando}
                  onClick={() => setArchivos((a) => a.filter((_, j) => j !== i))}
                >
                  <X />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="importacion-nota">Contanos de dónde vienen (opcional)</Label>
        <Textarea
          id="importacion-nota"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Ej.: export de mi sistema anterior; la planilla tiene una hoja por año."
          maxLength={2000}
          rows={3}
          disabled={!!enviando}
        />
      </div>

      <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3">
        <div className="flex items-start gap-2.5">
          <Checkbox
            id="importacion-acuerdo"
            checked={aceptaAcuerdo}
            onCheckedChange={(checked) => setAceptaAcuerdo(checked === true)}
            className="mt-0.5"
          />
          <Label htmlFor="importacion-acuerdo" className="block text-xs leading-snug font-normal">
            Leí y acepto el{" "}
            <button
              type="button"
              onClick={() => setAcuerdoAbierto(true)}
              className="font-medium text-primary underline underline-offset-2"
            >
              Acuerdo de tratamiento de datos
            </button>
            .
          </Label>
        </div>
        <div className="flex items-start gap-2.5">
          <Checkbox
            id="importacion-declaracion"
            checked={declaraDatos}
            onCheckedChange={(checked) => setDeclaraDatos(checked === true)}
            className="mt-0.5"
          />
          <Label htmlFor="importacion-declaracion" className="block text-xs leading-snug font-normal">
            Confirmo que los datos son de mis pacientes y que tengo derecho a usarlos. Si vienen de una clínica o
            institución, tengo su autorización.
          </Label>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="button" className="self-start" onClick={enviar} disabled={!!enviando}>
        <FileUp className="size-4" />
        {enviando ?? "Enviar al equipo"}
      </Button>

      <Dialog open={acuerdoAbierto} onOpenChange={setAcuerdoAbierto}>
        <DialogContent className="max-h-[85dvh] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Acuerdo de tratamiento de datos</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto pr-1">
            <AcuerdoDatosContenido />
          </div>
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ImportacionEnCurso({ importacion, onCambio }: { importacion: ImportacionVista; onCambio: () => void }) {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelarAbierto, setCancelarAbierto] = useState(false);

  const { accesoVigente } = importacion;

  async function accion(url: string, init: RequestInit) {
    setOcupado(true);
    setError(null);
    const fallo = await llamar(url, init);
    setOcupado(false);
    if (fallo) {
      setError(fallo);
      return false;
    }
    onCambio();
    return true;
  }

  function cambiarAcceso(accionAcceso: "revocar" | "renovar") {
    return accion(`/api/importacion/${importacion.id}/acceso`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: accionAcceso }),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">
          Enviada el {importacion.enviadaEl} · {importacion.archivos.length}{" "}
          {importacion.archivos.length === 1 ? "archivo" : "archivos"}
        </span>
        <EstadoPill estado={importacion.estado} />
      </div>

      {importacion.estado === "ENVIADA" ? (
        <>
          <div
            className={cn(
              "flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between",
              accesoVigente ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30"
            )}
          >
            <div className="flex items-start gap-2.5">
              {accesoVigente ? (
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              ) : (
                <ShieldOff className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              )}
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">
                  {accesoVigente
                    ? `El equipo puede ver tus archivos hasta el ${importacion.accesoHasta}`
                    : "El equipo no puede ver tus archivos"}
                </span>
                <span className="text-xs text-muted-foreground">
                  Si no terminamos antes, se borran solos el {importacion.archivosVencenEl}.
                </span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start sm:self-center"
              disabled={ocupado}
              onClick={() => cambiarAcceso(accesoVigente ? "revocar" : "renovar")}
            >
              {accesoVigente ? "Quitar permiso" : `Dar permiso por ${IMPORTACION_ACCESO_HORAS} h`}
            </Button>
          </div>

          <ul className="flex flex-col divide-y divide-border/60 rounded-lg border border-border/60">
            {importacion.archivos.map((archivo) => (
              <li key={archivo.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{archivo.nombre}</span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {formatTamano(archivo.tamano)}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <p className="text-sm">
            Terminamos de cargar tus historias clínicas
            {importacion.cargadaEl ? ` el ${importacion.cargadaEl}` : ""} y ya borramos los archivos.
          </p>
          {importacion.notaEquipo && (
            <p className="text-sm whitespace-pre-line text-muted-foreground">{importacion.notaEquipo}</p>
          )}
          <p className="text-sm text-muted-foreground">Revisá tus pacientes y confirmanos que está todo bien.</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={ocupado}
              onClick={() => accion(`/api/importacion/${importacion.id}/confirmar`, { method: "POST" })}
            >
              <CheckCircle2 className="size-4" />
              Está todo bien
            </Button>
            <Button type="button" size="sm" variant="outline" nativeButton={false} render={<Link href="/soporte" />}>
              Algo no está bien
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-muted-foreground">Registro de accesos</span>
        <RegistroAccesos accesos={importacion.accesos} />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {importacion.estado === "ENVIADA" && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start text-muted-foreground"
          disabled={ocupado}
          onClick={() => setCancelarAbierto(true)}
        >
          Cancelar importación
        </Button>
      )}

      <Dialog open={cancelarAbierto} onOpenChange={setCancelarAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar importación</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Borramos tus archivos ahora y el equipo ya no podrá cargarlos. Lo que ya hayamos cargado en tu cuenta
            queda como está.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCancelarAbierto(false)}>
              Volver
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={ocupado}
              onClick={async () => {
                if (await accion(`/api/importacion/${importacion.id}`, { method: "DELETE" })) {
                  setCancelarAbierto(false);
                }
              }}
            >
              Cancelar importación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
