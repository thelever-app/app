import { Dialog } from 'radix-ui';
import { type ReactNode, useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/icon.tsx';
import { describeCard, peopleOn, type CardContent } from './card-content.ts';
import { CARD_HEIGHT, CARD_WIDTH, drawCard } from './draw-card.ts';
import { shareImage } from './share-image.ts';
import styles from './share-card-sheet.module.css';

interface ShareCardSheetProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly title: string;
  /** The same object while nothing on the card changes, so it is drawn again only when it does. */
  readonly content: CardContent;
  readonly fileName: string;
  /** Below the card: the switch of the nicknames of the others, or a note. */
  readonly children?: ReactNode;
}

/**
 * The card as it will be shared, drawn on a canvas the player sees, and the button that hands the
 * image to the menu of the phone. Who cannot see it reads what it says.
 */
export function ShareCardSheet({
  open,
  onOpenChange,
  title,
  content,
  fileName,
  children,
}: ShareCardSheetProps) {
  const { t } = useTranslation();
  const titleId = useId();
  // The canvas itself, to draw on it and take the image out of it: React only puts it on the page.
  // The sheet mounts it a render after it opens, so the canvas is state: arriving, it draws.
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [drawn, setDrawn] = useState<CardContent | undefined>(undefined);

  useEffect(() => {
    const context = canvas?.getContext('2d');
    if (!open || !context) return;
    let current = true;
    void drawCard(context, content).then(() => {
      if (current) setDrawn(content);
    });
    return () => {
      current = false;
    };
  }, [open, canvas, content]);

  const share = () => {
    canvas?.toBlob((blob) => {
      if (blob) void shareImage(blob, fileName, title);
    }, 'image/png');
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.sheet} aria-describedby={undefined}>
          <div className={styles.head}>
            <Dialog.Title id={titleId} className={styles.title}>
              {title}
            </Dialog.Title>
            <Dialog.Close className={styles.close} aria-label={t('card.close')}>
              <Icon name="close" size={24} />
            </Dialog.Close>
          </div>
          <canvas
            ref={setCanvas}
            className={styles.card}
            width={CARD_WIDTH}
            height={CARD_HEIGHT}
            role="img"
            aria-label={describeCard(content, t)}
            data-testid="share-card"
            data-avatars={peopleOn(content)
              .map(({ avatar }) => `${avatar.face}:${avatar.color}`)
              .join(' ')}
          />
          {children}
          <button
            type="button"
            className={styles.share}
            disabled={drawn !== content}
            onClick={share}
          >
            <Icon name="iosShare" size={20} />
            {t('card.share')}
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
