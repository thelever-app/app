import { appCookies, appPrivacy, terms } from './legal/ca.ts';
import type { SiteTexts } from './site-texts.ts';

const UPDATED = '23 de novembre de 2026';
const GUIDES_UPDATED = '26 de novembre de 2026';

export const ca: SiteTexts = {
  languageName: 'Català',
  languageMenu: 'Idioma',
  homeLink: 'Inici',
  someoneInYourGroup: 'algú del teu grup',
  categories: {
    'life-and-death': {
      name: 'Vida i mort',
      description:
        'Dilemes en què hi ha vides en joc: el tramvia, el bot salvavides i altres decisions sense una sortida bona.',
      about: [
        'Són els dilemes més antics de la filosofia moral. Un tramvia sense frens, un bot salvavides amb poques places, un metge amb cinc pacients que esperen un òrgan. Obliguen a triar entre vides i no deixen cap sortida neta.',
        'Gairebé tots enfronten dues maneres de pensar. Una mira el resultat i busca salvar com més persones millor. L’altra mira el que fas amb les teves mans i sosté que hi ha coses que no es fan a ningú, encara que el balanç final surti a compte.',
        'Jugats en grup, ensenyen una cosa que un test individual no mostra. Qui tira de la palanca sense dubtar descobreix que el seu millor amic no ho faria mai, i la conversa que ve després sol durar més que la partida.',
      ],
    },
    honesty: {
      name: 'Honestedat',
      description:
        'Quan dir la veritat, quan callar i què estaries disposat a amagar, a qui i per què.',
      about: [
        'Mentir està malament, però gairebé ningú no diu sempre la veritat. Aquests dilemes exploren aquest terreny intermedi, el de la mentida piadosa, el silenci que protegeix algú i la veritat que fa mal sense necessitat.',
        'Darrere de cadascun hi ha una pregunta de fons. Importa més el que sap l’altra persona o com se sent? Hi ha qui creu que la veritat és un deure que no admet excepcions i qui la veu com una eina que s’ha de fer servir amb compte.',
        'Són ideals per descobrir en quin punt exacte posa la línia cadascun dels teus amics, i per adonar-te que aquesta línia canvia segons a qui calgui mentir.',
      ],
    },
    loyalty: {
      name: 'Lleialtat',
      description:
        'Amics, família i companys: fins on arriba el que els deus quan xoca amb el que creus just.',
      about: [
        'La lleialtat és el que ens uneix a la família, als amics i a l’equip. El problema arriba quan el que deus a algú xoca amb el que creus just, amb el que deus a un desconegut o amb el que et deus a tu mateix.',
        'Encobriries un amic que ha fet una cosa greu? Denunciaries el teu germà? Aquests dilemes posen a prova fins on arriben aquests lligams i què estaries disposat a sacrificar per ells.',
        'En un grup d’amics tenen un efecte curiós. Votes en privat què faries per ells i després veus, amb ells al davant, què farien ells per tu.',
      ],
    },
    justice: {
      name: 'Justícia',
      description:
        'Càstigs, premis i normes: què és just quan la llei, la intenció i el resultat no coincideixen.',
      about: [
        'La justícia sembla senzilla fins que la llei, la intenció i el resultat deixen de coincidir. Algú roba per donar menjar a la seva família, una norma justa produeix un càstig absurd, un culpable se’n surt per un tecnicisme.',
        'Aquests dilemes enfronten idees diferents del que és just. Per a uns, complir les normes per igual; per a uns altres, donar a cadascú el que mereix; i per a uns altres, reparar el mal abans que castigar qui l’ha fet.',
        'Són els que generen més debat a la revelació, perquè gairebé tothom creu tenir clar què és just fins que escolta la raó de qui ha votat el contrari.',
      ],
    },
    'love-and-relationships': {
      name: 'Amor i relacions',
      description:
        'Parella, gelosia, secrets i ruptures: dilemes sobre el que faries per algú que estimes.',
      about: [
        'Parella, gelosia, secrets, ruptures i amistats que es compliquen. Són dilemes petits al costat d’un tramvia sense frens, però són els que de debò ens trobem a la vida.',
        'Enfronten la sinceritat amb la cura, la llibertat de cadascú amb el compromís amb l’altre, i el que sents amb el que creus que hauries de sentir.',
        'Jugar-los amb la teva gent té una mica de risc, i aquesta és la gràcia. Votes en privat, però tots intenteu endevinar què ha triat cadascú.',
      ],
    },
    'work-and-money': {
      name: 'Feina i diners',
      description:
        'Ascensos, sous, favors i dreceres: què faries quan els diners o la teva carrera estan en joc.',
      about: [
        'Ascensos, sous, favors, errors de l’empresa a favor teu i companys que se n’aprofiten. Els diners i la carrera professional posen a prova principis que en abstracte semblen ferms.',
        'Alguns d’aquests dilemes tenen una estructura coneguda en teoria de jocs. Si tothom coopera, tothom hi guanya, però qui se n’aprofita hi guanya encara més. Confies en els altres o et protegeixes?',
        'Serveixen per descobrir qui del grup tornaria els diners de més, qui negociaria sense pietat i qui deixaria una empresa per una qüestió de principis.',
      ],
    },
    'technology-and-the-future': {
      name: 'Tecnologia i futur',
      description:
        'Intel·ligència artificial, privacitat, robots i genètica: dilemes que fa poc eren ciència-ficció.',
      about: [
        'Intel·ligència artificial, privacitat, cotxes autònoms, edició genètica i vides cada vegada més llargues. Fins fa poc eren ciència-ficció i avui són decisions que algú està prenent.',
        'Aquests dilemes plantegen preguntes noves amb eines velles. Un cotxe autònom ha de protegir el passatger o els vianants? Explicaries els teus secrets a una màquina que t’entén millor que ningú?',
        'Molts encara no tenen una resposta acceptada per la majoria, així que el resultat del teu grup pot ser tan interessant com el de qualsevol enquesta.',
      ],
    },
  },
  home: {
    title: 'TheLever: dilemes morals per jugar amb el teu grup',
    description:
      'Dilemes morals per jugar amb la teva gent: cadascú vota en privat, prediu què votaran els altres i després descobriu junts qui pensa què.',
    heading: 'Dilemes morals per jugar amb la teva gent',
    intro:
      'Cadascú vota en privat des del mòbil, prediu què votaran els altres i després descobriu junts qui pensa què. Gratis, sense instal·lar res.',
    play: 'Jugar ara',
    scene: 'La Palanca, saludant al costat d’un canvi d’agulles',
    howToPlay: 'Com es juga',
    steps: [
      { title: 'Crea la sala', text: 'Comparteix l’enllaç o el codi i que entri la teva gent.' },
      {
        title: 'Vota i prediu',
        text: 'A cada ronda, tots voteu el mateix dilema en privat i predieu els altres.',
      },
      {
        title: 'Descobriu qui pensa què',
        text: 'Es revela el resultat i el comenteu. Al final, els títols de la partida.',
      },
    ],
    screens: {
      roomCode: 'Codi de la sala',
      share: 'Comparteix l’enllaç',
      round: 'Dilema 2 de 6',
      dilemma: 'Mentiries per salvar la feina d’un amic?',
      yes: 'Sí, mentiria',
      no: 'No, diria la veritat',
      private: 'Ningú del grup veurà el teu vot',
      result: '3 de 5 han dit que sí',
      yesCount: 'Sí · 3',
      noCount: 'No · 2',
      right: 'Has encertat l’Ana i en Luis',
    },
    categories: 'Categories',
  },
  category: {
    heading: (name) => `Dilemes morals: ${name.toLowerCase()}`,
    description: (name) =>
      `Dilemes morals sobre ${name.toLowerCase()} per jugar amb el teu grup a TheLever.`,
  },
  dilemma: {
    vote: 'Votar i veure què va fer el món',
    play: 'Jugar-lo amb el meu grup',
    worldResultLater:
      'El resultat mundial es veu en votar, perquè no influeixi en la teva resposta.',
    atStake: 'Què hi ha en joc',
    arguments: 'Arguments de cada opció',
    for: 'A favor:',
    against: 'En contra:',
    byTheTeam: 'Text de l’equip de TheLever.',
    ad: 'Anunci',
    moreOf: (name) => `Més dilemes: ${name.toLowerCase()}`,
  },
  gone: {
    title: 'Aquest dilema ja no és a TheLever',
    heading: 'Aquest dilema ja no és a TheLever',
    body: 'L’hem retirat del catàleg.',
    moreOf: (name) => `Veure dilemes: ${name.toLowerCase()}`,
  },
  notFound: {
    title: 'Aquesta pàgina no existeix',
    heading: 'Aquesta pàgina no existeix',
    body: 'Potser l’adreça està mal escrita. Des de l’inici arribes a tots els dilemes.',
  },
  footer: { label: 'Informació legal', manageCookies: 'Gestionar galetes' },
  support: {
    link: 'Dona suport a TheLever',
    heading: 'TheLever és gratis',
    text: 'El manté una sola persona. Si t’agrada, pots donar-li suport amb una donació; no dóna cap avantatge en el joc.',
    line: 'T’ha fet pensar? TheLever és gratis i el manté una sola persona. Fer una donació no dona cap avantatge en el joc.',
  },
  guidesHeading: 'Per saber-ne més',
  guides: {
    trolleyProblem: {
      title: 'Què és el dilema del tramvia',
      description:
        'El dilema del tramvia, d’on ve, les seves variants més conegudes i el que n’han après la filosofia i la psicologia.',
      updated: GUIDES_UPDATED,
      sections: [
        {
          heading: 'El dilema',
          paragraphs: [
            'Un tramvia sense frens avança cap a cinc persones lligades a la via. Tu ets al costat d’una palanca que el desvia cap a una altra via, on hi ha una sola persona. Si no fas res, en moren cinc. Si tires de la palanca, en mor una. Què fas?',
            'Plantejat així, la majoria de la gent diu que tiraria de la palanca. Salvar-ne cinc a costa d’una sembla el més raonable. L’interès del dilema comença quan es canvien els detalls i aquesta mateixa gent canvia d’opinió.',
          ],
        },
        {
          heading: 'D’on ve',
          paragraphs: [
            'La filòsofa britànica Philippa Foot el va plantejar el 1967 en un article sobre la doctrina del doble efecte. En la seva versió, qui decideix és el conductor del tramvia, que pot girar cap a una via o cap a l’altra. Foot el feia servir per preguntar si hi ha diferència moral entre causar un mal i permetre que passi.',
            'La filòsofa nord-americana Judith Jarvis Thomson li va donar el nom amb què es coneix, «the trolley problem», en un article del 1976. Va ser ella qui va posar la palanca a les mans d’un testimoni i qui va proposar la variant més famosa, la del pont.',
          ],
        },
        {
          heading: 'La variant del pont',
          paragraphs: [
            'Aquesta vegada no hi ha palanca. Ets en un pont sobre la via, al costat d’una persona molt corpulenta. Si l’empenys, el seu cos aturarà el tramvia i salvarà les cinc persones. Ella morirà.',
            'Les xifres són les mateixes que abans, un per cinc. Tot i això, la majoria de la gent diu que no l’empenyeria. Explicar per què dos casos amb el mateix resultat ens semblen tan diferents és, des de fa dècades, un dels grans problemes de l’ètica.',
          ],
        },
        {
          heading: 'Les dues grans respostes',
          paragraphs: [
            '- El conseqüencialisme, i sobretot l’utilitarisme, jutja una acció pels seus resultats. Si moren menys persones, la decisió és millor, tant amb la palanca com al pont.',
            '- L’ètica del deure, que té en Immanuel Kant el representant més conegut, sosté que hi ha coses que no es poden fer a una persona encara que el resultat sigui millor, com fer-la servir només com un mitjà. Desviar el tramvia pot ser acceptable, però empènyer algú per aturar-lo, no.',
            'La doctrina del doble efecte, que es remunta a Tomàs d’Aquino, ofereix una via intermèdia. A la palanca, la mort de la persona de l’altra via és un efecte previst però no buscat. Al pont, la mort de la persona empesa és el mitjà per salvar les altres.',
          ],
        },
        {
          heading: 'El que diu la psicologia',
          paragraphs: [
            'El 2001, el psicòleg Joshua Greene i el seu equip van publicar a la revista Science un estudi amb ressonància magnètica. Els dilemes en què cal fer mal a algú amb les pròpies mans, com el del pont, activaven més les zones del cervell lligades a l’emoció que els dilemes impersonals, com el de la palanca.',
            'El 2018, el projecte Moral Machine del MIT va publicar a Nature els resultats d’un experiment en línia sobre cotxes autònoms amb milions de decisions de persones de més de dos-cents països i territoris. Va trobar preferències compartides a gairebé tot el món, com salvar més persones, i diferències clares entre cultures en d’altres.',
          ],
        },
        {
          heading: 'Per què encara importa',
          paragraphs: [
            'El dilema del tramvia és un experiment mental. Ningú no espera trobar-se una palanca en una via, però les preguntes que planteja apareixen en decisions reals, com repartir recursos escassos en un hospital o programar com reacciona un cotxe autònom davant d’un accident inevitable.',
            'A TheLever pots jugar versions del tramvia i centenars de dilemes més amb el teu grup, votar en privat i descobrir després qui pensa què. La categoria Vida i mort reuneix els més propers al dilema original.',
          ],
        },
      ],
    },
    playingInAGroup: {
      title: 'Com jugar a dilemes morals en grup',
      description:
        'Com funciona una partida de TheLever, quanta gent cal, quin ambient triar i com treure profit del debat.',
      updated: GUIDES_UPDATED,
      sections: [
        {
          heading: 'Què cal',
          paragraphs: [
            'Un mòbil per persona i res més. TheLever funciona al navegador, així que no cal instal·lar res ni crear cap compte. Només cal que algú creï la sala i comparteixi l’enllaç o el codi.',
            'Es pot jugar des de dues persones fins a cinquanta. Amb quatre o cinc el debat és més íntim, i amb un grup gran el resultat de cada ronda sorprèn més.',
          ],
        },
        {
          heading: 'Com és una partida',
          paragraphs: [
            '- Qui crea la sala tria l’ambient i el nombre de rondes, d’una a dotze. Per defecte en són vuit.',
            '- A cada ronda apareix el mateix dilema a tots els mòbils. Cadascú vota en privat.',
            '- A més de votar, cadascú prediu què ha votat la resta del grup.',
            '- Quan tothom ha votat, arriba la revelació. Es veu què ha triat el grup i qui ha encertat les seves prediccions, i comença el debat.',
            '- Al final de la partida, cada jugador rep un títol segons com ha votat i com ha predit els altres.',
          ],
        },
        {
          heading: 'Quin ambient triar',
          paragraphs: [
            '- Clàssica, amb dilemes per a qualsevol grup. És la millor opció per començar o per jugar amb gent que no coneixes gaire.',
            '- Picant, que afegeix temes d’adults. Només per a majors de 18 anys.',
            '- Sense filtre, que hi suma preguntes compromeses. En aquesta sala ningú no veu què vota cadascú.',
          ],
        },
        {
          heading: 'Com treure profit del debat',
          paragraphs: [
            'El millor del joc no és el vot sinó el que ve després. Quan el grup es divideix, demana a algú de cada bàndol que expliqui la seva raó en una frase. Gairebé sempre surt un detall del dilema en què l’altre bàndol no s’havia fixat.',
            'No hi ha respostes correctes. Cada dilema té a la seva pàgina els millors arguments a favor i en contra de cada opció, per si el debat s’encalla o voleu saber què en diu la filosofia.',
            'Les prediccions hi afegeixen una segona capa. Encertar què votarà el teu millor amic és més difícil del que sembla, i fallar sol donar peu a la millor conversa de la nit.',
          ],
        },
        {
          heading: 'Per a qui és',
          paragraphs: [
            'TheLever és per a majors de 16 anys. Funciona en un sopar amb amics, en una classe de filosofia o d’ètica, en una activitat d’equip o en una videotrucada amb gent que viu lluny.',
          ],
        },
      ],
    },
    about: {
      title: 'Qui fa TheLever',
      description:
        'Qui hi ha darrere de TheLever, com s’escriuen els seus dilemes, com es finança i com escriure’ns.',
      updated: GUIDES_UPDATED,
      sections: [
        {
          heading: 'Una persona',
          paragraphs: [
            'TheLever el fa una sola persona, que el dissenya, el programa i en selecciona els dilemes. És un projecte independent, sense inversors ni empresa al darrere.',
            'Va néixer d’una idea senzilla. Els dilemes morals són molt més interessants quan els discuteixes amb la teva gent que quan hi respons en solitari en un test.',
          ],
        },
        {
          heading: 'Com es fan els dilemes',
          paragraphs: [
            'Cada dilema del catàleg es revisa a mà abans de publicar-se. Alguns són versions de clàssics de la filosofia, com el tramvia o l’anell de Giges; la majoria són situacions quotidianes escrites per a TheLever.',
            'Els arguments a favor i en contra de cada opció es redacten amb ajuda d’intel·ligència artificial i es revisen un per un en castellà. Les traduccions als altres idiomes es fan amb intel·ligència artificial.',
            'Els arguments mai no diuen quina és l’opció correcta. El seu objectiu és que entenguis la millor raó de cada postura, també la de l’opció que no triaries.',
          ],
        },
        {
          heading: 'Com es finança',
          paragraphs: [
            'TheLever és gratis i ho continuarà sent. Es manté amb donacions voluntàries i, més endavant, també amb anuncis. Fer una donació no dona cap avantatge en el joc.',
          ],
        },
        {
          heading: 'Com escriure’ns',
          paragraphs: [
            'Per a qualsevol dubte sobre les teves dades, escriu a privacidad@thelever.app. A les pàgines de privacitat i d’avís legal, enllaçades al peu de cada pàgina, hi ha totes les dades del responsable.',
          ],
        },
      ],
    },
  },
  privacy: {
    title: 'Privacitat',
    description:
      'Quines dades tracta la web pública de TheLever, per a què i quins són els teus drets.',
    updated: UPDATED,
    sections: [
      {
        heading: 'Qui és el responsable',
        paragraphs: [
          'TheLever és un projecte de {owner}. Per a qualsevol qüestió sobre les teves dades, escriu a privacidad@thelever.app. Responem en castellà i en anglès.',
        ],
      },
      {
        heading: 'Quines dades tractem en aquesta web',
        paragraphs: [
          'Aquesta web només mostra dilemes: no té comptes, formularis ni galetes pròpies, i no et demana cap dada.',
          'Per enviar-te cada pàgina, el nostre proveïdor d’allotjament, Google Cloud (Firebase Hosting i Cloud Run), rep el que el teu navegador envia en qualsevol visita: la teva adreça IP, el teu navegador i la pàgina que demanes. Només ho fa servir per lliurar-te la pàgina i protegir-la d’abusos, pel nostre interès legítim a tenir un servei segur (art. 6.1.f RGPD). TheLever no guarda la teva adreça IP als seus registres.',
        ],
      },
      {
        heading: 'L’app',
        paragraphs: [
          'Si tries votar un dilema o jugar-lo amb el teu grup, passes a l’app de TheLever, que abans de jugar t’explica com tracta les teves dades i et demana el teu consentiment.',
        ],
      },
      {
        heading: 'Donacions',
        paragraphs: [
          'Si ens dones suport amb una donació a Ko-fi (Ko-fi Labs Limited, Regne Unit), Ko-fi ens dona el teu nom o el teu usuari, el teu correu, l’import i el missatge que escriguis. Els fem servir per gestionar i agrair la teva donació, per interès legítim (art. 6.1.f RGPD), i per complir les nostres obligacions fiscals (art. 6.1.c), i els guardem el temps que exigeix la llei fiscal, en general 4 anys. Mai no els vinculem a res del que fas a l’app. Ko-fi i qui processa el pagament (PayPal o Stripe) tracten les teves dades pel seu compte, segons les seves pròpies polítiques.',
        ],
      },
      {
        heading: 'Anuncis i galetes',
        paragraphs: [
          'Les pàgines dels dilemes mostren anuncis de Google AdSense. Abans de fer servir galetes, el gestor de galetes de Google et pregunta què acceptes, i Google només les fa servir amb el teu consentiment (art. 6.1.a RGPD i art. 22.2 LSSI). Si no ho acceptes, només veus anuncis limitats, sense galetes.',
          'Els anuncis només es personalitzen si ho acceptes: en aquesta web, que no et pregunta l’edat, depèn només d’això. Si el teu navegador envia el senyal Global Privacy Control, els anuncis no es personalitzen encara que ho acceptis. TheLever no dona a Google ni als seus socis el que votes a l’app.',
          'En carregar els anuncis, encara que no acceptis res, Google rep la teva adreça IP, les dades del teu navegador i la pàgina que visites. Ho permetem pel nostre interès legítim a finançar amb publicitat un joc gratuït (art. 6.1.f RGPD), i d’aquesta recollida en responem juntament amb Google. El que Google i els seus socis fan després amb aquestes dades i amb les seves galetes és responsabilitat seva, segons el que acceptis i les condicions de protecció de dades de Google Ads (business.safety.google/adscontrollerterms). Quines galetes són i com canviar el que acceptes és a la política de galetes; Google ho explica a policies.google.com/technologies/ads.',
        ],
      },
      {
        heading: 'Amb qui compartim les teves dades',
        paragraphs: [
          'No venem les teves dades. Google Cloud les tracta per compte nostre, amb contracte, només per allotjar la web. Google AdSense i els seus socis les reben com a responsables pel seu compte, com explica l’apartat d’anuncis. També podem haver de donar-les a les autoritats quan la llei ens hi obligui.',
        ],
      },
      {
        heading: 'Transferències fora de l’Espai Econòmic Europeu',
        paragraphs: [
          'Google pot tractar dades fora de l’Espai Econòmic Europeu, emparat en el Marc de Privacitat de Dades UE-EUA i en les clàusules contractuals tipus de la Comissió Europea.',
        ],
      },
      {
        heading: 'Quant de temps les guardem',
        paragraphs: [
          'TheLever no guarda res de la teva visita. Google conserva els seus registres tècnics el temps que necessita per a la seguretat del servei, i cada galeta dura el que indica la política de galetes.',
        ],
      },
      {
        heading: 'Els teus drets',
        paragraphs: [
          'Pots demanar accedir a les teves dades, rectificar-les, esborrar-les, limitar-ne l’ús, endur-te-les o oposar-te que les tractem escrivint a privacidad@thelever.app. Responem en un mes com a màxim.',
          'Si creus que no hem tractat bé les teves dades, pots reclamar davant l’Agència Espanyola de Protecció de Dades (aepd.es) o l’autoritat del teu país.',
        ],
      },
      {
        heading: 'Canvis en aquesta política',
        paragraphs: [
          'Si la canviem de manera important, ho direm en aquesta pàgina abans que t’afecti.',
        ],
      },
    ],
  },
  cookies: {
    title: 'Galetes',
    description:
      'Quines galetes es fan servir a la web pública de TheLever, per a què i com canviar el que acceptes.',
    updated: UPDATED,
    sections: [
      {
        heading: 'Què són',
        paragraphs: [
          'Les galetes són petits fitxers que una web guarda al teu navegador i torna a llegir després. Aquesta política també anomena «galetes» les tecnologies semblants, com l’emmagatzematge local del navegador.',
        ],
      },
      {
        heading: 'Les que fa servir aquesta web',
        paragraphs: [
          'TheLever no posa galetes pròpies en cap pàgina d’aquesta web. Les posen Google AdSense, que mostra els anuncis, i el gestor de galetes de Google, que et pregunta què acceptes. Totes són de Google, com a tercer, i només es carreguen a les pàgines dels dilemes: l’inici, les categories i les pàgines legals no tenen anuncis ni galetes.',
        ],
      },
      {
        heading: 'Les que no necessiten el teu consentiment',
        paragraphs: [
          'Només les que guarden la teva elecció, per respectar-la sense tornar-te-la a preguntar a cada pàgina: el que respons al gestor de galetes (FCCDCF) i, si no acceptes anuncis amb galetes, que no els acceptes (__gpi_optout).',
        ],
      },
      {
        heading: 'Les que necessiten el teu consentiment',
        paragraphs: [
          'Totes les altres, i Google només les fa servir si ho acceptes al gestor de galetes:',
          '- Per mostrar i mesurar els anuncis: guardar i llegir informació al teu dispositiu, limitar quantes vegades veus un anunci, mesurar com funciona i prevenir el frau. Si no ho acceptes, només veus anuncis limitats, sense galetes.',
          '- Per personalitzar els anuncis segons els teus interessos. En aquesta web, que no et pregunta l’edat, depèn només que ho acceptis. Si el teu navegador envia el senyal Global Privacy Control, els anuncis no es personalitzen encara que ho acceptis. Mai no es trien a partir del que votes a l’app.',
          'Google també pot guardar informació semblant a l’emmagatzematge local del navegador, per a les mateixes finalitats i amb el mateix consentiment.',
        ],
      },
      {
        heading: 'Taula de galetes',
        paragraphs: [
          'Els noms, les finalitats i les durades són els que publica Google a business.safety.google/adscookies, on hi ha la seva llista completa.',
        ],
        table: {
          headers: ['Galeta', 'De qui', 'Per a què', 'Durada'],
          rows: [
            [
              'FCCDCF',
              'Gestor de galetes de Google',
              'Guardar el que respons al gestor',
              '13 mesos',
            ],
            ['FCNEC', 'Gestor de galetes de Google', 'Estadístiques del gestor', '365 dies'],
            ['__gads', 'Google AdSense', 'Anuncis i seguretat', '13 mesos'],
            ['__gpi', 'Google AdSense', 'Anuncis i seguretat', '13 mesos'],
            [
              '__gpi_optout',
              'Google AdSense',
              'Recordar que no acceptes anuncis amb galetes',
              '13 mesos',
            ],
            ['__eoi', 'Google AdSense', 'Seguretat', '6 mesos'],
            [
              'TESTCOOKIESENABLED',
              'Google AdSense',
              'Comprovar si el teu navegador accepta galetes',
              '60 segons',
            ],
            ['IDE', 'Google (doubleclick.net)', 'Anuncis i seguretat', '13 mesos'],
            ['id', 'Google (doubleclick.net)', 'Anuncis, seguretat i funcionament', '13 mesos'],
            ['DSID', 'Google (doubleclick.net)', 'Anuncis, seguretat i funcionament', '2 setmanes'],
            [
              'test_cookie',
              'Google (doubleclick.net)',
              'Comprovar si el teu navegador accepta galetes',
              '15 minuts',
            ],
          ],
        },
      },
      {
        heading: 'Com canviar el que acceptes',
        paragraphs: [
          'A qualsevol pàgina d’un dilema, amb «Gestionar galetes» al peu: torna a obrir el gestor de galetes de Google, on pots retirar o canviar el teu consentiment tan fàcilment com el vas donar.',
          'També pots esborrar o bloquejar les galetes a la configuració del teu navegador.',
        ],
      },
      {
        heading: 'Tercers i transferències',
        paragraphs: [
          'Google i els socis publicitaris que acceptis fan servir les seves galetes com a responsables pel seu compte. El gestor de galetes segueix el Transparency and Consent Framework d’IAB Europe i et mostra qui són aquests socis i per a què fa servir cadascun les teves dades.',
          'Google pot tractar dades fora de l’Espai Econòmic Europeu, emparat en el Marc de Privacitat de Dades UE-EUA i en les clàusules contractuals tipus de la Comissió Europea. Ho explica a policies.google.com/technologies/ads.',
        ],
      },
      {
        heading: 'Més informació',
        paragraphs: [
          'Com tractem les teves dades és a la política de privacitat. Per a qualsevol dubte, escriu a privacidad@thelever.app.',
        ],
      },
    ],
  },
  legalNotice: {
    title: 'Avís legal',
    description: 'Qui hi ha darrere de TheLever i les condicions d’aquesta web.',
    updated: UPDATED,
    sections: [
      {
        heading: 'Titular',
        paragraphs: [
          '- Titular: {owner}.',
          '- NIF: {taxId}.',
          '- Domicili: {address}, Espanya.',
          '- Correu: privacidad@thelever.app.',
          '- Web i app: thelever.app.',
          '- Activitat: joc en línia gratuït finançat amb publicitat.',
        ],
      },
      {
        heading: 'Privacitat',
        paragraphs: [
          'Com tractem les dades en aquesta web és a la política de privacitat, i quines galetes fa servir, a la política de galetes. L’app explica la seva abans de jugar, i el seu ús es regeix per les seves condicions d’ús, que s’accepten en entrar.',
        ],
      },
      {
        heading: 'Propietat intel·lectual',
        paragraphs: [
          'La marca TheLever, el seu disseny i els dilemes i arguments del nostre equip són del seu titular, llevat que s’indiqui una altra llicència. El codi de l’app i d’aquesta web és programari lliure amb llicència AGPL-3.0.',
        ],
      },
      {
        heading: 'Enllaços i anuncis',
        paragraphs: [
          'No controlem els anuncis ni les webs a què enllacen. Si algun és il·lícit o inadequat, avisa’ns i el retirarem tan bon punt ho sapiguem.',
        ],
      },
      {
        heading: 'Contingut il·lícit',
        paragraphs: [
          'Pots denunciar contingut il·lícit escrivint a privacidad@thelever.app. També és el punt de contacte per a autoritats i usuaris del Reglament de Serveis Digitals (arts. 11 i 12), en castellà i en anglès.',
        ],
      },
      {
        heading: 'Llei aplicable',
        paragraphs: [
          'Llei espanyola. Si ets consumidor, conserves els drets que et donen les normes del teu país.',
        ],
      },
    ],
  },
  terms,
  appPrivacy,
  appCookies,
};
