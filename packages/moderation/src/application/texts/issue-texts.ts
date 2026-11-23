import type { DilemmaReportSnapshot } from '../../domain/entities/dilemma-report.ts';
import type { Entry } from '../../domain/entities/issue.ts';
import { DilemmaReport } from '../../domain/entities/dilemma-report.ts';
import { NicknameReport } from '../../domain/entities/nickname-report.ts';
import type { IssueContent } from '../../domain/vos/issue-content.vo.ts';
import type { ReportReason } from '../../domain/vos/report-reason.vo.ts';

// What the issues of the moderation repository say, in Spanish, the language of the team. Never a
// personal datum, since GitHub has no agreement to process them: not who reported, the comment of a
// report, what a notice explains, the nickname reported nor what someone wrote in a notice. Those
// stay in the database, where the team reads them in Cloud SQL Studio with the query of the issue.

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
      return 'Apodo de un jugador';
    case 'reference':
      return 'Denuncia web';
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

/** The query that shows the team, in Cloud SQL Studio, what of the issue cannot go in it. */
function queryOf(column: 'nickname' | 'reference', issueId: string): string {
  return ['```sql', `select ${column} from moderation_issues where id = '${issueId}';`, '```'].join(
    '\n',
  );
}

export function issueBody(
  issueId: string,
  content: IssueContent,
  text: string | null,
  first: Entry,
): string {
  const about = (() => {
    switch (content.kind) {
      case 'dilemma':
        return `Dilema \`${content.dilemmaId}\`:\n\n${quoted(text ?? '(sin texto)')}`;
      case 'nickname':
        return `El apodo de un jugador. No va aquí, porque es un dato personal: léelo en Cloud SQL Studio.\n\n${queryOf('nickname', issueId)}`;
      case 'reference':
        return `Una denuncia que no apunta a ningún dilema del catálogo ni al apodo de un jugador de una sala que se conserve. Lo que escribió quien la envió no va aquí, porque puede llevar datos personales: léelo en Cloud SQL Studio.\n\n${queryOf('reference', issueId)}`;
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
export type DecisionProblem =
  'no-decision' | 'several-decisions' | 'no-reasons' | 'nothing-to-withdraw';

export const PROBLEM_COMMENTS: Readonly<Record<DecisionProblem, string>> = {
  'no-decision':
    'Lo he vuelto a abrir: se cerró sin decisión. Añade la etiqueta `withdraw`, `restore` o `keep` y un comentario con `Hechos:` y `Regla:`, y ciérralo otra vez.',
  'several-decisions':
    'Lo he vuelto a abrir: tiene más de una etiqueta de decisión. Deja solo una de `withdraw`, `restore` y `keep` y ciérralo otra vez.',
  'no-reasons':
    'Lo he vuelto a abrir: falta el comentario con la motivación. Escribe uno con una línea `Hechos:` y otra `Regla:` y ciérralo otra vez.',
  'nothing-to-withdraw':
    'Lo he vuelto a abrir: esta denuncia no apunta a un dilema del catálogo ni a un apodo de una sala que se conserve, así que no hay nada que yo pueda retirar. Cámbiala a `keep`, explica en `Hechos:` qué encontraste y ciérralo otra vez: a quien la envió le diremos que no lo hemos encontrado.',
};
