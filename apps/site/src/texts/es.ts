import { appPrivacy, terms } from './legal/es.ts';
import type { SiteTexts } from './site-texts.ts';

const UPDATED = '17 de noviembre de 2026';

export const es: SiteTexts = {
  languageName: 'Español',
  languageMenu: 'Idioma',
  homeLink: 'Inicio',
  someoneInYourGroup: 'alguien de tu grupo',
  categories: {
    'life-and-death': {
      name: 'Vida y muerte',
      description:
        'Dilemas en los que hay vidas en juego: el tranvía, el bote salvavidas y otras decisiones sin una salida buena.',
    },
    honesty: {
      name: 'Honestidad',
      description:
        'Cuándo decir la verdad, cuándo callar y qué estarías dispuesto a ocultar, a quién y por qué.',
    },
    loyalty: {
      name: 'Lealtad',
      description:
        'Amigos, familia y compañeros: hasta dónde llega lo que les debes cuando chocan con lo que crees justo.',
    },
    justice: {
      name: 'Justicia',
      description:
        'Castigos, premios y reglas: qué es justo cuando la ley, la intención y el resultado no coinciden.',
    },
    'love-and-relationships': {
      name: 'Amor y relaciones',
      description:
        'Pareja, celos, secretos y rupturas: dilemas sobre lo que harías por alguien a quien quieres.',
    },
    'work-and-money': {
      name: 'Trabajo y dinero',
      description:
        'Ascensos, sueldos, favores y trampas: qué harías cuando el dinero o tu carrera están en juego.',
    },
    'technology-and-the-future': {
      name: 'Tecnología y futuro',
      description:
        'Inteligencia artificial, privacidad, robots y genética: dilemas que hace poco eran ciencia ficción.',
    },
  },
  home: {
    title: 'TheLever: dilemas morales para jugar con tu grupo',
    description:
      'Dilemas morales para jugar con tu gente: cada uno vota en privado, predice qué votarán los demás y luego descubrís juntos quién piensa qué.',
    heading: 'Dilemas morales para jugar con tu gente',
    intro:
      'Cada uno vota en privado desde su móvil, predice qué votarán los demás y luego descubrís juntos quién piensa qué. Gratis, sin instalar nada.',
    play: 'Jugar ahora',
    scene: 'La Palanca, saludando junto a un desvío de vías',
    howToPlay: 'Cómo se juega',
    steps: [
      { title: 'Crea la sala', text: 'Comparte el enlace o el código y que entre tu gente.' },
      {
        title: 'Vota y predice',
        text: 'En cada ronda, todos votáis el mismo dilema en privado y predecís a los demás.',
      },
      {
        title: 'Descubrid quién piensa qué',
        text: 'Se revela el resultado y lo comentáis. Al final, los títulos de la partida.',
      },
    ],
    screens: {
      roomCode: 'Código de la sala',
      share: 'Compartir enlace',
      round: 'Dilema 2 de 6',
      dilemma: '¿Mentirías para salvar el trabajo de un amigo?',
      yes: 'Sí, mentiría',
      no: 'No, diría la verdad',
      private: 'Nadie del grupo verá tu voto',
      result: '3 de 5 dijeron sí',
      yesCount: 'Sí · 3',
      noCount: 'No · 2',
      right: 'Acertaste con Ana y Luis',
    },
    categories: 'Categorías',
  },
  category: {
    heading: (name) => `Dilemas morales de ${name.toLowerCase()}`,
    description: (name) =>
      `Dilemas morales de ${name.toLowerCase()} para jugar con tu grupo en TheLever.`,
    options: (count) => `${count} opciones`,
    withArguments: 'argumentos de cada una',
  },
  dilemma: {
    vote: 'Votar y ver qué hizo el mundo',
    play: 'Jugarlo con mi grupo',
    worldResultLater: 'El resultado mundial se ve al votar, para que no influya en tu respuesta.',
    arguments: 'Argumentos de cada opción',
    for: 'A favor:',
    against: 'En contra:',
    byTheTeam: 'Texto del equipo de TheLever.',
    ad: 'Anuncio',
    moreOf: (name) => `Más dilemas de ${name.toLowerCase()}`,
  },
  gone: {
    title: 'Este dilema ya no está en TheLever',
    heading: 'Este dilema ya no está en TheLever',
    body: 'Lo hemos retirado del catálogo.',
    moreOf: (name) => `Ver dilemas de ${name.toLowerCase()}`,
  },
  notFound: {
    title: 'Esta página no existe',
    heading: 'Esta página no existe',
    body: 'Puede que la dirección esté mal escrita. Desde la portada llegas a todos los dilemas.',
  },
  footer: { label: 'Información legal', manageCookies: 'Gestionar cookies' },
  support: {
    link: 'Apoya TheLever',
    heading: 'TheLever es gratis',
    text: 'Lo mantiene una persona. Si te gusta, puedes apoyarlo con una donación; no da ninguna ventaja en el juego.',
    line: '¿Te ha hecho pensar? TheLever es gratis y lo mantiene una persona. Donar no da ninguna ventaja en el juego.',
  },
  privacy: {
    title: 'Privacidad',
    description: 'Qué datos trata la web pública de TheLever, para qué y cuáles son tus derechos.',
    updated: UPDATED,
    sections: [
      {
        heading: 'Quién es el responsable',
        paragraphs: [
          'TheLever es un proyecto de {owner}. Para cualquier cosa sobre tus datos, escribe a privacidad@thelever.app. Respondemos en español y en inglés.',
        ],
      },
      {
        heading: 'Qué datos tratamos en esta web',
        paragraphs: [
          'Esta web solo muestra dilemas: no tiene cuentas, formularios ni cookies propias, y no te pide ningún dato.',
          'Para enviarte cada página, nuestro proveedor de alojamiento, Google Cloud (Firebase Hosting y Cloud Run), recibe lo que tu navegador manda en cualquier visita: tu dirección IP, tu navegador y la página que pides. Lo usa solo para entregarte la página y protegerla de abusos, por nuestro interés legítimo en tener un servicio seguro (art. 6.1.f RGPD). TheLever no guarda tu dirección IP en sus registros.',
        ],
      },
      {
        heading: 'La app',
        paragraphs: [
          'Si eliges votar un dilema o jugarlo con tu grupo, pasas a la app de TheLever, que antes de jugar te explica cómo trata tus datos y te pide tu consentimiento.',
        ],
      },
      {
        heading: 'Anuncios y cookies',
        paragraphs: [
          'Las páginas de los dilemas muestran anuncios de Google AdSense. Antes de usar cookies, el gestor de cookies de Google te pregunta qué aceptas, y Google solo las usa con tu consentimiento (art. 6.1.a RGPD y art. 22.2 LSSI). Si no aceptas, solo ves anuncios limitados, sin cookies.',
          'Los anuncios solo se personalizan si lo aceptas: en esta web, que no pregunta tu edad, depende solo de eso. Si tu navegador envía la señal Global Privacy Control, los anuncios no se personalizan aunque lo aceptes. TheLever no da a Google ni a sus socios lo que votas en la app.',
          'Al cargar los anuncios, aunque no aceptes nada, Google recibe tu dirección IP, los datos de tu navegador y la página que visitas. Lo permitimos por nuestro interés legítimo en financiar con publicidad un juego gratuito (art. 6.1.f RGPD), y de esa recogida respondemos junto con Google. Lo que Google y sus socios hacen después con esos datos y con sus cookies es responsabilidad suya, según lo que aceptes y las condiciones de protección de datos de Google Ads (business.safety.google/adscontrollerterms). Qué cookies son y cómo cambiar lo que aceptas está en la política de cookies; Google lo explica en policies.google.com/technologies/ads.',
        ],
      },
      {
        heading: 'Con quién compartimos tus datos',
        paragraphs: [
          'No vendemos tus datos. Google Cloud los trata por nuestra cuenta, con contrato, solo para alojar la web. Google AdSense y sus socios los reciben como responsables por su cuenta, como explica el apartado de anuncios. También podemos tener que darlos a las autoridades cuando la ley nos obligue.',
        ],
      },
      {
        heading: 'Transferencias fuera del Espacio Económico Europeo',
        paragraphs: [
          'Google puede tratar datos fuera del Espacio Económico Europeo, amparado en el Marco de Privacidad de Datos UE-EE. UU. y en las cláusulas contractuales tipo de la Comisión Europea.',
        ],
      },
      {
        heading: 'Cuánto tiempo los guardamos',
        paragraphs: [
          'TheLever no guarda nada de tu visita. Google conserva sus registros técnicos el tiempo que necesita para la seguridad del servicio, y cada cookie dura lo que indica la política de cookies.',
        ],
      },
      {
        heading: 'Tus derechos',
        paragraphs: [
          'Puedes pedir acceso a tus datos, rectificarlos, borrarlos, limitar su uso, llevártelos u oponerte a que los tratemos escribiendo a privacidad@thelever.app. Respondemos en un mes como máximo.',
          'Si crees que no hemos tratado bien tus datos, puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es) o ante la autoridad de tu país.',
        ],
      },
      {
        heading: 'Cambios en esta política',
        paragraphs: [
          'Si la cambiamos de forma importante, lo diremos en esta página antes de que te afecte.',
        ],
      },
    ],
  },
  cookies: {
    title: 'Cookies',
    description:
      'Qué cookies se usan en la web pública de TheLever, para qué y cómo cambiar lo que aceptas.',
    updated: UPDATED,
    sections: [
      {
        heading: 'Qué son',
        paragraphs: [
          'Las cookies son pequeños archivos que una web guarda en tu navegador y vuelve a leer después. Esta política llama también «cookies» a las tecnologías parecidas, como el almacenamiento local del navegador.',
        ],
      },
      {
        heading: 'Las que usa esta web',
        paragraphs: [
          'TheLever no pone cookies propias en ninguna página de esta web. Las ponen Google AdSense, que muestra los anuncios, y el gestor de cookies de Google, que te pregunta qué aceptas. Todas son de Google, como tercero, y solo se cargan en las páginas de los dilemas: la portada, las categorías y las páginas legales no tienen anuncios ni cookies.',
        ],
      },
      {
        heading: 'Las que no necesitan tu consentimiento',
        paragraphs: [
          'Solo las que guardan tu elección, para respetarla sin volver a preguntártela en cada página: lo que respondes en el gestor de cookies (FCCDCF) y, si no aceptas anuncios con cookies, que no los aceptas (__gpi_optout).',
        ],
      },
      {
        heading: 'Las que necesitan tu consentimiento',
        paragraphs: [
          'Todas las demás, y Google solo las usa si lo aceptas en el gestor de cookies:',
          '- Para mostrar y medir los anuncios: guardar y leer información en tu dispositivo, limitar cuántas veces ves un anuncio, medir cómo funciona y prevenir el fraude. Si no lo aceptas, solo ves anuncios limitados, sin cookies.',
          '- Para personalizar los anuncios según tus intereses. En esta web, que no pregunta tu edad, depende solo de que lo aceptes. Si tu navegador envía la señal Global Privacy Control, los anuncios no se personalizan aunque lo aceptes. Nunca se eligen a partir de lo que votas en la app.',
          'Google también puede guardar información parecida en el almacenamiento local del navegador, para los mismos fines y con el mismo consentimiento.',
        ],
      },
      {
        heading: 'Tabla de cookies',
        paragraphs: [
          'Los nombres, las finalidades y las duraciones son los que publica Google en business.safety.google/adscookies, donde está su lista completa.',
        ],
        table: {
          headers: ['Cookie', 'De quién', 'Para qué', 'Duración'],
          rows: [
            [
              'FCCDCF',
              'Gestor de cookies de Google',
              'Guardar lo que respondes en el gestor',
              '13 meses',
            ],
            ['FCNEC', 'Gestor de cookies de Google', 'Estadísticas del gestor', '365 días'],
            ['__gads', 'Google AdSense', 'Anuncios y seguridad', '13 meses'],
            ['__gpi', 'Google AdSense', 'Anuncios y seguridad', '13 meses'],
            [
              '__gpi_optout',
              'Google AdSense',
              'Recordar que no aceptas anuncios con cookies',
              '13 meses',
            ],
            ['__eoi', 'Google AdSense', 'Seguridad', '6 meses'],
            [
              'TESTCOOKIESENABLED',
              'Google AdSense',
              'Comprobar si tu navegador acepta cookies',
              '60 segundos',
            ],
            ['IDE', 'Google (doubleclick.net)', 'Anuncios y seguridad', '13 meses'],
            ['id', 'Google (doubleclick.net)', 'Anuncios, seguridad y funcionamiento', '13 meses'],
            [
              'DSID',
              'Google (doubleclick.net)',
              'Anuncios, seguridad y funcionamiento',
              '2 semanas',
            ],
            [
              'test_cookie',
              'Google (doubleclick.net)',
              'Comprobar si tu navegador acepta cookies',
              '15 minutos',
            ],
          ],
        },
      },
      {
        heading: 'Cómo cambiar lo que aceptas',
        paragraphs: [
          'En cualquier página de un dilema, con «Gestionar cookies» al pie: vuelve a abrir el gestor de cookies de Google, donde puedes retirar o cambiar tu consentimiento tan fácilmente como lo diste.',
          'También puedes borrar o bloquear las cookies en los ajustes de tu navegador.',
        ],
      },
      {
        heading: 'Terceros y transferencias',
        paragraphs: [
          'Google y los socios publicitarios que aceptes usan sus cookies como responsables por su cuenta. El gestor de cookies sigue el Marco de Transparencia y Consentimiento de IAB Europe y te muestra quiénes son esos socios y para qué usa cada uno tus datos.',
          'Google puede tratar datos fuera del Espacio Económico Europeo, amparado en el Marco de Privacidad de Datos UE-EE. UU. y en las cláusulas contractuales tipo de la Comisión Europea. Lo explica en policies.google.com/technologies/ads.',
        ],
      },
      {
        heading: 'Más información',
        paragraphs: [
          'Cómo tratamos tus datos está en la política de privacidad. Para cualquier duda, escribe a privacidad@thelever.app.',
        ],
      },
    ],
  },
  legalNotice: {
    title: 'Aviso legal',
    description: 'Quién está detrás de TheLever y las condiciones de esta web.',
    updated: UPDATED,
    sections: [
      {
        heading: 'Titular',
        paragraphs: [
          '- Titular: {owner}.',
          '- NIF: {taxId}.',
          '- Domicilio: {address}, España.',
          '- Email: privacidad@thelever.app.',
          '- Sitio web y app: thelever.app.',
          '- Actividad: juego gratuito en línea financiado con publicidad.',
        ],
      },
      {
        heading: 'Privacidad',
        paragraphs: [
          'Cómo tratamos los datos en esta web está en la política de privacidad, y qué cookies usa, en la política de cookies. La app explica los suyos antes de jugar, y su uso se rige por sus condiciones de uso, que se aceptan al entrar.',
        ],
      },
      {
        heading: 'Propiedad intelectual',
        paragraphs: [
          'La marca TheLever, su diseño y los dilemas y argumentos de nuestro equipo son de su titular, salvo que se indique otra licencia. El código de la app y de esta web es software libre con licencia AGPL-3.0.',
        ],
      },
      {
        heading: 'Enlaces y anuncios',
        paragraphs: [
          'No controlamos los anuncios ni las webs a las que enlazan. Si alguno es ilícito o inapropiado, avísanos y lo retiraremos en cuanto lo sepamos.',
        ],
      },
      {
        heading: 'Contenido ilegal',
        paragraphs: [
          'Puedes denunciar contenido ilegal escribiendo a privacidad@thelever.app. Es también el punto de contacto para autoridades y usuarios del Reglamento de Servicios Digitales (arts. 11 y 12), en español y en inglés.',
        ],
      },
      {
        heading: 'Ley aplicable',
        paragraphs: [
          'Ley española. Si eres consumidor, conservas los derechos que te dan las normas de tu país.',
        ],
      },
    ],
  },
  terms,
  appPrivacy,
};
