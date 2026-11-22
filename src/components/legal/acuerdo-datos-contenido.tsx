import type { ReactNode } from "react";
import {
  ACUERDO_DATOS_AVISO_DIAS,
  ACUERDO_DATOS_VERSION,
  ACUERDO_DATOS_VIGENTE_DESDE,
  CONTACTO_PRIVACIDAD,
} from "@/lib/acuerdo-datos";
import { IMPORTACION_ACCESO_HORAS, IMPORTACION_DIAS_ARCHIVOS } from "@/lib/importacion";
import { BAJA_DIAS_PARA_DESCARGAR, BAJA_DIAS_RESPALDOS } from "@/lib/baja-cuenta";

function Seccion({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-20 flex-col gap-2">
      <h2 className="mt-4 text-base font-semibold text-foreground">{titulo}</h2>
      {children}
    </section>
  );
}

function Lista({ children, ordenada = false }: { children: ReactNode; ordenada?: boolean }) {
  const className = `flex flex-col gap-1.5 pl-5 ${ordenada ? "list-decimal" : "list-disc"}`;
  return ordenada ? <ol className={className}>{children}</ol> : <ul className={className}>{children}</ul>;
}

// Acuerdo de tratamiento de datos (versión simple, aprobada el 22/11/2026).
// Lo usan la página pública /acuerdo-datos y el modal de la importación de
// HC. Los plazos salen de las mismas constantes que usa el código: si cambia
// uno, cambia el acuerdo (subir `ACUERDO_DATOS_VERSION` y avisar con
// `ACUERDO_DATOS_AVISO_DIAS` días). Sin hooks: sirve en server y client.
// TODO(legal): sumar razón social y CUIT (`TERMINOS_EMPRESA`) cuando estén.
export function AcuerdoDatosContenido() {
  return (
    <div className="flex flex-col gap-2 text-sm leading-relaxed text-foreground/90">
      <p className="text-xs text-muted-foreground">
        Semio360 · Versión {ACUERDO_DATOS_VERSION} · Vigente desde el {ACUERDO_DATOS_VIGENTE_DESDE}
      </p>
      <p>
        Los datos de tus pacientes son tuyos. Semio 360 los guarda y los procesa solo para que puedas
        usar la aplicación, y los cuida como pide la ley de protección de datos personales.
      </p>
      <p>Aceptás este acuerdo al registrarte y otra vez antes de importar tus historias clínicas.</p>

      <Seccion id="roles" titulo="1. Quién es quién">
        <Lista>
          <li>
            <strong>Vos, el profesional</strong>, sos el responsable de los datos de tus pacientes y de
            sus historias clínicas.
          </li>
          <li>
            <strong>Semio 360</strong> presta el servicio y trata los datos solo por tu cuenta y
            siguiendo tus indicaciones. No es dueño de esos datos.
          </li>
        </Lista>
      </Seccion>

      <Seccion id="uso" titulo="2. Qué hacemos con los datos y qué no">
        <p>
          Usamos los datos únicamente para que funcione Semio 360: agenda, historia clínica,
          controles, recordatorios y las funciones de IA que vos uses.
        </p>
        <p>Nunca vamos a:</p>
        <Lista>
          <li>
            vender, ceder o compartir los datos con terceros, salvo a los proveedores técnicos que
            necesitamos para funcionar o si lo ordena un juez;
          </li>
          <li>usarlos para entrenar inteligencia artificial, ni permitir que nuestros proveedores lo hagan;</li>
          <li>
            leer las historias clínicas. Nadie del equipo accede a ellas, salvo que vos lo autorices o
            haya que resolver una falla grave, y en ese caso te avisamos.
          </li>
        </Lista>
      </Seccion>

      <Seccion id="importacion" titulo="3. Importación de historias clínicas">
        <p>
          Si querés traer tus historias clínicas de otro sistema, planillas o documentos, nuestro
          equipo las carga por vos:
        </p>
        <Lista ordenada>
          <li>
            <strong>Subís los archivos solo desde Semio 360.</strong> No aceptamos archivos por mail,
            WhatsApp ni Drive. Si nos llegan por ahí, los borramos sin abrirlos.
          </li>
          <li>
            <strong>
              Al subirlos, nos das permiso para verlos durante {IMPORTACION_ACCESO_HORAS} horas
            </strong>
            , solo para cargarlos en tu cuenta. Podés quitar o renovar ese permiso desde la app, y
            queda registrado quién abrió cada archivo y cuándo.
          </li>
          <li>
            <strong>Los archivos se borran solos</strong> cuando terminamos la carga, o a los{" "}
            {IMPORTACION_DIAS_ARCHIVOS} días como máximo.
          </li>
          <li>
            <strong>Vos revisás lo cargado</strong> y nos confirmás desde la app que está bien.
          </li>
        </Lista>
        <p>
          Al importar, confirmás que los datos son de tus pacientes y que tenés derecho a usarlos. Si
          vienen de una clínica o institución, que tenés su autorización.
        </p>
      </Seccion>

      <Seccion id="seguridad" titulo="4. Cómo los protegemos">
        <p>
          Los datos viajan cifrados, cada profesional ve solo sus propios pacientes y tu asistente
          nunca ve historias clínicas. Registramos los accesos y mejoramos la seguridad de forma
          continua.
        </p>
      </Seccion>

      <Seccion id="incidentes" titulo="5. Si pasa algo">
        <p>
          Si hay un problema de seguridad que afecte tus datos, te avisamos dentro de las 48 horas: qué
          pasó, qué datos se vieron afectados y qué hicimos. Te ayudamos con los avisos que tengas que
          dar a tus pacientes o a las autoridades.
        </p>
        <p>Si un paciente nos pide algo sobre sus datos, te lo derivamos a vos, porque sos quien decide.</p>
      </Seccion>

      <Seccion id="baja" titulo="6. Si dejás de usar Semio 360">
        <p>
          Podés descargar tus datos cuando quieras. Si das de baja la cuenta, tenés{" "}
          {BAJA_DIAS_PARA_DESCARGAR} días para descargarlos. Después los borramos, y las copias de
          respaldo desaparecen en los {BAJA_DIAS_RESPALDOS} días siguientes.
        </p>
        <p>Recordá que las historias clínicas se deben conservar 10 años: guardá tu descarga.</p>
      </Seccion>

      <Seccion id="profesional" titulo="7. Lo que te toca a vos">
        <Lista>
          <li>Cargar solo datos de tus pacientes y que hayas obtenido en la atención.</li>
          <li>
            Cuidar tu contraseña y la de tu asistente, y avisarnos si creés que alguien más la conoce.
          </li>
          <li>
            Responder a los pedidos de tus pacientes sobre sus datos. La app te da las herramientas,
            como la descarga de la historia clínica.
          </li>
        </Lista>
        <p>
          Si incumplís estos puntos y eso genera un reclamo contra Semio 360, la responsabilidad es
          tuya.
        </p>
      </Seccion>

      <Seccion id="cambios" titulo="8. Cambios y contacto">
        <p>
          Si cambiamos este acuerdo, te avisamos con {ACUERDO_DATOS_AVISO_DIAS} días de anticipación.
          Si el cambio no te parece bien, podés darte de baja y llevarte tus datos.
        </p>
        <p>
          Para cualquier consulta sobre tus datos, escribinos a{" "}
          <a href={`mailto:${CONTACTO_PRIVACIDAD}`} className="font-medium text-primary underline underline-offset-2">
            {CONTACTO_PRIVACIDAD}
          </a>
          .
        </p>
      </Seccion>
    </div>
  );
}
