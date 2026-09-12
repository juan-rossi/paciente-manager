"use client";

import { Download, Mic, MicOff, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SettingsSection } from "@/components/settings-section";
import { useTranscriberConnection } from "@/lib/transcriber";

const TRANSCRIBER_DOWNLOAD_URL =
  "https://github.com/juan-rossi/malvina-software-releases/releases/download/transcriptor-v1.0.0/TranscriberSetup.exe";

export function TranscriberSettings() {
  const { status, reintentar } = useTranscriberConnection();

  return (
    <SettingsSection
      title="Transcriptor de audio"
      description="Dicta la evolución clínica en vivo mientras atendés al paciente, en vez de tipearla."
      icon={Mic}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          {status === "disponible" && (
            <Badge variant="secondary">
              <Mic className="size-3" />
              Transcriptor conectado
            </Badge>
          )}
          {status === "no_disponible" && (
            <Badge variant="outline">
              <MicOff className="size-3" />
              Transcriptor no detectado
            </Badge>
          )}
          {status === "verificando" && (
            <Badge variant="outline">Verificando…</Badge>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={reintentar}>
            <RefreshCw className="size-3.5" />
            Volver a comprobar
          </Button>
        </div>

        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          <p>
            La transcripción de audio corre <strong>localmente, en tu computadora</strong>, en vez
            de mandar el audio a un servicio de IA en la nube. Esto evita un costo por cada minuto
            transcripto y mantiene el audio del consultorio sin salir de tu equipo.
          </p>
          <p>
            Para poder usarla, instalá el programa <strong>Transcriptor</strong>: es el servicio
            que queda escuchando en tu computadora y hace la transcripción cuando grabás una
            evolución. Se instala una sola vez, se abre solo cuando encendés la computadora, y
            mientras esté corriendo vas a ver acá arriba el indicador &quot;Transcriptor
            conectado&quot;.
          </p>
        </div>

        <Button
          className="self-start"
          nativeButton={false}
          render={<a href={TRANSCRIBER_DOWNLOAD_URL} target="_blank" rel="noreferrer" />}
        >
          <Download className="size-4" />
          Descargar Transcriptor
        </Button>
      </div>
    </SettingsSection>
  );
}
