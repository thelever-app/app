import type { SiteTexts } from './site-texts.ts';

const UPDATED = '16 de noviembre de 2026';

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
      'Crea una sala y comparte el enlace o el código.',
      'En cada ronda, todos votáis el mismo dilema en privado y predecís a los demás.',
      'Se revela el resultado y lo comentáis. Al final, los títulos de la partida.',
    ],
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
    moreOf: (name) => `Más dilemas de ${name.toLowerCase()}`,
  },
  gone: {
    title: 'Este dilema ya no está en TheLever',
    heading: 'Este dilema ya no está en TheLever',
    body: 'Lo hemos retirado del catálogo. Si alguien te pasó este enlace, hay muchos otros esperándote.',
    moreOf: (name) => `Ver dilemas de ${name.toLowerCase()}`,
  },
  notFound: {
    title: 'Esta página no existe',
    heading: 'Esta página no existe',
    body: 'Puede que la dirección esté mal escrita. Desde la portada llegas a todos los dilemas.',
  },
  footer: { label: 'Información legal' },
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
          'Por ahora esta web no muestra anuncios ni usa cookies. Cuando los muestre, serán de Google AdSense: Google y sus socios solo usarán cookies para mostrarlos o personalizarlos si lo aceptas en el gestor de cookies, que aparecerá antes que cualquier anuncio; si no aceptas, solo verás anuncios limitados, sin cookies. Ningún anuncio recibirá lo que votas en la app.',
          'Google es responsable por su cuenta de lo que hace con esas cookies. Puedes saber más en policies.google.com/technologies/ads.',
        ],
      },
      {
        heading: 'Con quién compartimos tus datos',
        paragraphs: [
          'No vendemos tus datos. Google Cloud los trata por nuestra cuenta, con contrato, solo para alojar la web. También podemos tener que darlos a las autoridades cuando la ley nos obligue.',
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
          'TheLever no guarda nada de tu visita. Google conserva sus registros técnicos el tiempo que necesita para la seguridad del servicio.',
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
          'Cómo tratamos los datos en esta web está en la política de privacidad. La app explica los suyos antes de jugar, y su uso se rige por sus condiciones de uso, que se aceptan al entrar.',
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
};
