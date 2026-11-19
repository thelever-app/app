import type { OwnPage } from '../site-texts.ts';

const UPDATED = '19 de noviembre de 2026';

/** The terms of use of the app, version 1, which the first access asks to accept. */
export const terms: OwnPage = {
  title: 'Condiciones de uso',
  description:
    'Las condiciones para jugar a TheLever: quién puede jugar, cómo funciona y qué normas hay.',
  updated: UPDATED,
  sections: [
    {
      heading: 'Quién presta el servicio',
      paragraphs: [
        'TheLever es un servicio de {owner}. Sus datos completos están en el aviso legal. Para cualquier cosa, escribe a privacidad@thelever.app: respondemos en español y en inglés.',
      ],
    },
    {
      heading: 'Qué es TheLever',
      paragraphs: [
        'TheLever es un juego gratuito para jugar en grupo a dilemas morales desde el navegador. Se paga con anuncios. Al aceptar estas condiciones aceptas un acuerdo con nosotros; cómo tratamos tus datos lo explica la política de privacidad de la app.',
      ],
    },
    {
      heading: 'Quién puede jugar',
      paragraphs: [
        'Tienes que tener al menos 16 años si estás en el Espacio Económico Europeo y 18 si estás en otro sitio. Declarar una edad falsa incumple estas condiciones.',
        'TheLever no está disponible en algunos países: los sujetos a sanciones de la Unión Europea que alcanzan a todo el país, Rusia, China, Brasil y, por ahora, el Reino Unido.',
        'Juegas sin cuenta, con un identificador anónimo de tu dispositivo. Eres responsable de lo que se haga desde él.',
      ],
    },
    {
      heading: 'Cómo funciona el juego',
      paragraphs: [
        'En cada sala, el grupo responde los mismos dilemas a la vez y descubre el resultado de cada uno. En una sala nominal, todos ven lo que votó cada uno; en una sala anónima, solo cuántos eligieron cada opción. Lo que respondes en una partida se borra antes de 24 horas desde que se cierra la sala.',
        'Los dilemas pueden tratar temas duros. Los dilemas +18 solo se juegan en salas con dilemas +18, en las que solo pueden entrar mayores de 18. Los dilemas comprometidos, cuya respuesta sincera puede dejarte en evidencia ante alguien de la sala, solo se juegan en salas anónimas y si quien la organiza los activa.',
      ],
    },
    {
      heading: 'Normas',
      paragraphs: [
        'Al usar TheLever te comprometes a no usar apodos con contenido ilegal, de odio, de acoso o que humillen a nadie, ni con datos de otras personas; a no intentar averiguar lo que votó cada uno en una sala anónima; y a no usar programas automáticos, saturar el servicio, saltarte las restricciones de edad o de país, ni acceder a datos o partes del sistema que no son para ti.',
      ],
    },
    {
      heading: 'Moderación y denuncias',
      paragraphs: [
        'Cualquier jugador puede reportar un dilema desde la partida, y lo revisa nuestro equipo. Si incumples estas condiciones, podemos sustituir tu apodo por uno genérico o impedirte el acceso, y te diremos el motivo, los hechos, la norma aplicada y cómo reclamar.',
        'Cualquier persona, juegue o no, puede denunciar contenido ilegal escribiendo a privacidad@thelever.app, que es también el punto de contacto para las autoridades.',
      ],
    },
    {
      heading: 'Anuncios',
      paragraphs: [
        'TheLever muestra anuncios, nunca mientras votas, y los anuncios nunca reciben nada de lo que votas. Solo se personalizan para mayores de 18 que lo aceptan en el gestor de cookies y cuyo navegador no envía la señal Global Privacy Control. No respondemos del contenido de los anuncios ni de las webs a las que llevan, pero puedes avisarnos de cualquier anuncio inapropiado.',
      ],
    },
    {
      heading: 'Lo que es nuestro',
      paragraphs: [
        'El nombre y la marca TheLever, su diseño y los dilemas que escribe nuestro equipo son nuestros, salvo que se indique otra licencia. El código de la app es abierto, con licencia AGPL-3.0, en github.com/thelever-app. Los avatares se generan con DiceBear.',
      ],
    },
    {
      heading: 'Disponibilidad y responsabilidad',
      paragraphs: [
        'TheLever es gratuito y se ofrece tal cual. Intentamos que funcione bien, pero puede tener fallos o interrupciones, y podemos cambiar, pausar o cerrar el servicio, avisándote con antelación razonable si es un cierre.',
        'No respondemos de los daños que no se deban a nuestro dolo o culpa grave, en la medida en que la ley lo permita. Nada de esto limita los derechos que te reconoce la ley de consumidores. Eres responsable de los apodos que uses.',
      ],
    },
    {
      heading: 'Dejar de jugar',
      paragraphs: [
        'Puedes dejar de usar TheLever cuando quieras y pedirnos que borremos tus datos escribiendo a privacidad@thelever.app. Si incumples estas condiciones de forma grave o repetida, podemos impedirte el acceso, con la motivación del apartado de moderación.',
      ],
    },
    {
      heading: 'Cambios en estas condiciones',
      paragraphs: [
        'Si las cambiamos de forma importante, te lo diremos en la app y tendrás que aceptarlas de nuevo antes de seguir jugando. Si no las aceptas, puedes pedirnos que borremos tus datos.',
      ],
    },
    {
      heading: 'Ley aplicable',
      paragraphs: [
        'Estas condiciones se rigen por la ley española. Si eres consumidor, puedes reclamar ante los tribunales de tu domicilio y conservas la protección de las normas de consumo de tu país. Versión 1.',
      ],
    },
  ],
};

