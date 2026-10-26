/**
 * Progress and timeline calculation utilities
 */

/**
 * Calculates progress percentage between 0 and 100 towards a target value.
 */
export function calculateProgressPercent(current: number, target: number): number {
  if (!target || target <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round((current / target) * 100)));
}

/**
 * Calculates the progress ratio (0 to 1) and percentage (0 to 100) within a specific segment
 * defined by start and end points.
 */
export function calculateSegmentProgress(
  current: number,
  start: number,
  end: number
): { ratio: number; percent: number } {
  const range = end - start;
  if (range <= 0) {
    const isCompleted = current >= end;
    return { ratio: isCompleted ? 1 : 0, percent: isCompleted ? 100 : 0 };
  }
  const ratio = Math.max(0, Math.min(1, (current - start) / range));
  const percent = Math.min(100, Math.max(0, Math.round(ratio * 100)));
  return { ratio, percent };
}

/**
 * Maps a segment's progress percentage (0-100%) to a visual range (default 18-100%)
 * so that any progress line visibly emerges from behind circular node bullets.
 */
export function getVisualSegmentProgress(
  segmentPercent: number,
  minVisibleOffset = 18,
  maxOffset = 100
): number {
  if (segmentPercent <= 0) return 0;
  const scale = (maxOffset - minVisibleOffset) / 100;
  return Math.max(
    minVisibleOffset,
    Math.min(maxOffset, Math.round(segmentPercent * scale + minVisibleOffset))
  );
}
