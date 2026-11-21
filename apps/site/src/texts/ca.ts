import { appPrivacy, terms } from './legal/ca.ts';
import type { SiteTexts } from './site-texts.ts';

const UPDATED = '17 de novembre de 2026';

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
};