/** The privacy policy of the app, which the game consent links to. */
export const appPrivacy: OwnPage = {
  title: 'Privacidad de la app',
  description:
    'Qué datos trata la app de TheLever para jugar, con qué base, cuánto tiempo y cuáles son tus derechos.',
  updated: UPDATED,
  sections: [
    {
      heading: 'Quién es el responsable',
      paragraphs: [
        'TheLever es un proyecto de {owner}. Para cualquier cosa sobre tus datos, escribe a privacidad@thelever.app. Respondemos en español y en inglés.',
      ],
    },
    {
      heading: 'Lo esencial',
      paragraphs: [
        'Jugar exige tu consentimiento explícito, porque lo que votas en dilemas morales puede revelar tus convicciones y, en algunos dilemas, algo de tu vida privada. Lo que respondes en una partida se borra antes de 24 horas desde que se cierra la sala. No usamos tus datos para investigación ni los vendemos a nadie, y los anuncios nunca reciben lo que votas.',
      ],
    },
    {
      heading: 'Qué datos tratamos, para qué y con qué base',
      paragraphs: [
        '- Para jugar, con tu consentimiento explícito (art. 6.1.a y 9.2.a RGPD): tu apodo y tu avatar; tus votos, tus predicciones del voto de los demás o del reparto del grupo, tus reacciones y tus puntos; si un dilema trataba sobre ti; el orden en que viste las opciones y cuánto tardaste en responder; y tus «Buen dilema», que se guardan aparte de la sala.',
        '- Para votar a solas un dilema de la web, con el mismo consentimiento: tu voto suma al resultado mundial sin que guardemos qué votaste, y queda solo una marca de que ya votaste ese dilema, para que no cuente dos veces.',
        '- Para no repetirte dilemas, con el mismo consentimiento: tu móvil guarda la lista de dilemas que has jugado, sin tus votos, y la envía al entrar en una sala, que solo la usa para preparar las partidas y la borra con la sala.',
        '- Para reconocerte, por las condiciones de uso (art. 6.1.b): un identificador anónimo de tu dispositivo y cuándo abriste la app por última vez.',
        '- Para cumplir la ley sobre la edad (art. 6.1.c): tu año de nacimiento y, si cumples 18 este año o después, el mes; y tu región (Espacio Económico Europeo, resto del mundo o país donde TheLever no está disponible), que deducimos de tu dirección IP con una base de datos en nuestro propio servidor, IP Geolocation by DB-IP (db-ip.com, licencia CC BY 4.0). TheLever no guarda tu IP; nuestro proveedor de acceso, Firebase Authentication (Google), la registra unas semanas por seguridad.',
        '- Para poder demostrar lo que aceptaste (art. 6.1.c y 7.1): qué versión de las condiciones y del consentimiento aceptaste y cuándo.',
        '- Para los anuncios, con tu consentimiento (art. 6.1.a RGPD y art. 22.2 LSSI): las cookies e identificadores de la red publicitaria, según lo que elijas en el gestor de cookies de Google.',
        '- Para moderar (obligación legal del Reglamento de Servicios Digitales e interés legítimo en un servicio seguro, art. 6.1.c y 6.1.f): el dilema que reportas, el motivo y tu comentario, sin decir a nadie del grupo que lo reportaste.',
        '- Para atender tus peticiones (art. 6.1.c): tu email y lo que nos pidas.',
      ],
    },
    {
      heading: 'Qué ve tu grupo',
      paragraphs: [
        'En una sala nominal, tu grupo ve en la revelación lo que votaste, cuántos acertaron tu voto y tus reacciones, y al final tu puesto y los títulos de la partida, que salen de los votos, las predicciones y las reacciones. En una sala anónima, nadie ve tu voto ni tu predicción: solo cuántos eligieron cada opción y, si votaron menos de 3 personas, ni eso. Al votar a solas, nadie ve tu voto: solo el recuento mundial, sin nombres, desde 20 respuestas.',
        'Cualquier jugador puede compartir fuera de la sala una tarjeta con el resultado: la personal no muestra los apodos de los demás salvo que quien la comparte lo elija, y la del grupo solo muestra el reparto, sin nombres.',
      ],
    },
    {
      heading: 'Menores',
      paragraphs: [
        'Para jugar hay que tener al menos 16 años en el Espacio Económico Europeo y 18 en el resto del mundo. Los jugadores de 16 y 17 años solo juegan dilemas aptos para su edad, no entran en salas con dilemas +18 y sus anuncios nunca se personalizan. Si la edad que declaras no llega a la mínima, solo guardamos tu año de nacimiento, el mes si lo diste, tu región y cuándo abriste la app por última vez, para que no puedas jugar en ese dispositivo, y lo borramos tras 24 meses sin abrir la app. Si sabemos por otra vía que alguien no tiene la edad mínima, borramos sus datos.',
      ],
    },
    {
      heading: 'Decisiones automáticas',
      paragraphs: [
        'La app no te deja jugar si la edad que declaras no llega a la mínima de tu región o si estás en un país donde no está disponible. Si crees que es un error, escríbenos y lo revisará una persona. No tomamos ninguna otra decisión automática sobre ti.',
      ],
    },
    {
      heading: 'Con quién compartimos tus datos',
      paragraphs: [
        'No vendemos tus datos. Los tratan por nuestra cuenta, con contrato y solo para prestar el servicio: Google Cloud y Firebase (Google), que alojan la app, su base de datos y el acceso; y Hostinger, que aloja nuestro correo. El gestor de cookies es de Google, y la red publicitaria y sus socios tratan sus cookies como responsables por su cuenta, solo si lo aceptas. También podemos tener que dar datos a las autoridades cuando la ley nos obligue.',
        'Si TheLever cambia de titular, por ejemplo al pasar a una sociedad, tus datos pasarán al nuevo titular para seguir prestándote el mismo servicio, con las mismas finalidades y garantías (art. 21 de la LOPDGDD). Te avisaremos en la app antes del cambio y podrás pedir que los borremos antes.',
      ],
    },
    {
      heading: 'Transferencias fuera del Espacio Económico Europeo',
      paragraphs: [
        'Google puede tratar datos en Estados Unidos, amparado en el Marco de Privacidad de Datos UE-EE. UU. y en las cláusulas contractuales tipo de la Comisión Europea.',
      ],
    },
    {
      heading: 'Cuánto tiempo guardamos tus datos',
      paragraphs: [
        '- Lo que respondes en una partida: menos de 24 horas desde que se cierra la sala.',
        '- Tus «Buen dilema» y la marca de que votaste a solas: hasta que pidas borrar tus datos o pases 24 meses sin abrir la app.',
        '- Tu edad, tu región y lo que aceptaste: mientras uses la app y, si borras tus datos, un registro mínimo de lo que aceptaste durante 3 años.',
        '- Tus elecciones de cookies: lo que fije el gestor de cookies de Google, como mucho 13 meses.',
        '- Lo que borramos sigue unos días en las copias de seguridad: 7 días en las nuestras y hasta 180 en las de Firebase. Mientras tanto no se usa para nada.',
      ],
    },
    {
      heading: 'Tus derechos',
      paragraphs: [
        'Puedes pedir acceso a tus datos, rectificarlos, borrarlos, limitar su uso, llevártelos y oponerte a su tratamiento, y retirar el consentimiento del juego cuando quieras, sin que afecte a lo que ya se trató. Escribe a privacidad@thelever.app; como juegas sin cuenta, si no podemos comprobar que la petición es tuya te pediremos lo necesario para hacerlo. Respondemos en un mes como máximo.',
        'Si crees que no hemos tratado bien tus datos, puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es) o ante la autoridad de tu país.',
      ],
    },
    {
      heading: 'Si estás fuera de la Unión Europea',
      paragraphs: [
        'Por ahora TheLever no está disponible en el Reino Unido. En Estados Unidos, no vendemos tus datos personales ni los compartimos para publicidad sin tu consentimiento, y respetamos la señal Global Privacy Control de tu navegador como rechazo de los anuncios personalizados.',
      ],
    },
    {
      heading: 'Seguridad y cambios',
      paragraphs: [
        'Ciframos los datos en tránsito y en reposo, damos el acceso mínimo a ellos, no guardamos tu IP en nuestras bases de datos y borramos las partidas solas. Si hubiera una brecha que te afecte, te avisaremos y avisaremos a la AEPD cuando la ley lo pida.',
        'Si cambiamos esta política de forma importante, te lo diremos en la app antes de que te afecte, y si el cambio requiere tu consentimiento, te lo pediremos de nuevo.',
      ],
    },
  ],
};
