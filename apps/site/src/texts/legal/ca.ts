import type { OwnPage } from '../site-texts.ts';

const UPDATED = '23 de novembre de 2026';

/** The terms of use of the app, version 1, which the first access asks to accept. */
export const terms: OwnPage = {
  title: 'Condicions d’ús',
  description:
    'Les condicions per jugar a TheLever: qui pot jugar, com funciona i quines normes hi ha.',
  updated: UPDATED,
  sections: [
    {
      heading: 'Qui presta el servei',
      paragraphs: [
        'TheLever és un servei de {owner}. Les seves dades completes són a l’avís legal. Per a qualsevol cosa, escriu a privacidad@thelever.app: responem en castellà i en anglès.',
      ],
    },
    {
      heading: 'Què és TheLever',
      paragraphs: [
        'TheLever és un joc gratuït per jugar en grup a dilemes morals des del navegador. Es paga amb anuncis. En acceptar aquestes condicions acceptes un acord amb nosaltres; com tractem les teves dades ho explica la política de privadesa de l’app.',
      ],
    },
    {
      heading: 'Qui pot jugar',
      paragraphs: [
        'Has de tenir com a mínim 16 anys si ets a l’Espai Econòmic Europeu i 18 si ets en un altre lloc. Declarar una edat falsa incompleix aquestes condicions.',
        'TheLever no està disponible en alguns països: els subjectes a sancions de la Unió Europea que arriben a tot el país, Rússia, la Xina, el Brasil i, de moment, el Regne Unit.',
        'Jugues sense compte, amb un identificador anònim del teu dispositiu. Ets responsable del que es faci des d’ell.',
      ],
    },
    {
      heading: 'Com funciona el joc',
      paragraphs: [
        'A cada sala, el grup respon els mateixos dilemes alhora i descobreix el resultat de cadascun. En una sala nominal, tothom veu què ha votat cadascú; en una sala anònima, només quants han triat cada opció. El que respons en una partida s’esborra abans de 24 hores des que es tanca la sala.',
        'Els dilemes poden tractar temes durs. Els dilemes +18 només es juguen en sales amb dilemes +18, on només poden entrar majors de 18 anys. Els dilemes compromesos, la resposta sincera dels quals et pot deixar en evidència davant d’algú de la sala, només es juguen en sales anònimes i si qui l’organitza els activa.',
      ],
    },
    {
      heading: 'Normes',
      paragraphs: [
        'En fer servir TheLever et comprometes a no fer servir sobrenoms amb contingut il·legal, d’odi, d’assetjament o que humiliïn ningú, ni amb dades d’altres persones; a no intentar esbrinar què ha votat cadascú en una sala anònima; i a no fer servir programes automàtics, saturar el servei, saltar-te les restriccions d’edat o de país, ni accedir a dades o parts del sistema que no són per a tu.',
      ],
    },
    {
      heading: 'Moderació i denúncies',
      paragraphs: [
        'Qualsevol jugador pot denunciar un dilema o un sobrenom des de la partida, i el nostre equip ho revisa. Si incompleixes aquestes condicions, podem substituir el teu sobrenom per un de genèric o impedir-te l’accés, i et direm el motiu, els fets, la norma aplicada i com reclamar.',
        'Qualsevol persona, jugui o no, pot denunciar contingut il·legal escrivint a privacidad@thelever.app, que també és el punt de contacte per a les autoritats.',
      ],
    },
    {
      heading: 'Anuncis',
      paragraphs: [
        'TheLever mostra anuncis, mai mentre votes, i els anuncis mai reben res del que votes. Només es personalitzen per a majors de 18 anys que ho accepten al gestor de galetes i el navegador dels quals no envia el senyal Global Privacy Control. No responem del contingut dels anuncis ni de les webs on porten, però ens pots avisar de qualsevol anunci inadequat.',
      ],
    },
    {
      heading: 'El que és nostre',
      paragraphs: [
        'El nom i la marca TheLever, el seu disseny i els dilemes que escriu el nostre equip són nostres, llevat que s’indiqui una altra llicència. El codi de l’app és obert, amb llicència AGPL-3.0, a github.com/thelever-app. Els avatars es generen amb DiceBear.',
      ],
    },
    {
      heading: 'Disponibilitat i responsabilitat',
      paragraphs: [
        'TheLever és gratuït i s’ofereix tal com és. Intentem que funcioni bé, però pot tenir errors o interrupcions, i podem canviar, aturar o tancar el servei, avisant-te amb una antelació raonable si és un tancament.',
        'No responem dels danys que no es deguin al nostre dol o culpa greu, en la mesura que la llei ho permeti. Res d’això limita els drets que et reconeix la llei de consumidors. Ets responsable dels sobrenoms que facis servir.',
      ],
    },
    {
      heading: 'Deixar de jugar',
      paragraphs: [
        'Pots deixar de fer servir TheLever quan vulguis i esborrar les teves dades a Configuració → Privadesa i dades → Esborrar les meves dades. Si incompleixes aquestes condicions de manera greu o repetida, podem impedir-te l’accés, amb la motivació de l’apartat de moderació.',
      ],
    },
    {
      heading: 'Canvis en aquestes condicions',
      paragraphs: [
        'Si les canviem de manera important, t’ho direm a l’app i les hauràs d’acceptar de nou abans de continuar jugant. Si no les acceptes, pots demanar-nos que esborrem les teves dades.',
      ],
    },
    {
      heading: 'Llei aplicable',
      paragraphs: [
        'Aquestes condicions es regeixen per la llei espanyola. Si ets consumidor, pots reclamar davant dels tribunals del teu domicili i conserves la protecció de les normes de consum del teu país. Versió 1.',
      ],
    },
  ],
};

