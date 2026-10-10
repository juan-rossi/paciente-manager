"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ObraSocialSelect } from "@/components/obra-social-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DNI_REGEX } from "@/lib/dni";
import { filterTelefono } from "@/lib/utils";
import type { BloqueDelDia } from "@/lib/bloques-dia";
import type { LugarInfo, Slot } from "./types";
import { formatHora, lugarNombre } from "./utils";
import type { SobreturnoState } from "./use-sobreturno";

// Diálogo "Agregar sobreturno".
export function SobreturnoDialog({ state, selectedDate, prepagas, bloques, lugaresPorId }: {
  state: SobreturnoState;
  selectedDate: Date;
  prepagas: string[];
  bloques: BloqueDelDia<Slot>[];
  lugaresPorId: Map<string, LugarInfo>;
}) {
  const {
    sobreturnoOpen,
    setSobreturnoOpen,
    sobreturnoBloqueKey,
    sobreturnoModo,
    setSobreturnoModo,
    sobreturnoTurnoId,
    setSobreturnoTurnoId,
    sobreturnoNombre,
    setSobreturnoNombre,
    sobreturnoDni,
    setSobreturnoDni,
    sobreturnoTelefono,
    setSobreturnoTelefono,
    sobreturnoObraSocial,
    setSobreturnoObraSocial,
    sobreturnoSaving,
    sobreturnoError,
    sobreturnoTriedSubmit,
    ultimoSlotDelBloque,
    elegirBloqueSobreturno,
    handleSubmitSobreturno,
    bloqueSobreturno,
    ocupadosBloqueSobreturno,
  } = state;

  return (
    <>
      <Dialog open={sobreturnoOpen} onOpenChange={(open) => !open && setSobreturnoOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar sobreturno</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <Label>Día</Label>
              <strong className="text-sm">{selectedDate.toLocaleDateString("es-AR")}</strong>
            </div>

            {bloques.length > 1 && (
              <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/50 p-3">
                <Label>¿En qué bloque de horario?</Label>
                <RadioGroup
                  value={sobreturnoBloqueKey}
                  onValueChange={(v) => elegirBloqueSobreturno(v ?? "")}
                  className="flex flex-col gap-2.5"
                >
                  {bloques.map((bloque) => (
                    <div key={bloque.key} className="flex items-center gap-2">
                      <RadioGroupItem value={bloque.key} id={`sobreturno-bloque-${bloque.key}`} />
                      <Label
                        htmlFor={`sobreturno-bloque-${bloque.key}`}
                        className="font-normal"
                      >
                        {lugarNombre(lugaresPorId.get(bloque.lugarId))}
                        <span className="text-muted-foreground">
                          {" "}
                          · {formatHora(bloque.inicio)} a {formatHora(bloque.fin)}
                        </span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/50 p-3">
              <Label>¿Cuándo?</Label>
              <RadioGroup
                value={sobreturnoModo}
                onValueChange={(v) => setSobreturnoModo(v as "hora" | "final")}
                className="flex flex-row flex-wrap items-center gap-x-6 gap-y-2"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem
                    value="hora"
                    id="sobreturno-modo-hora"
                    disabled={ocupadosBloqueSobreturno.length === 0}
                  />
                  <Label htmlFor="sobreturno-modo-hora" className="font-normal">
                    Junto a un turno
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem
                    value="final"
                    id="sobreturno-modo-final"
                    disabled={!ultimoSlotDelBloque(bloqueSobreturno)}
                  />
                  <Label htmlFor="sobreturno-modo-final" className="font-normal">
                    Al final de este bloque
                  </Label>
                </div>
              </RadioGroup>
              {sobreturnoModo === "hora" && (
                <Select
                  value={sobreturnoTurnoId}
                  onValueChange={(v) => setSobreturnoTurnoId(v ?? "")}
                >
                  <SelectTrigger className="w-full bg-card">
                    <SelectValue>
                      {(id: string) => {
                        const slot = ocupadosBloqueSobreturno.find((s) => s.turno!.id === id);
                        return slot
                          ? `${formatHora(slot.inicio)} - ${slot.turno!.nombreYApellido}`
                          : "Elegir turno...";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ocupadosBloqueSobreturno.map((slot) => (
                      <SelectItem key={slot.turno!.id} value={slot.turno!.id}>
                        {formatHora(slot.inicio)} - {slot.turno!.nombreYApellido}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <hr className="mt-2 mb-2" />
            <div className="flex flex-col gap-1.5">
              <Label>Nombre completo *</Label>
              <Input
                value={sobreturnoNombre}
                onChange={(e) => setSobreturnoNombre(e.target.value)}
                className={
                  sobreturnoTriedSubmit && !sobreturnoNombre.trim()
                    ? "border-destructive"
                    : undefined
                }
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>DNI *</Label>
                <Input
                  inputMode="numeric"
                  maxLength={8}
                  value={sobreturnoDni}
                  onChange={(e) => setSobreturnoDni(e.target.value.replace(/\D/g, ""))}
                  className={
                    sobreturnoTriedSubmit && !DNI_REGEX.test(sobreturnoDni)
                      ? "border-destructive"
                      : undefined
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Teléfono *</Label>
                <Input
                  inputMode="numeric"
                  value={sobreturnoTelefono}
                  onChange={(e) => setSobreturnoTelefono(filterTelefono(e.target.value))}
                  className={
                    sobreturnoTriedSubmit && !sobreturnoTelefono.trim()
                      ? "border-destructive"
                      : undefined
                  }
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Obra Social</Label>
              <ObraSocialSelect
                value={sobreturnoObraSocial}
                onChange={setSobreturnoObraSocial}
                prepagas={prepagas}
              />
            </div>
            {sobreturnoError && <p className="text-sm text-destructive">{sobreturnoError}</p>}
          </div>
          <DialogFooter>
            <Button type="button" onClick={handleSubmitSobreturno} disabled={sobreturnoSaving}>
              {sobreturnoSaving ? "Agregando..." : "Agregar sobreturno"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
