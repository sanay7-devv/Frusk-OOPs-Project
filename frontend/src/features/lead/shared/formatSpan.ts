import { formatDurationMs } from '../../../utils/format';

/** "5d 16h", "3h 12m" or "40m" for a span in milliseconds. */
export const formatSpan = (ms: number) => formatDurationMs(Math.abs(ms));
