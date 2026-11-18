import { Dialog } from 'radix-ui';
import { useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/icon.tsx';
import styles from './react-sheet.module.css';

/** The emojis at hand; with «+», any other the keyboard of the phone writes. */
export const QUICK_EMOJIS = ['😂', '😮', '🤔', '👏', '❤️'] as const;

/** One emoji of what the player typed: the first character as the eye sees it. */
function firstEmoji(text: string): string {
  const [first] = new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text.trim());
  return first?.segment ?? '';
}

interface ReactSheetProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** What the reaction is to: the dilemma, or who voted what. */
  readonly title: string;
  readonly subtitle?: string | undefined;
  readonly lead?: ReactNode;
  /** The label above the emojis. */
  readonly prompt: string;
  /** The reaction the player already has there, marked. */
  readonly current: string | null;
  readonly notes: readonly string[];
  readonly onReact: (emoji: string) => void;
}

/** To react with one emoji: five at hand and, with «+», any other. A new one replaces the one before. */
export function ReactSheet({
  open,
  onOpenChange,
  title,
  subtitle,
  lead,
  prompt,
  current,
  notes,
  onReact,
}: ReactSheetProps) {
  const { t } = useTranslation();
  const promptId = useId();
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState('');
  const choose = (emoji: string) => {
    if (emoji === '') return;
    onReact(emoji);
    setTyping(false);
    setTyped('');
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.sheet} aria-describedby={undefined}>
          <div aria-hidden="true" className={styles.handle} />
          <div className={styles.head}>
            {lead}
            <div className={styles.headText}>
              <Dialog.Title className={styles.title}>{title}</Dialog.Title>
              {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
            </div>
          </div>
          <span id={promptId} className={styles.prompt}>
            {prompt}
          </span>
          <div className={styles.emojis} role="group" aria-labelledby={promptId}>
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className={styles.emoji}
                aria-pressed={current === emoji}
                onClick={() => choose(emoji)}
              >
                {emoji}
              </button>
            ))}
            <button
              type="button"
              className={styles.more}
              aria-label={t('react.more')}
              aria-expanded={typing}
              onClick={() => setTyping(!typing)}
            >
              <Icon name="add" size={22} />
            </button>
          </div>
          {typing && (
            <form
              className={styles.typed}
              onSubmit={(event) => {
                event.preventDefault();
                choose(firstEmoji(typed));
              }}
            >
              <input
                className={styles.input}
                aria-label={t('react.anyEmoji')}
                placeholder={t('react.anyEmoji')}
                value={typed}
                maxLength={16}
                autoFocus
                onChange={(event) => setTyped(event.target.value)}
              />
              <button type="submit" className={styles.send} disabled={firstEmoji(typed) === ''}>
                {t('react.send')}
              </button>
            </form>
          )}
          {notes.map((note) => (
            <p key={note} className={styles.note}>
              {note}
            </p>
          ))}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
