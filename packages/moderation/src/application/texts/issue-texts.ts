import type { DilemmaReportSnapshot } from '../../domain/entities/dilemma-report.ts';
import type { Entry } from '../../domain/entities/issue.ts';
import { DilemmaReport } from '../../domain/entities/dilemma-report.ts';
import { NicknameReport } from '../../domain/entities/nickname-report.ts';
import type { IssueContent } from '../../domain/vos/issue-content.vo.ts';
import type { ReportReason } from '../../domain/vos/report-reason.vo.ts';

// What the issues of the moderation repository say, in Spanish, the language of the team. Never
// who reported, the comment of a report or what a notice explains (RF-48): those stay in the
// database, where the team reads them with the query of the alert.

/** The label of the issues whose reports hid their dilemma. */
export const HIDDEN_LABEL = 'hidden-by-reports';

/** Each reason, as the team reads it. */
export const REASON_NAMES: Readonly<Record<ReportReason, string>> = {
  offensive: 'Ofensivo',
  confusing: 'Confuso',
  mistranslated: 'Mal traducido',
  impersonation: 'Suplanta a alguien',
  illegal: 'Puede ser ilegal',
  other: 'Otro',
};

const LONGEST_TITLE = 80;

function shortened(text: string): string {
  const line = text.replace(/\s+/g, ' ').trim();
  return line.length > LONGEST_TITLE ? `${line.slice(0, LONGEST_TITLE - 1)}…` : line;
}

function quoted(text: string): string {
  return text
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');
}

export function issueTitle(content: IssueContent, text: string | null): string {
  switch (content.kind) {
    case 'dilemma':
      return shortened(`Dilema: ${text ?? content.dilemmaId}`);
    case 'nickname':
      return shortened(`Apodo: ${content.nickname}`);
    case 'reference':
      return shortened(`Denuncia web: ${content.reference}`);
  }
}

/** What reached the issue, in a line: who sent it, as a kind, the reason and the language read. */
export function entryLine(entry: Entry): string {
  if (entry instanceof DilemmaReport) {
    const { reason, language, version }: DilemmaReportSnapshot = entry.toSnapshot();
    return `Reporte de un jugador · ${REASON_NAMES[reason]} · versión ${version}, leída en ${language}`;
  }
  if (entry instanceof NicknameReport) {
    return `Reporte de un jugador · ${REASON_NAMES[entry.reason]}`;
  }
  return `Denuncia desde el formulario web · ${REASON_NAMES.illegal} · escrita en ${entry.toSnapshot().language}`;
}

export function issueBody(content: IssueContent, text: string | null, first: Entry): string {
  const about = (() => {
    switch (content.kind) {
      case 'dilemma':
        return `Dilema \`${content.dilemmaId}\`:\n\n${quoted(text ?? '(sin texto)')}`;
      case 'nickname':
        return `Apodo de un jugador:\n\n${quoted(content.nickname)}`;
      case 'reference':
        return `Una denuncia que no apunta a ningún dilema del catálogo. Lo que escribió quien la envió:\n\n${quoted(content.reference)}`;
    }
  })();
  return [
    about,
    `**Primer aviso:** ${entryLine(first)}`,
    'Decide con una etiqueta (`withdraw` para retirarlo, `restore` o `keep` para mantenerlo) y un comentario con dos líneas, `Hechos:` con lo que has visto, sin datos personales, y `Regla:` con el apartado de las condiciones de uso; después cierra el issue.',
    'Si ves una amenaza para la vida o la seguridad de alguien, avisa sin demora a la policía (art. 18 del Reglamento de Servicios Digitales).',
  ].join('\n\n');
}

export function receivedComment(entry: Entry): string {
  return `**Otro aviso:** ${entryLine(entry)}`;
}

export const HIDDEN_COMMENT =
  'Oculto de las partidas nuevas: lo han reportado 3 jugadores distintos. Con `restore` o `keep` vuelve a las partidas; con `withdraw` se retira.';

/** Why the job did not apply what the team did when closing the issue, and what to do. */
export type DecisionProblem = 'no-decision' | 'several-decisions' | 'no-reasons';

export const PROBLEM_COMMENTS: Readonly<Record<DecisionProblem, string>> = {
  'no-decision':
    'Lo he vuelto a abrir: se cerró sin decisión. Añade la etiqueta `withdraw`, `restore` o `keep` y un comentario con `Hechos:` y `Regla:`, y ciérralo otra vez.',
  'several-decisions':
    'Lo he vuelto a abrir: tiene más de una etiqueta de decisión. Deja solo una de `withdraw`, `restore` y `keep` y ciérralo otra vez.',
  'no-reasons':
    'Lo he vuelto a abrir: falta el comentario con la motivación. Escribe uno con una línea `Hechos:` y otra `Regla:` y ciérralo otra vez.',
};