/** The privacy policy of the app, which the game consent links to. */
export const appPrivacy: OwnPage = {
  title: 'Privadesa de l’app',
  description:
    'Quines dades tracta l’app de TheLever per jugar, amb quina base, quant de temps i quins són els teus drets.',
  updated: UPDATED,
  sections: [
    {
      heading: 'Qui és el responsable',
      paragraphs: [
        'TheLever és un projecte de {owner}. Per a qualsevol cosa sobre les teves dades, escriu a privacidad@thelever.app. Responem en castellà i en anglès.',
      ],
    },
    {
      heading: 'L’essencial',
      paragraphs: [
        'Jugar exigeix el teu consentiment explícit, perquè el que votes en dilemes morals pot revelar les teves conviccions i, en alguns dilemes, alguna cosa de la teva vida privada. El que respons en una partida s’esborra abans de 24 hores des que es tanca la sala. No fem servir les teves dades per investigar ni les venem a ningú, i els anuncis mai reben el que votes.',
      ],
    },
    {
      heading: 'Quines dades tractem, per a què i amb quina base',
      paragraphs: [
        '- Per jugar, amb el teu consentiment explícit (art. 6.1.a i 9.2.a RGPD): el teu sobrenom i el teu avatar; els teus vots, les teves prediccions del vot dels altres o del repartiment del grup, les teves reaccions i els teus punts; si un dilema tractava sobre tu; i l’ordre en què vas veure les opcions.',
        '- Per votar sol un dilema de la web, amb el mateix consentiment: el teu vot suma al resultat mundial sense que guardem què vas votar.',
        '- Per no repetir-te dilemes, amb el mateix consentiment: el teu mòbil guarda la llista de dilemes que has jugat, sense els teus vots, i l’envia en entrar en una sala, que només la fa servir per preparar les partides i l’esborra amb la sala.',
        '- Per valorar quins dilemes agraden i perquè ningú no compti dues vegades al resultat mundial, per interès legítim (art. 6.1.f): els teus «Bon dilema», que es guarden a part de la sala, i la marca que ja vas votar sol un dilema, sense el teu vot. No diuen què vas triar ni revelen les teves conviccions, així que no depenen del consentiment del joc i es queden si el retires. T’hi pots oposar escrivint-nos amb el teu codi per a peticions, i els esborrem.',
        '- Per reconèixer-te, per les condicions d’ús (art. 6.1.b): un identificador anònim del teu dispositiu i quan vas obrir l’app per última vegada.',
        '- Per complir la llei sobre l’edat (art. 6.1.c): el teu any de naixement i, si fas 18 anys aquest any o més endavant, el mes; i la teva regió (Espai Econòmic Europeu, resta del món o país on TheLever no està disponible), que deduïm de la teva adreça IP amb una base de dades al nostre propi servidor, IP Geolocation by DB-IP (db-ip.com, llicència CC BY 4.0). TheLever no guarda la teva IP; el nostre proveïdor d’accés, Firebase Authentication (Google), la registra unes setmanes per seguretat.',
        '- Per poder demostrar què vas acceptar (art. 6.1.c i 7.1): quina versió de les condicions i del consentiment vas acceptar i quan, i quan el vas retirar.',
        '- Per mesurar l’ús i millorar el joc, per interès legítim (art. 6.1.f): quan vas obrir l’app per primera vegada i des de quin enllaç hi vas arribar (per exemple, el d’un cartell); quan crees una sala o entres a la d’un altre; quan comença i acaba una partida i amb quants jugadors; i quant trigueu tu i el grup a respondre cada dilema, que s’esborra amb la partida. Mai els teus vots, les teves prediccions ni les teves reaccions, i sense galetes: ho registra el nostre servidor. La primera visita es registra abans que t’hi hagis pogut oposar. T’hi pots oposar a Configuració → Privadesa i dades → Els teus permisos: deixem de registrar-ho i esborrem els esdeveniments que teníem; els temps de les partides que encara es conserven s’esborren amb elles.',
        '- Per als anuncis, amb el teu consentiment (art. 6.1.a RGPD i art. 22.2 LSSI): les galetes i identificadors de la xarxa publicitària, segons el que triïs al gestor de galetes de Google.',
        '- Per moderar (obligació legal del Reglament de Serveis Digitals i interès legítim en un servei segur, art. 6.1.c i 6.1.f): el dilema o el sobrenom que denuncies, el motiu i el teu comentari, sense dir a ningú del grup que l’has denunciat; si denuncien el teu sobrenom, el sobrenom i la nostra decisió; si denuncies contingut il·legal des de la web, el que ens expliques i, si ens els dones, el teu nom i el teu correu per respondre’t; i els avisos de cada decisió.',
        '- Per atendre les teves peticions (art. 6.1.c): el teu correu, el que ens demanis i el codi per a peticions que et donem quan obres l’app per primera vegada, que veus a Configuració → Privadesa i dades → Les teves dades.',
        '- Perquè un esborrament no es desfaci si restaurem una còpia de seguretat (art. 6.1.c i 17): el teu identificador anònim, el motiu de l’esborrament i quan el vas demanar i quan va acabar.',
      ],
    },
    {
      heading: 'Què veu el teu grup',
      paragraphs: [
        'En una sala nominal, el teu grup veu a la revelació què has votat, quants han encertat el teu vot i les teves reaccions, i al final el teu lloc i els títols de la partida, que surten dels vots, les prediccions i les reaccions. En una sala anònima, ningú no veu el teu vot ni la teva predicció: només quants han triat cada opció i, si han votat menys de 3 persones, ni això. Quan votes sol, ningú no veu el teu vot: només el recompte mundial, sense noms, a partir de 20 respostes.',
        'Qualsevol jugador pot compartir fora de la sala una targeta amb el resultat: la personal no mostra els sobrenoms dels altres llevat que qui la comparteix ho triï, i la del grup només mostra el repartiment, sense noms.',
      ],
    },
    {
      heading: 'Menors',
      paragraphs: [
        'Per jugar cal tenir com a mínim 16 anys a l’Espai Econòmic Europeu i 18 a la resta del món. Els jugadors de 16 i 17 anys només juguen dilemes aptes per a la seva edat, no entren en sales amb dilemes +18 i els seus anuncis mai es personalitzen. Si l’edat que declares no arriba a la mínima, només guardem el teu any de naixement, el mes si el vas donar, la teva regió, quan vas obrir l’app per última vegada, el teu codi per a peticions i el registre de la teva primera visita, perquè no puguis jugar en aquest dispositiu, i ho esborrem després de 24 mesos sense obrir l’app. Si sabem per una altra via que algú no té l’edat mínima, esborrem les seves dades.',
      ],
    },
    {
      heading: 'Decisions automàtiques',
      paragraphs: [
        'L’app no et deixa jugar si l’edat que declares no arriba a la mínima de la teva regió o si ets en un país on no està disponible. Si creus que és un error, escriu-nos i ho revisarà una persona. No prenem cap altra decisió automàtica sobre tu.',
      ],
    },
    {
      heading: 'Amb qui compartim les teves dades',
      paragraphs: [
        'No venem les teves dades. Les tracten per compte nostre, amb contracte i només per prestar el servei, Google Cloud i Firebase (Google), que allotgen l’app, la seva base de dades i l’accés; Hostinger, que allotja el nostre correu i envia els nostres correus; i Anthropic, que tradueix a la teva llengua l’explicació d’una decisió de moderació. El gestor de galetes és de Google, i la xarxa publicitària i els seus socis tracten les seves galetes com a responsables pel seu compte, només si ho acceptes. També podem haver de donar dades a les autoritats quan la llei ens hi obligui.',
        'Si TheLever canvia de titular, per exemple en passar a una societat, les teves dades passaran al nou titular per continuar prestant-te el mateix servei, amb les mateixes finalitats i garanties (art. 21 de la LOPDGDD). T’avisarem a l’app abans del canvi i podràs demanar que les esborrem abans.',
      ],
    },
    {
      heading: 'Transferències fora de l’Espai Econòmic Europeu',
      paragraphs: [
        'Google i Anthropic poden tractar dades als Estats Units: Google, emparat en el Marc de Privadesa de Dades UE-EUA i en les clàusules contractuals tipus de la Comissió Europea; Anthropic, en aquestes mateixes clàusules, que formen part del seu contracte. Hostinger guarda el nostre correu a la Unió Europea.',
      ],
    },
    {
      heading: 'Quant de temps guardem les teves dades',
      paragraphs: [
        '- El que respons en una partida: menys de 24 hores des que es tanca la sala.',
        '- Els teus «Bon dilema» i la marca que has votat sol: fins que demanis esborrar les teves dades, t’hi oposis o passis 24 mesos sense obrir l’app.',
        '- La teva edat, la teva regió, el teu codi per a peticions i el que has acceptat: mentre facis servir l’app i, si esborres les teves dades, un registre mínim del que vas acceptar durant 3 anys.',
        '- Les dades d’ús amb el teu identificador: 13 mesos; després, només totals que no t’identifiquen.',
        '- Les denúncies, les decisions de moderació i els seus avisos, les teves peticions amb les nostres respostes i el registre dels teus esborraments: 3 anys. Si esborres les teves dades, les denúncies que vas fer queden sense cap vincle amb tu.',
        '- Les teves eleccions de galetes: el que fixi el gestor de galetes de Google, com a màxim 13 mesos.',
        '- El que esborrem continua uns dies a les còpies de seguretat: 7 dies a les nostres i fins a 180 a les de Firebase. Mentrestant no es fa servir per a res.',
      ],
    },
    {
      heading: 'Els teus drets',
      paragraphs: [
        'Pots demanar accés a les teves dades, rectificar-les, esborrar-les, limitar-ne l’ús, endur-te-les i oposar-te al seu tractament. A Configuració → Privadesa i dades pots, tu mateix:',
        '- A «Els teus permisos», retirar el consentiment del joc quan vulguis, sense que afecti el que ja s’ha tractat: no podràs crear sales ni entrar-hi fins que el tornis a donar, i esborrem el que vas respondre a les partides que encara no s’han esborrat; els teus «Bon dilema» i les marques dels teus vots sol es queden. També oposar-te a l’anàlisi d’ús.',
        '- A «Esborrar les meves dades», esborrar-les: el teu mòbil queda com nou al moment i esborrem tot el que està vinculat al teu identificador en pocs minuts, i com a màxim en un mes, excepte el registre mínim del que vas acceptar i el del teu esborrament.',
        'Si retires el consentiment o esborres les teves dades, a les sales que encara es conserven el teu sobrenom passa a ser «Jugador».',
        'Per a tota la resta, com demanar una còpia de les teves dades o corregir la teva edat, escriu a privacidad@thelever.app amb el codi que veus a Configuració → Privadesa i dades → Les teves dades: com que jugues sense compte, és el que ens permet saber que la petició és teva, i sense ell no la podem atendre. Si només ens vas denunciar alguna cosa des de la web, escriu-nos des del correu que ens vas donar. Responem en un mes com a màxim.',
        'Si creus que no hem tractat bé les teves dades, pots reclamar davant de l’Agència Espanyola de Protecció de Dades (aepd.es) o de l’autoritat del teu país.',
      ],
    },
    {
      heading: 'Si ets fora de la Unió Europea',
      paragraphs: [
        'De moment TheLever no està disponible al Regne Unit. Als Estats Units, no venem les teves dades personals ni les compartim per a publicitat sense el teu consentiment, i respectem el senyal Global Privacy Control del teu navegador com a rebuig dels anuncis personalitzats.',
      ],
    },
    {
      heading: 'Seguretat i canvis',
      paragraphs: [
        'Xifrem les dades en trànsit i en repòs, hi donem l’accés mínim, no guardem la teva IP a les nostres bases de dades i esborrem les partides soles. Si hi hagués una bretxa que t’afectés, t’avisaríem i avisaríem l’AEPD quan la llei ho demanés.',
        'Si canviem aquesta política de manera important, t’ho direm a l’app abans que t’afecti, i si el canvi requereix el teu consentiment, te’l tornarem a demanar.',
      ],
    },
  ],
};
