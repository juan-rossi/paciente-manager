import { Database, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsSection } from "@/components/settings-section";

export function ExportSettings() {
  return (
    <SettingsSection
      title="Exportar mi historia clínica completa"
      description="Por la Ley 26.529 (art. 18), el depositario de la historia clínica sos vos, no Semio360. Si en algún momento dejás de usar la plataforma, descargá acá una copia completa de todos tus pacientes -- datos personales, antecedentes, evoluciones y consentimientos informados, incluidos los que hayas eliminado -- para seguir cumpliendo con tu obligación de guarda por 10 años, sin depender de este servicio."
      icon={Database}
    >
      <Button
        type="button"
        className="self-start"
        nativeButton={false}
        render={<a href="/api/account/export" />}
      >
        <Download className="size-4" />
        Descargar historia clínica completa
      </Button>
    </SettingsSection>
  );
}
