interface TermsProps {
  onBack: () => void;
}

export function Terms({ onBack }: TermsProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#8B4513] via-[#A0522D] to-[#654321] p-4">
      <div className="max-w-3xl mx-auto pt-4 pb-12">
        <button
          onClick={onBack}
          className="mb-6 px-4 py-2 text-sm font-semibold text-[#F5DEB3] border-2 border-[#D4AF37] rounded bg-[#654321] hover:bg-[#7d5a2e] transition-colors"
        >
          Volver
        </button>

        <div
          className="bg-[#8B4513] border-4 border-[#654321] rounded-lg p-6 sm:p-8 shadow-[0_10px_30px_rgba(0,0,0,0.7)]"
          style={{ background: "linear-gradient(135deg, #654321 0%, #8B4513 50%, #654321 100%)" }}
        >
          <div className="absolute -left-1 -top-1 h-8 w-8 border-l-4 border-t-4 border-[#D4AF37]"></div>
          <div className="absolute -right-1 -top-1 h-8 w-8 border-r-4 border-t-4 border-[#D4AF37]"></div>

          <h1
            className="text-3xl sm:text-4xl font-bold text-[#F5DEB3] text-center mb-8"
            style={{ fontFamily: "serif", textShadow: "3px 3px 0 #654321" }}
          >
            Terminos y Condiciones
          </h1>

          <div className="space-y-6 text-sm sm:text-base text-[#F5DEB3]/90 leading-relaxed" style={{ fontFamily: "serif" }}>

            <section>
              <h2 className="text-lg font-bold text-[#D4AF37] mb-2">1. Acceptacion de los Terminos</h2>
              <p>
                Al acceder, registrarse y/o utilizar la plataformaIntermedio Cards (en adelante, la Plataforma),
                el usuario (en adelante, el Usuario) declara haber leido, comprendido y aceptado íntegramente
                los presentes Terminos y Condiciones de Uso. En caso de no estar de acuerdo con la totalidad
                o parte de los mismos, el Usuario debera abstenerse de utilizar la Plataforma.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#D4AF37] mb-2">2. Naturaleza de la Plataforma</h2>
              <p>
                Intermedio Cards es una plataforma digital de entretenimiento que simula un juego de cartas
                tradicional español. La Plataforma NO constituye, ni debe interpretarse como, un juego de azar,
                apuesta, loteria, casino, ni actividad similar que involucre la posibilidad de obtener ganancias
                economicas a partir del riesgo o azar.
              </p>
              <p className="mt-2">
                Las fichas virtuales denominadas INT (en adelante, Fichas) son elementos digitales sin valor
                economico real, que no pueden ser canjeadas, transferidas, ni convertidas en dinero, bienes,
                servicios ni ningun tipo de beneficio economico fuera de la Plataforma. Las Fichas exclusivamente
                representan la participacion del Usuario en las partidas recreativas dentro de la Plataforma.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#D4AF37] mb-2">3. Compra de Fichas Virtuales</h2>
              <p>
                La Plataforma ofrece la posibilidad de adquirir Fichas virtuales (INT) mediante el pago de un
                monto en pesos argentinos (ARS) a traves de la plataforma de cobros Mercado Pago. La compra
                de Fichas implica el reconocimiento expreso de que:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li>Las Fichas son productos digitales de entretenimiento, no instrumentos financieros.</li>
                <li>El precio de cada paquete de Fichas es equivalente a su valor nominal en pesos argentinos (1 ARS = 1 INT).</li>
                <li>La compra de Fichas no genera derecho a devolucion, reembolso ni compensacion, salvo en los casos
                  previstos por la normativa vigente de defensa del consumidor.</li>
                <li>Las Fichas adquiridas son de uso personal e intransferible del Usuario.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#D4AF37] mb-2">4. Ausencia de Ganancias Economicas</h2>
              <p>
                La Plataforma NO ofrece ni garantiza la posibilidad de obtener ganancias economicas, premios,
                recompensas ni beneficios de ningun tipo, ya sea en dinero, bienes o servicios, a partir de
                la utilizacion de las Fichas o la participacion en partidas. El resultado de cada partida esta
                determinado exclusivamente por las reglas del juego y la interaccion entre los participantes,
                sin que exista componente de azar que permita la obtencion de beneficios economicos.
              </p>
              <p className="mt-2">
                Queda expresamente prohibido por parte de los Usuarios la compraventa, permuta, transferencia
                o intercambio de Fichas o saldos virtuales fuera de los canales oficiales de la Plataforma,
                asi como cualquier intento de monetizacion de los resultados obtenidos dentro de la misma.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#D4AF37] mb-2">5. Elegibilidad y Responsabilidades</h2>
              <p>
                El uso de la Plataforma esta reservado a personas humanas mayores de dieciocho (18) anos de edad
                o mayores de edad segun la legislacion aplicable en su jurisdiccion. El Usuario es responsable
                del uso que realice de la Plataforma y se obliga a cumplir con todas las leyes y regulaciones
                aplicables en su jurisdiccion.
              </p>
              <p className="mt-2">
                La Plataforma no se hace responsable por el uso indebido que los Usuarios puedan realizar de
                la misma, ni por los perjuicios que pudieran derivarse de dicho uso.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#D4AF37] mb-2">6. Proteccion de Datos Personales</h2>
              <p>
                Los datos personales proporcionados por los Usuarios seran tratados de conformidad con la
                Ley N. 25.326 de Proteccion de Datos Personales (Argentina) y su reglamentacion. La informacion
                recopilada sera utilizada exclusivamente para el funcionamiento de la Plataforma y no sera
                compartida con terceros sin el consentimiento previo del Usuario, salvo disposicion legal en
                contrario.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#D4AF37] mb-2">7. Limitacion de Responsabilidad</h2>
              <p>
                Los propietarios, desarrolladores y operadores de la Plataforma no asumen responsabilidad
                alguna por:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                <li>Interrupciones, errores, fallos o indisponibilidades temporales de la Plataforma.</li>
                <li>Perdida de datos, Fichas virtuales o progreso de partidas por causas ajenas a la Plataforma.</li>
                <li>Uso indebido o no autorizado de la Plataforma por parte de los Usuarios.</li>
                <li>Contenidos, productos o servicios ofrecidos por terceros accesibles desde la Plataforma.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#D4AF37] mb-2">8. Modificaciones</h2>
              <p>
                Los operadores de la Plataforma se reservan el derecho de modificar, actualizar o complementar
                los presentes Terminos y Condiciones en cualquier momento y sin previo aviso. Las modificaciones
                seran efectivas a partir de su publicacion en la Plataforma. El uso continuado de la Plataforma
                despues de dichas modificaciones constituye la aceptacion de las mismas.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#D4AF37] mb-2">9. Ley Aplicable y Jurisdiccion</h2>
              <p>
                Los presentes Terminos y Condiciones se rigen por las leyes de la Republica Argentina.
                Cualquier controversia derivada de la interpretacion o aplicacion de los mismos sera sometida
                a los tribunales competentes de la Ciudad Autonoma de Buenos Aires, Republica Argentina,
                renunciando expresamente a cualquier otro fuero que pudiere corresponderles.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#D4AF37] mb-2">10. Disposiciones Finales</h2>
              <p>
                Si cualquier clausula de los presentes Terminos y Condiciones fuere declarada nula o inaplicable,
                las demas clausulas mantendran plena vigencia y efecto. La renuncia de cualquiera de las partes
                a hacer valer algun derecho o disposicion no constituye una renuncia a dicho derecho o disposicion
                en el futuro.
              </p>
              <p className="mt-2">
                Los presentes Terminos y Condiciones constituyen el acuerdo integral entre el Usuario y los
                operadores de la Plataforma respecto al uso de la misma, y reemplazan cualquier acuerdo previo
                o simultaneo sobre el mismo objeto.
              </p>
            </section>

            <p className="text-center text-[#D2B48C] text-xs mt-8 pt-4 border-t border-[#D4AF37]/30">
              Ultima actualizacion: Junio 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
