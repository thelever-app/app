import styles from './station-line.module.css';

interface StationLineProps {
  readonly stations: number;
  /** How many stations the player has passed. */
  readonly passed: number;
}

/** The tram line with one station per dilemma. Decorative: the position is also said in words. */
export function StationLine({ stations, passed }: StationLineProps) {
  return (
    <div aria-hidden="true" className={styles.line} data-complete={passed >= stations}>
      {Array.from({ length: stations }, (_, index) => (
        <span
          key={index}
          className={styles.station}
          data-station={index < passed ? 'passed' : index === passed ? 'current' : 'next'}
        />
      ))}
    </div>
  );
}
