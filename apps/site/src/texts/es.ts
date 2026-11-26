import { appCookies, appPrivacy, terms } from './legal/es.ts';
import type { SiteTexts } from './site-texts.ts';

const UPDATED = '23 de noviembre de 2026';
const GUIDES_UPDATED = '26 de noviembre de 2026';

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
      about: [
        'Son los dilemas más antiguos de la filosofía moral. Un tranvía sin frenos, un bote salvavidas con pocas plazas, un médico con cinco pacientes que esperan un órgano. Obligan a elegir entre vidas y no dejan ninguna salida limpia.',
        'Casi todos enfrentan dos maneras de pensar. Una mira el resultado y busca salvar a cuantas más personas mejor. La otra mira lo que haces con tus manos y sostiene que hay cosas que no se le hacen a nadie, aunque el saldo final salga a cuenta.',
        'Jugados en grupo, enseñan algo que un test individual no muestra. Quien empuja la palanca sin dudar descubre que su mejor amigo jamás lo haría, y la conversación que sigue suele durar más que la partida.',
      ],
    },
    honesty: {
      name: 'Honestidad',
      description:
        'Cuándo decir la verdad, cuándo callar y qué estarías dispuesto a ocultar, a quién y por qué.',
      about: [
        'Mentir está mal, pero casi nadie dice siempre la verdad. Estos dilemas exploran ese terreno intermedio, el de la mentira piadosa, el silencio que protege a alguien y la verdad que hace daño sin necesidad.',
        'Detrás de cada uno hay una pregunta de fondo. ¿Importa más lo que sabe la otra persona o cómo se siente? Hay quien cree que la verdad es un deber que no admite excepciones y quien la ve como una herramienta que se usa con cuidado.',
        'Son ideales para descubrir en qué punto exacto pone cada uno de tus amigos la línea, y para darte cuenta de que esa línea cambia según a quién haya que mentir.',
      ],
    },
    loyalty: {
      name: 'Lealtad',
      description:
        'Amigos, familia y compañeros: hasta dónde llega lo que les debes cuando chocan con lo que crees justo.',
      about: [
        'La lealtad es lo que nos une a la familia, a los amigos y al equipo. El problema llega cuando lo que le debes a alguien choca con lo que crees justo, con lo que le debes a un desconocido o con lo que te debes a ti.',
        '¿Cubrirías a un amigo que ha hecho algo grave? ¿Denunciarías a tu hermano? Estos dilemas ponen a prueba hasta dónde llegan esos lazos y qué estarías dispuesto a sacrificar por ellos.',
        'En un grupo de amigos tienen un efecto curioso. Votas en privado qué harías por ellos y después ves, con ellos delante, qué harían ellos por ti.',
      ],
    },
    justice: {
      name: 'Justicia',
      description:
        'Castigos, premios y reglas: qué es justo cuando la ley, la intención y el resultado no coinciden.',
      about: [
        'La justicia parece sencilla hasta que la ley, la intención y el resultado dejan de coincidir. Alguien roba para dar de comer a su familia, una regla justa produce un castigo absurdo, un culpable se libra por un tecnicismo.',
        'Estos dilemas enfrentan ideas distintas de lo que es justo. Para unos, cumplir las normas por igual; para otros, dar a cada uno lo que merece; y para otros, reparar el daño antes que castigar a quien lo hizo.',
        'Son los que más debate generan en el reveal, porque casi todo el mundo cree tener claro qué es justo hasta que escucha la razón del que votó lo contrario.',
      ],
    },
    'love-and-relationships': {
      name: 'Amor y relaciones',
      description:
        'Pareja, celos, secretos y rupturas: dilemas sobre lo que harías por alguien a quien quieres.',
      about: [
        'Pareja, celos, secretos, rupturas y amistades que se complican. Son dilemas pequeños comparados con un tranvía sin frenos, pero son los que de verdad nos encontramos en la vida.',
        'Enfrentan la sinceridad con el cuidado, la libertad de cada uno con el compromiso con el otro, y lo que sientes con lo que crees que deberías sentir.',
        'Jugarlos con tu gente tiene algo de arriesgado, y ahí está la gracia. Votas en privado, pero todos intentáis adivinar qué ha elegido cada uno.',
      ],
    },
    'work-and-money': {
      name: 'Trabajo y dinero',
      description:
        'Ascensos, sueldos, favores y trampas: qué harías cuando el dinero o tu carrera están en juego.',
      about: [
        'Ascensos, sueldos, favores, errores de la empresa a tu favor y compañeros que se aprovechan. El dinero y la carrera profesional ponen a prueba principios que en abstracto parecen firmes.',
        'Algunos de estos dilemas tienen una estructura conocida en teoría de juegos. Si todos cooperan, todos ganan, pero quien se aprovecha gana todavía más. ¿Confías en los demás o te proteges?',
        'Sirven para descubrir quién del grupo devolvería el dinero de más, quién negociaría sin piedad y quién se iría de una empresa por una cuestión de principios.',
      ],
    },
    'technology-and-the-future': {
      name: 'Tecnología y futuro',
      description:
        'Inteligencia artificial, privacidad, robots y genética: dilemas que hace poco eran ciencia ficción.',
      about: [
        'Inteligencia artificial, privacidad, coches autónomos, edición genética y vidas cada vez más largas. Hasta hace poco eran ciencia ficción y hoy son decisiones que alguien está tomando.',
        'Estos dilemas plantean preguntas nuevas con herramientas viejas. ¿Debe un coche autónomo proteger a su pasajero o a los peatones? ¿Le contarías tus secretos a una máquina que te entiende mejor que nadie?',
        'Muchos no tienen todavía una respuesta aceptada por la mayoría, así que el resultado de tu grupo puede ser tan interesante como el de cualquier encuesta.',
      ],
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
  },
  dilemma: {
    vote: 'Votar y ver qué hizo el mundo',
    play: 'Jugarlo con mi grupo',
    worldResultLater: 'El resultado mundial se ve al votar, para que no influya en tu respuesta.',
    atStake: 'Qué está en juego',
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
  guidesHeading: 'Para saber más',
  guides: {
    trolleyProblem: {
      title: 'Qué es el dilema del tranvía',
      description:
        'El dilema del tranvía, de dónde viene, sus variantes más conocidas y lo que han aprendido de él la filosofía y la psicología.',
      updated: GUIDES_UPDATED,
      sections: [
        {
          heading: 'El dilema',
          paragraphs: [
            'Un tranvía sin frenos avanza hacia cinco personas atadas a la vía. Tú estás junto a una palanca que lo desvía a otra vía, donde hay una sola persona. Si no haces nada, mueren cinco. Si tiras de la palanca, muere una. ¿Qué haces?',
            'Planteado así, la mayoría de la gente dice que tiraría de la palanca. Salvar a cinco a costa de uno parece lo más razonable. El interés del dilema empieza cuando se cambian los detalles y esa misma gente cambia de opinión.',
          ],
        },
        {
          heading: 'De dónde viene',
          paragraphs: [
            'La filósofa británica Philippa Foot lo planteó en 1967 en un artículo sobre la doctrina del doble efecto. En su versión, quien decide es el conductor del tranvía, que puede girar hacia una vía o hacia la otra. Foot lo usaba para preguntar si hay diferencia moral entre causar un daño y permitir que ocurra.',
            'La filósofa estadounidense Judith Jarvis Thomson le dio el nombre con el que se conoce, «the trolley problem», en un artículo de 1976. Fue ella quien puso la palanca en manos de un testigo y quien propuso la variante más famosa, la del puente.',
          ],
        },
        {
          heading: 'La variante del puente',
          paragraphs: [
            'Esta vez no hay palanca. Estás en un puente sobre la vía, junto a una persona muy corpulenta. Si la empujas, su cuerpo detendrá el tranvía y salvará a las cinco personas. Ella morirá.',
            'Las cifras son las mismas que antes, uno por cinco. Sin embargo, la mayoría de la gente dice que no empujaría. Explicar por qué dos casos con el mismo resultado nos parecen tan distintos es, desde hace décadas, uno de los grandes problemas de la ética.',
          ],
        },
        {
          heading: 'Las dos grandes respuestas',
          paragraphs: [
            '- El consecuencialismo, y en especial el utilitarismo, juzga una acción por sus resultados. Si mueren menos personas, la decisión es mejor, tanto con la palanca como en el puente.',
            '- La ética del deber, cuyo representante más conocido es Immanuel Kant, sostiene que hay cosas que no se le pueden hacer a una persona aunque el resultado sea mejor, como usarla solo como un medio. Desviar el tranvía puede ser aceptable, pero empujar a alguien para frenarlo no.',
            'La doctrina del doble efecto, que se remonta a Tomás de Aquino, ofrece una vía intermedia. En la palanca, la muerte de la persona de la otra vía es un efecto previsto pero no buscado. En el puente, la muerte de la persona empujada es el medio para salvar a las demás.',
          ],
        },
        {
          heading: 'Lo que dice la psicología',
          paragraphs: [
            'En 2001, el psicólogo Joshua Greene y su equipo publicaron en la revista Science un estudio con resonancia magnética. Los dilemas en los que hay que dañar a alguien con las propias manos, como el del puente, activaban más las zonas del cerebro ligadas a la emoción que los dilemas impersonales, como el de la palanca.',
            'En 2018, el proyecto Moral Machine del MIT publicó en Nature los resultados de un experimento en línea sobre coches autónomos con millones de decisiones de personas de más de doscientos países y territorios. Encontró preferencias compartidas en casi todo el mundo, como salvar a más personas, y diferencias claras entre culturas en otras.',
          ],
        },
        {
          heading: 'Por qué sigue importando',
          paragraphs: [
            'El dilema del tranvía es un experimento mental. Nadie espera encontrarse una palanca en una vía, pero las preguntas que plantea aparecen en decisiones reales, como repartir recursos escasos en un hospital o programar cómo reacciona un coche autónomo ante un accidente inevitable.',
            'En TheLever puedes jugar versiones del tranvía y cientos de dilemas más con tu grupo, votar en privado y descubrir después quién piensa qué. La categoría Vida y muerte reúne los más cercanos al dilema original.',
          ],
        },
      ],
    },
    playingInAGroup: {
      title: 'Cómo jugar a dilemas morales en grupo',
      description:
        'Cómo funciona una partida de TheLever, cuánta gente hace falta, qué ambiente elegir y cómo sacar partido al debate.',
      updated: GUIDES_UPDATED,
      sections: [
        {
          heading: 'Qué hace falta',
          paragraphs: [
            'Un móvil por persona y nada más. TheLever funciona en el navegador, así que no hay que instalar nada ni crear una cuenta. Basta con que alguien cree la sala y comparta el enlace o el código.',
            'Se puede jugar desde dos personas hasta cincuenta. Con cuatro o cinco el debate es más íntimo, y con un grupo grande el resultado de cada ronda sorprende más.',
          ],
        },
        {
          heading: 'Cómo es una partida',
          paragraphs: [
            '- Quien crea la sala elige el ambiente y el número de rondas, de una a doce. Por defecto son ocho.',
            '- En cada ronda aparece el mismo dilema en todos los móviles. Cada uno vota en privado.',
            '- Además de votar, cada uno predice qué ha votado el resto del grupo.',
            '- Cuando todos han votado, llega el reveal. Se ve qué ha elegido el grupo, quién acertó sus predicciones y empieza el debate.',
            '- Al final de la partida, cada jugador recibe un título según cómo ha votado y cómo ha predicho a los demás.',
          ],
        },
        {
          heading: 'Qué ambiente elegir',
          paragraphs: [
            '- Clásica, con dilemas para cualquier grupo. Es la mejor opción para empezar o para jugar con gente que no conoces mucho.',
            '- Picante, que añade temas de adultos. Solo para mayores de 18 años.',
            '- Sin filtro, que suma preguntas comprometidas. En esta sala nadie ve qué vota cada uno.',
          ],
        },
        {
          heading: 'Cómo sacar partido al debate',
          paragraphs: [
            'Lo mejor del juego no es el voto sino lo que viene después. Cuando el grupo se divide, pide a alguien de cada lado que explique su razón en una frase. Casi siempre aparece un detalle del dilema en el que el otro bando no se había fijado.',
            'No hay respuestas correctas. Cada dilema tiene en su página los mejores argumentos a favor y en contra de cada opción, por si el debate se atasca o queréis saber qué dice la filosofía.',
            'Las predicciones añaden una segunda capa. Acertar lo que votará tu mejor amigo es más difícil de lo que parece, y fallar suele dar pie a la mejor conversación de la noche.',
          ],
        },
        {
          heading: 'Para quién es',
          paragraphs: [
            'TheLever es para mayores de 16 años. Funciona en una cena con amigos, en una clase de filosofía o ética, en una actividad de equipo o en una videollamada con gente que vive lejos.',
          ],
        },
      ],
    },
    about: {
      title: 'Quién hace TheLever',
      description:
        'Quién está detrás de TheLever, cómo se escriben sus dilemas, cómo se financia y cómo escribirnos.',
      updated: GUIDES_UPDATED,
      sections: [
        {
          heading: 'Una persona',
          paragraphs: [
            'TheLever lo hace una sola persona, que lo diseña, lo programa y selecciona sus dilemas. Es un proyecto independiente, sin inversores ni empresa detrás.',
            'Nació de una idea sencilla. Los dilemas morales son mucho más interesantes cuando los discutes con tu gente que cuando los respondes a solas en un test.',
          ],
        },
        {
          heading: 'Cómo se hacen los dilemas',
          paragraphs: [
            'Cada dilema del catálogo se revisa a mano antes de publicarse. Algunos son versiones de clásicos de la filosofía, como el tranvía o el anillo de Giges; la mayoría son situaciones cotidianas escritas para TheLever.',
            'Los argumentos a favor y en contra de cada opción se redactan con ayuda de inteligencia artificial y se revisan uno a uno en español. Las traducciones a los demás idiomas se hacen con inteligencia artificial.',
            'Los argumentos nunca dicen cuál es la opción correcta. Su objetivo es que entiendas la mejor razón de cada postura, también la de la opción que no elegirías.',
          ],
        },
        {
          heading: 'Cómo se financia',
          paragraphs: [
            'TheLever es gratis y lo seguirá siendo. Se mantiene con donaciones voluntarias y, más adelante, también con anuncios. Donar no da ninguna ventaja en el juego.',
          ],
        },
        {
          heading: 'Cómo escribirnos',
          paragraphs: [
            'Para cualquier duda sobre tus datos, escribe a privacidad@thelever.app. En las páginas de privacidad y aviso legal, enlazadas al pie de cada página, están todos los datos del responsable.',
          ],
        },
      ],
    },
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
        heading: 'Donaciones',
        paragraphs: [
          'Si nos apoyas con una donación en Ko-fi (Ko-fi Labs Limited, Reino Unido), Ko-fi nos da tu nombre o tu usuario, tu email, el importe y el mensaje que escribas. Los usamos para gestionar y agradecer tu donación, por interés legítimo (art. 6.1.f RGPD), y para cumplir nuestras obligaciones fiscales (art. 6.1.c), y los guardamos el tiempo que exige la ley fiscal, en general 4 años. Nunca los unimos a nada de lo que haces en la app. Ko-fi y quien procesa el pago (PayPal o Stripe) tratan tus datos por su cuenta, según sus propias políticas.',
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
  appCookies,
};
