import type { ReactNode } from "react";
import { TERMINOS_EMPRESA, TERMINOS_VERSION, TERMINOS_VIGENTE_DESDE } from "@/lib/terminos";

function Seccion({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-20 flex-col gap-2">
      <h2 className="mt-4 text-base font-semibold text-foreground">{titulo}</h2>
      {children}
    </section>
  );
}

function Lista({ children }: { children: ReactNode }) {
  return <ul className="flex list-disc flex-col gap-1.5 pl-5">{children}</ul>;
}

// Texto legal completo. Lo usan la página pública /terminos y el modal del
// registro (src/app/signup/signup-form.tsx). Sin hooks, así funciona tanto en
// server como en client components.
export function TerminosContenido() {
  return (
    <div className="flex flex-col gap-2 text-sm leading-relaxed text-foreground/90">
      <p className="text-xs text-muted-foreground">
        Semio360 · Versión {TERMINOS_VERSION} · Vigente desde el {TERMINOS_VIGENTE_DESDE}
      </p>
      {/* <p>
        Estos términos regulan el uso de la plataforma Semio360 (semio360.com y semio360.com.ar),
        operada por {TERMINOS_EMPRESA.razonSocial}, CUIT {TERMINOS_EMPRESA.cuit}, con domicilio en{" "}
        {TERMINOS_EMPRESA.domicilio} (en adelante, &quot;Semio360&quot;). Quien crea una cuenta (en
        adelante, el &quot;Usuario&quot; o el &quot;Médico&quot;) los acepta en su totalidad.
      </p> */}

      <Seccion id="aceptacion" titulo="1. Aceptación">
        <p>
          Al crear una cuenta, ya sea con email y contraseña o con Google, y marcar las casillas de
          aceptación, el Usuario declara que leyó, entendió y acepta estos términos. Si no está de
          acuerdo, no debe usar la plataforma. Semio360 conserva constancia de la fecha y la versión
          aceptadas.
        </p>
      </Seccion>

      <Seccion id="servicio" titulo="2. Qué es Semio360 y qué no es">
        <p>
          Semio360 es una herramienta de gestión para consultorios: agenda de turnos, ficha e
          historia clínica digital, evolución, consentimientos informados, recordatorios,
          transcripción de audio y, en el plan Premium, funciones de inteligencia artificial.
        </p>
        <p className="font-medium">
          Semio360 no presta servicios médicos, no es un prestador de salud, no emite diagnósticos
          ni indicaciones terapéuticas, no es un dispositivo médico y no sustituye el juicio clínico
          del profesional. No está diseñada para emergencias ni para la comunicación urgente con
          pacientes.
        </p>
      </Seccion>

      <Seccion id="cuenta" titulo="3. Cuenta y habilitación profesional">
        <Lista>
          <li>
            El Usuario declara ser mayor de edad y profesional de la salud con matrícula vigente y
            habilitación para ejercer en la jurisdicción donde atiende. Se compromete a mantener esa
            condición mientras use el servicio.
          </li>
          <li>
            Los datos de registro (nombre, matrícula, especialidad, email) deben ser veraces y estar
            actualizados. Semio360 puede solicitar acreditación de la matrícula.
          </li>
          <li>
            Las credenciales son personales e intransferibles. El Usuario responde por toda
            actividad realizada con ellas y debe avisar de inmediato cualquier uso no autorizado.
          </li>
          <li>
            El Médico puede dar acceso a secretarias u otros colaboradores. Es responsable de
            elegirlos, de limitar sus permisos, de darlos de baja cuando corresponda y de que
            cumplan estos términos y el deber de confidencialidad.
          </li>
        </Lista>
      </Seccion>

      <Seccion id="responsabilidad-profesional" titulo="4. Responsabilidad profesional exclusiva del Médico">
        <p>El Médico es el único responsable de:</p>
        <Lista>
          <li>
            Sus diagnósticos, indicaciones, tratamientos y toda decisión clínica, aun cuando se
            apoye en información, resúmenes o sugerencias generados por la plataforma.
          </li>
          <li>
            El contenido, la exactitud, la integridad y la conservación de las historias clínicas
            que cargue, conforme a la Ley 26.529 y sus normas complementarias.
          </li>
          <li>
            Obtener, registrar y conservar el consentimiento informado de sus pacientes. Semio360
            ofrece una herramienta de registro; no recaba ni valida el consentimiento.
          </li>
          <li>Cumplir las normas de ética, de ejercicio profesional y de colegiación que le apliquen.</li>
        </Lista>
      </Seccion>

      <Seccion id="datos" titulo="5. Datos de pacientes y privacidad">
        <Lista>
          <li>
            <strong>Roles.</strong> Respecto de los datos de sus pacientes, el Médico es el
            responsable del tratamiento. Semio360 actúa como encargado: los almacena y procesa
            únicamente para prestar el servicio y siguiendo las instrucciones del Médico, y no los
            usa para fines propios ni los vende.
          </li>
          <li>
            <strong>Base legal.</strong> El Médico garantiza que cuenta con las autorizaciones y
            bases legales necesarias para cargar datos de salud, que son datos sensibles según la Ley
            25.326, y que informa a sus pacientes sobre el uso de un sistema digital.
          </li>
          <li>
            <strong>Seguridad.</strong> Semio360 aplica medidas técnicas y organizativas razonables:
            aislamiento de datos por Médico, roles diferenciados, registro de auditoría de altas,
            ediciones y bajas, y copias de respaldo. Ningún sistema es invulnerable y Semio360 no
            garantiza ausencia total de incidentes. Ante una violación de seguridad que afecte datos
            personales, notificará al Médico sin demora indebida.
          </li>
          <li>
            <strong>Conservación.</strong> La historia clínica debe conservarse por el plazo legal
            vigente. Antes de dar de baja la cuenta, el Médico debe exportar o resguardar la
            información que la ley le obliga a conservar. Semio360 podrá eliminar los datos
            transcurrido un plazo razonable desde la baja, previo aviso.
          </li>
          <li>
            <strong>Pedidos de los pacientes.</strong> El Médico atiende los pedidos de acceso,
            rectificación o supresión de sus pacientes. Semio360 colabora dentro de lo razonable.
          </li>
          <li>
            Semio360 trata los datos del propio Médico (cuenta, matrícula, facturación) solo para
            prestar el servicio y los comparte únicamente con los proveedores que lo hacen posible,
            como hosting y pagos.
          </li>
        </Lista>
      </Seccion>

      <Seccion id="uso-aceptable" titulo="6. Uso aceptable">
        <p>Queda prohibido:</p>
        <Lista>
          <li>
            Usar la plataforma para fines ilícitos, fraudulentos o contrarios a la ética
            profesional, incluido el ejercicio ilegal de la profesión o la emisión de documentación
            falsa.
          </li>
          <li>Cargar datos de personas sin autorización o sin vínculo asistencial con el Médico.</li>
          <li>
            Compartir cuentas, vender o ceder el acceso, o permitir que personas sin habilitación
            usen funciones clínicas.
          </li>
          <li>
            Intentar acceder a datos de otros Médicos, vulnerar la seguridad, hacer ingeniería
            inversa, extraer datos de forma masiva o automatizada, o sobrecargar el servicio.
          </li>
          <li>Subir malware o contenido ilícito, ofensivo o que infrinja derechos de terceros.</li>
          <li>
            Usar las funciones de IA para tomar decisiones clínicas sin verificación profesional, o
            para entrenar otros modelos.
          </li>
        </Lista>
      </Seccion>

      <Seccion id="ia" titulo="7. Inteligencia artificial (plan Premium)">
        <Lista>
          <li>
            Los resúmenes y autocompletados se generan con modelos de IA y pueden contener errores,
            omisiones o información inventada.
          </li>
          <li>
            Son sugerencias de apoyo.{" "}
            <strong>
              Antes de incorporar cualquier texto generado a la historia clínica, el Médico debe
              revisarlo, corregirlo y asumirlo como propio.
            </strong>
          </li>
          <li>
            Para generar el resultado, el contenido que el Médico envíe a estas funciones se procesa
            mediante proveedores tecnológicos externos, que lo reciben solo para prestar la función.
            Semio360 no garantiza que el resultado sea exacto, completo ni apto para un fin
            determinado.
          </li>
          <li>
            El Médico se compromete a no incluir datos que no sean necesarios y a informar a sus
            pacientes cuando corresponda.
          </li>
        </Lista>
      </Seccion>

      <Seccion id="transcripcion" titulo="8. Transcripción de audio">
        <p>
          El transcriptor es un programa opcional que se instala y se ejecuta en la computadora del
          Médico: el audio se procesa localmente y no se envía a Semio360. El Médico es responsable
          de su equipo, de su red local, de la seguridad de ese dispositivo y de obtener el
          consentimiento del paciente para registrar su voz cuando sea necesario. La transcripción
          puede contener errores y debe revisarse antes de guardarla.
        </p>
      </Seccion>

      <Seccion id="turnos" titulo="9. Turnos y comunicaciones con pacientes">
        <Lista>
          <li>
            Los recordatorios y mensajes se redactan y envían bajo la responsabilidad del Médico,
            hoy mediante WhatsApp u otros medios de su elección. Semio360 no garantiza que el
            paciente reciba, lea o responda un mensaje.
          </li>
          <li>
            El Médico debe contar con la autorización del paciente para contactarlo y no usar los
            mensajes con fines publicitarios sin su consentimiento.
          </li>
          <li>
            Semio360 no responde por turnos perdidos, superposiciones o ausencias derivadas de
            errores de configuración, de datos mal cargados o de fallas de terceros.
          </li>
        </Lista>
      </Seccion>

      <Seccion id="perfil-publico" titulo="10. Perfil público y reserva de turnos">
        <p>
          Si el Médico activa su perfil en el directorio o la reserva pública, es responsable de la
          veracidad de lo que publica (matrícula, especialidad, dirección, fotografía, biografía) y
          del cumplimiento de las normas de publicidad médica. Semio360 puede retirar contenido que
          sea falso, engañoso o contrario a estos términos. Los datos que un paciente ingrese al
          reservar son tratados por el Médico como responsable.
        </p>
      </Seccion>

      <Seccion id="planes" titulo="11. Planes, pagos y cancelación">
        <Lista>
          <li>
            <strong>Prueba gratuita.</strong> El plan Básico incluye 60 días de prueba sin tarjeta.
            El plan Premium no incluye período de prueba.
          </li>
          <li>
            <strong>Precios y pagos.</strong> Los precios se informan en pesos argentinos e incluyen
            los impuestos que correspondan. Los pagos se procesan por Mercado Pago, sujeto a sus
            propios términos. Semio360 no almacena los datos de la tarjeta.
          </li>
          <li>
            <strong>Renovación.</strong> Las suscripciones mensuales se renuevan automáticamente
            hasta que el Usuario las cancele desde Configuración. Los pagos únicos por períodos más
            largos no se renuevan solos.
          </li>
          <li>
            <strong>Cancelación.</strong> Puede cancelarse en cualquier momento y el servicio sigue
            hasta el fin del período ya pagado. Salvo disposición legal en contrario, no se
            reembolsan períodos ya iniciados.
          </li>
          <li>
            <strong>Falta de pago.</strong> Si un pago falla, la cuenta pasa por un período de
            gracia de 5 días. Vencido, el acceso puede quedar suspendido. Los datos se conservan por
            un plazo razonable para que el Médico pueda exportarlos o reactivar.
          </li>
          <li>
            <strong>Cambio de plan.</strong> Pasar de Básico a Premium puede generar un cobro por la
            diferencia proporcional al tiempo restante.
          </li>
          <li>
            <strong>Arrepentimiento.</strong> Si el Usuario califica como consumidor, puede ejercer
            el derecho de revocar la contratación dentro de los 10 días corridos desde la
            contratación, a través del contacto indicado abajo.
          </li>
          <li>
            Semio360 puede modificar los precios con aviso previo de 30 días. El cambio aplica desde
            la siguiente renovación.
          </li>
        </Lista>
      </Seccion>

      <Seccion id="responsabilidad" titulo="12. Disponibilidad, garantías y límite de responsabilidad">
        <Lista>
          <li>
            El servicio se brinda &quot;tal como está&quot; y según disponibilidad. Semio360
            procura alta disponibilidad, pero no garantiza un funcionamiento ininterrumpido ni libre
            de errores, y puede realizar mantenimientos, con aviso cuando sea posible.
          </li>
          <li>
            Semio360 no responde por fallas de internet, del equipo del Usuario, de proveedores
            externos (hosting, pagos, mensajería, IA) ni por fuerza mayor.
          </li>
          <li>
            El Médico debe mantener sus propios respaldos de la información crítica y un plan de
            contingencia para atender si la plataforma no estuviera disponible.
          </li>
          <li>
            Dentro de lo que la ley permite, Semio360 no responde por daños indirectos, lucro
            cesante, pérdida de oportunidades, pérdida de pacientes, daño reputacional ni por
            reclamos de pacientes o terceros derivados de la atención médica.
          </li>
          <li>
            Si Semio360 fuera declarada responsable, su responsabilidad total frente al Usuario se
            limita al monto efectivamente abonado por este en los 12 meses anteriores al hecho.
          </li>
          <li>
            Nada de lo aquí dispuesto limita la responsabilidad que no pueda excluirse por ley, como
            la derivada de dolo.
          </li>
        </Lista>
      </Seccion>

      <Seccion id="indemnidad" titulo="13. Indemnidad">
        <p>
          El Usuario mantendrá indemne a Semio360, sus socios, empleados y proveedores frente a
          reclamos, daños, multas y gastos (incluidos honorarios razonables) originados en: la
          atención médica que brinde, el contenido que cargue, el incumplimiento de estos términos o
          de la ley, o el uso indebido de su cuenta por él o por quienes autorice. Semio360
          notificará el reclamo y colaborará razonablemente en la defensa.
        </p>
      </Seccion>

      <Seccion id="propiedad-intelectual" titulo="14. Propiedad intelectual">
        <p>
          La plataforma, su software, diseño, marcas y documentación son de Semio360 o de sus
          licenciantes. Se otorga al Usuario una licencia limitada, revocable, no exclusiva e
          intransferible para usarla durante la vigencia de su cuenta. Los datos y contenidos que el
          Médico carga siguen siendo suyos; le otorga a Semio360 la licencia necesaria para
          alojarlos, procesarlos y mostrarlos con el único fin de prestar el servicio.
        </p>
      </Seccion>

      <Seccion id="baja" titulo="15. Baja y suspensión">
        <Lista>
          <li>El Usuario puede dar de baja su cuenta en cualquier momento.</li>
          <li>
            Semio360 puede suspender o cancelar la cuenta, con o sin aviso previo según la
            gravedad, ante incumplimiento de estos términos, uso fraudulento, falta de pago,
            matrícula inválida u orden de autoridad competente.
          </li>
          <li>
            Tras la baja, el Médico conserva la obligación legal de guardar las historias clínicas.
            Corresponde que las exporte antes de que se eliminen.
          </li>
          <li>
            Subsisten las cláusulas que por su naturaleza deban continuar: responsabilidad,
            indemnidad, propiedad intelectual, ley aplicable.
          </li>
        </Lista>
      </Seccion>

      <Seccion id="cambios" titulo="16. Cambios en los términos">
        <p>
          Semio360 puede actualizar estos términos. Los cambios sustanciales se avisan por email o
          dentro de la plataforma con al menos 15 días de anticipación. Si el Usuario sigue usando el
          servicio después de esa fecha, o si se le pide aceptar la nueva versión y lo hace, se
          entiende que la acepta. Si no está de acuerdo, puede dar de baja la cuenta.
        </p>
      </Seccion>

      <Seccion id="ley" titulo="17. Ley aplicable y jurisdicción">
        <p>
          Estos términos se rigen por las leyes de la República Argentina. Para cualquier
          controversia, las partes se someten a los Tribunales Ordinarios de la Ciudad Autónoma de
          Buenos Aires, sin perjuicio de los derechos que la ley reconozca al Usuario consumidor para
          demandar en su domicilio. Antes de iniciar acciones, las partes intentarán resolver el
          conflicto de buena fe por el contacto indicado abajo.
        </p>
      </Seccion>

      <Seccion id="contacto" titulo="18. Contacto">
        <p>
          Consultas, reclamos, ejercicio de derechos y notificaciones: contacto@semio360.com. Si
          alguna cláusula resulta inválida, las demás siguen vigentes. Estos términos son el acuerdo
          completo entre las partes sobre el uso de la plataforma.
        </p>
      </Seccion>
    </div>
  );
}
