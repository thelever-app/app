import type { SiteTexts } from './site-texts.ts';

const UPDATED = '16 de novembre de 2026';

export const ca: SiteTexts = {
  languageName: 'Català',
  languageMenu: 'Idioma',
  languageMenuNote:
    'Et porta a aquesta mateixa pàgina en l’idioma que triïs. Si obres l’app des d’aquí, s’obrirà en aquest idioma.',
  homeLink: 'Inici',
  someoneInYourGroup: 'algú del teu grup',
  categories: {
    'life-and-death': {
      name: 'Vida i mort',
      description:
        'Dilemes en què hi ha vides en joc: el tramvia, el bot salvavides i altres decisions sense una sortida bona.',
    },
    honesty: {
      name: 'Honestedat',
      description:
        'Quan dir la veritat, quan callar i què estaries disposat a amagar, a qui i per què.',
    },
    loyalty: {
      name: 'Lleialtat',
      description:
        'Amics, família i companys: fins on arriba el que els deus quan xoca amb el que creus just.',
    },
    justice: {
      name: 'Justícia',
      description:
        'Càstigs, premis i normes: què és just quan la llei, la intenció i el resultat no coincideixen.',
    },
    'love-and-relationships': {
      name: 'Amor i relacions',
      description:
        'Parella, gelosia, secrets i ruptures: dilemes sobre el que faries per algú que estimes.',
    },
    'work-and-money': {
      name: 'Feina i diners',
      description:
        'Ascensos, sous, favors i dreceres: què faries quan els diners o la teva carrera estan en joc.',
    },
    'technology-and-the-future': {
      name: 'Tecnologia i futur',
      description:
        'Intel·ligència artificial, privacitat, robots i genètica: dilemes que fa poc eren ciència-ficció.',
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
      'Crea una sala i comparteix l’enllaç o el codi.',
      'A cada ronda, tots voteu el mateix dilema en privat i predieu els altres.',
      'Es revela el resultat i el comenteu. Al final, els títols de la partida.',
    ],
    categories: 'Categories',
  },
  category: {
    heading: (name) => `Dilemes morals: ${name.toLowerCase()}`,
    description: (name) =>
      `Dilemes morals sobre ${name.toLowerCase()} per jugar amb el teu grup a TheLever.`,
    options: (count) => `${count} opcions`,
    withArguments: 'arguments de cadascuna',
  },
  dilemma: {
    vote: 'Votar i veure què va fer el món',
    play: 'Jugar-lo amb el meu grup',
    worldResultLater:
      'El resultat mundial es veu en votar, perquè no influeixi en la teva resposta.',
    arguments: 'Arguments de cada opció',
    for: 'A favor:',
    against: 'En contra:',
    byTheTeam: 'Text de l’equip de TheLever.',
    moreOf: (name) => `Més dilemes: ${name.toLowerCase()}`,
  },
  gone: {
    title: 'Aquest dilema ja no és a TheLever',
    heading: 'Aquest dilema ja no és a TheLever',
    body: 'L’hem retirat del catàleg. Si algú t’ha passat aquest enllaç, n’hi ha molts d’altres que t’esperen.',
    moreOf: (name) => `Veure dilemes: ${name.toLowerCase()}`,
  },
  notFound: {
    title: 'Aquesta pàgina no existeix',
    heading: 'Aquesta pàgina no existeix',
    body: 'Potser l’adreça està mal escrita. Des de l’inici arribes a tots els dilemes.',
  },
  footer: { label: 'Informació legal' },
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
        heading: 'Anuncis i galetes',
        paragraphs: [
          'Ara per ara, aquesta web no mostra anuncis ni fa servir galetes. Quan en mostri, seran anuncis de Google AdSense: Google i els seus socis només faran servir galetes per mostrar-los o personalitzar-los si ho acceptes al gestor de galetes, que apareixerà abans de qualsevol anunci; si no ho acceptes, només veuràs anuncis limitats, sense galetes. Cap anunci rebrà el que votes a l’app.',
          'Google és responsable pel seu compte del que fa amb aquestes galetes. Pots saber-ne més a policies.google.com/technologies/ads.',
        ],
      },
      {
        heading: 'Amb qui compartim les teves dades',
        paragraphs: [
          'No venem les teves dades. Google Cloud les tracta per compte nostre, amb contracte, només per allotjar la web. També podem haver de donar-les a les autoritats quan la llei ens hi obligui.',
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
          'TheLever no guarda res de la teva visita. Google conserva els seus registres tècnics el temps que necessita per a la seguretat del servei.',
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
          'Com tractem les dades en aquesta web és a la política de privacitat. L’app explica la seva abans de jugar, i el seu ús es regeix per les seves condicions d’ús, que s’accepten en entrar.',
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
};
