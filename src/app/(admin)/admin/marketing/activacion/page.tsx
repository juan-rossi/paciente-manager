import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageEnter } from "@/components/page-transition";
import { verificarAdminEnPagina } from "@/lib/admin-page";
import { formatFechaCorta } from "@/lib/admin-metrics";
import { getResumenEngagement } from "@/lib/admin-engagement";
import { MAIL_ENGAGEMENT_LABELS, PACIENTES_PARA_ACTIVADO, type MailEngagementTipo } from "@/lib/engagement";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Cuándo sale cada mail (ver la secuencia en src/lib/engagement.ts).
const CUANDO: Record<MailEngagementTipo, string> = {
  CONFIGURAR_CONSULTORIO: "Día 2 · sin lugar u horarios",
  PRIMER_PACIENTE: "Día 4 · sin pacientes",
  FUNDADOR: "Día 6 · no activado",
  PRIMER_TURNO: "Día 10 (Premium 12) · con pacientes, sin turnos",
  PRIMER_DICTADO: "Premium, día 9 · con pacientes, sin dictar",
  SEGUIMIENTO: "Día 20 (Premium 15) · no activado",
  TRIAL_TERMINA_PRONTO: "7 días antes del fin · todos",
  TRIAL_TERMINA_MANANA: "1 día antes del fin · todos",
  TRIAL_VENCIDO: "3 días después del fin · no pagó",
};

function pct(n: number, total: number): string {
  return total > 0 ? `${Math.round((n / total) * 100)}%` : "—";
}

export default async function AdminActivacionPage() {
  await verificarAdminEnPagina();
  const data = await getResumenEngagement();
  const { config } = data;

  return (
    <PageEnter>
      <div className="flex flex-col gap-6">
        <Card className="py-0">
          <CardContent className="grid gap-5 p-5 sm:grid-cols-3">
            <Dato label="Estado">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                  config.enviando
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                )}
              >
                <span
                  className={cn("size-1.5 rounded-full", config.enviando ? "bg-emerald-500" : "bg-amber-500")}
                />
                {config.enviando ? "Enviando" : "Modo prueba"}
              </span>
            </Dato>
            <Dato label="Reciben los registrados desde">
              {config.desde ? formatFechaCorta(config.desde) : <span className="text-muted-foreground">Sin fecha de corte</span>}
            </Dato>
            <Dato label="Mail personal del fundador">
              {config.fundador ?? <span className="text-muted-foreground">Sin configurar (se saltea)</span>}
            </Dato>
            {!config.enviando && (
              <p className="text-xs leading-relaxed text-muted-foreground sm:col-span-3">
                En modo prueba el cron diario calcula a quién le mandaría cada mail, pero no manda ni guarda nada.
                Para activarlo hay que cargar <code>ENGAGEMENT_EMAILS=true</code> y{" "}
                <code>ENGAGEMENT_EMAILS_DESDE</code> en el entorno.
              </p>
            )}
          </CardContent>
        </Card>

        <section className="flex flex-col gap-3">
          <div>
            <h2 className="font-heading text-sm font-semibold">Embudo por semana de alta</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Activado = {PACIENTES_PARA_ACTIVADO}+ pacientes y al menos un turno o una evolución. Sin bonificados.
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Semana del</TableHead>
                <TableHead className="text-right">Registrados</TableHead>
                <TableHead className="text-right">Perfil listo</TableHead>
                <TableHead className="text-right">Con pacientes</TableHead>
                <TableHead className="text-right">Activados</TableHead>
                <TableHead className="text-right">Pagaron</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.cohortes.map((c) => (
                <TableRow key={c.desde.toISOString()} className="bg-white dark:bg-card">
                  <TableCell className="font-medium">{formatFechaCorta(c.desde)}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.registrados}</TableCell>
                  <Celda n={c.perfilListo} total={c.registrados} />
                  <Celda n={c.conPacientes} total={c.registrados} />
                  <Celda n={c.activados} total={c.registrados} />
                  <Celda n={c.pagaron} total={c.registrados} />
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        <section className="flex flex-col gap-3">
          <div>
            <h2 className="font-heading text-sm font-semibold">Mails de la secuencia</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Máximo uno cada 3 días; los de activación se cortan cuando el médico se activa.
              {data.bajas > 0 &&
                ` ${data.bajas} médico${data.bajas === 1 ? " se dio" : "s se dieron"} de baja de estos mails.`}
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mail</TableHead>
                <TableHead>Cuándo sale</TableHead>
                <TableHead className="text-right">Últimos 30 días</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Vista previa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.mails.map((m) => {
                const qs = `tipo=${m.tipo}${m.tipo === "PRIMER_DICTADO" ? "&plan=PREMIUM" : ""}`;
                return (
                  <TableRow key={m.tipo} className="bg-white dark:bg-card">
                    <TableCell className="font-medium">{MAIL_ENGAGEMENT_LABELS[m.tipo]}</TableCell>
                    <TableCell className="text-muted-foreground">{CUANDO[m.tipo]}</TableCell>
                    <TableCell className="text-right tabular-nums">{m.ultimos30}</TableCell>
                    <TableCell className="text-right tabular-nums">{m.total}</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-3 text-sm font-medium">
                        <a
                          href={`/api/admin/engagement/preview?${qs}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline"
                        >
                          Mail
                        </a>
                        <a
                          href={`/api/admin/engagement/preview?${qs}&formato=texto`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline"
                        >
                          Texto
                        </a>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </section>
      </div>
    </PageEnter>
  );
}

function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="text-sm font-medium">{children}</div>
    </div>
  );
}

function Celda({ n, total }: { n: number; total: number }) {
  return (
    <TableCell className="text-right tabular-nums">
      {n}
      <span className="ml-1.5 text-xs text-muted-foreground">{pct(n, total)}</span>
    </TableCell>
  );
}
