import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

const STAGES = [
  { name: 'Report', number: '01', title: 'A small signal. A clear starting point.', text: 'Tell us what happened. Give your issue a place to go.', colour: 'red' },
  { name: 'Resolve', number: '02', title: 'The right hands. The next good fix.', text: 'A technician picks it up. You follow every step.', colour: 'blue' },
  { name: 'Audit', number: '03', title: 'Every action leaves a trace.', text: 'From the first report to the final fix, the story stays together.', colour: 'yellow' },
];

/** An original vector illustration: the same ticket travels through three service stages. */
export default function ServicePoster({ initialStage = 0, compact = false }: { initialStage?: number; compact?: boolean }) {
  const [stage, setStage] = useState(initialStage);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const current = STAGES[stage];
  const go = (direction: number) => setStage(value => (value + direction + STAGES.length) % STAGES.length);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault(); go(event.key === 'ArrowRight' ? 1 : -1);
    }
  };
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as Element).closest('button')) return;
    pointer.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointer.current) return;
    const dx = event.clientX - pointer.current.x;
    const dy = event.clientY - pointer.current.y;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
    pointer.current = null;
  };

  return (
    <section className={`service-poster ${compact ? 'service-poster--compact' : ''} poster--${current.colour}`} aria-label="The journey of an incident">
      <div className="poster-caption"><span>THE SERVICE CYCLE</span><span>I—ITSM / {current.number}</span></div>
      <div className="poster-art" tabIndex={0} role="group" aria-label="Interactive service illustration. Swipe or use left and right arrow keys to change stages."
        onKeyDown={onKeyDown} onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => { pointer.current = null; }}>
        <div className="poster-orbit" aria-hidden="true" />
        <span className="poster-stage-number" aria-hidden="true">{current.number}</span>
        <div className="poster-device" key={stage}>
          <svg viewBox="0 0 620 430" fill="none" aria-hidden="true">
            <path d="M64 378H570" stroke="var(--ink)" strokeWidth="2" />
            <path d="M136 75 476 41 501 298 160 333Z" fill="var(--ink)" stroke="var(--ink)" strokeWidth="3" />
            <path d="M149 86 462 56 484 285 171 317Z" fill="var(--paper)" stroke="var(--ink)" strokeWidth="3" />
            <path d="m160 333 341-35 68 65-370 39-78-49Z" fill="var(--yellow)" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
            <path d="m121 353 78 49 370-39v10l-370 38-78-48Z" fill="var(--ink)" stroke="var(--ink)" strokeWidth="3" />
            <path d="m179 343 310-32 37 33-310 34Z" fill="var(--paper)" stroke="var(--ink)" strokeWidth="2" />
            {[0, 1, 2].map(row => <path key={row} d={`m${190 + row * 10} ${349 + row * 8} 297-31`} stroke="var(--ink)" strokeWidth="2" />)}
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(col => <path key={col} d={`m${204 + col * 27} ${341 - col * 2.8} 28 26`} stroke="var(--ink)" strokeWidth="2" />)}
            <path d="m315 377 72-8 13 10-72 8Z" fill="var(--ink)" />
            <path d="m158 106 305-30" stroke="var(--ink)" strokeWidth="2" />
            <circle cx="173" cy="96" r="3" fill="var(--red)" /><circle cx="185" cy="95" r="3" fill="var(--yellow)" /><circle cx="197" cy="94" r="3" fill="var(--blue)" />
            <g className="screen-content">
              {stage === 0 ? <>
                <path d="m213 142 181-18 12 126-181 18Z" fill="var(--red)" stroke="var(--ink)" strokeWidth="2" />
                <path d="m228 156 80-8m-78 25 141-14m-139 33 141-14m-137 33 92-9" stroke="var(--paper)" strokeWidth="5" />
                <path d="m358 227 23-2 3 22-23 3Z" fill="var(--yellow)" />
                <path d="m354 236 16-16m0 0 1 10m-1-10-10 1" stroke="var(--ink)" strokeWidth="3" />
              </> : stage === 1 ? <>
                <circle cx="312" cy="201" r="67" fill="var(--blue)" stroke="var(--ink)" strokeWidth="2" />
                <path d="m284 230 58-71m-5 3-15-5 2-19 20 17 20 2-1 19-19 1m-60 53-15 3-5-16 16-7" stroke="var(--paper)" strokeWidth="9" strokeLinejoin="round" />
                <path d="m213 284 61-6m98-122 58-6" stroke="var(--ink)" strokeWidth="4" />
              </> : <>
                <path d="m234 138 144-14 13 138-144 15Z" fill="var(--yellow)" stroke="var(--ink)" strokeWidth="2" />
                {[0, 1, 2, 3].map(row => <g key={row}><path d={`m258 ${160 + row * 25} 10 9 15-21`} stroke="var(--ink)" strokeWidth="3" /><path d={`m293 ${160 + row * 25} 62-6`} stroke="var(--ink)" strokeWidth="3" /></g>)}
                <circle cx="389" cy="249" r="31" fill="var(--blue)" stroke="var(--ink)" strokeWidth="2" /><path d="m375 249 10 10 20-23" stroke="var(--paper)" strokeWidth="5" />
              </>}
            </g>
            <path d="M63 237h47v47H63z" fill="var(--blue)" stroke="var(--ink)" strokeWidth="2" />
            <circle cx="513" cy="135" r="27" fill="var(--yellow)" stroke="var(--ink)" strokeWidth="2" />
            <path d="m510 219 35 52h-61Z" fill="var(--red)" stroke="var(--ink)" strokeWidth="2" />
          </svg>
        </div>
        <span className="poster-swipe-hint">← SWIPE THE STORY →</span>
      </div>
      <div className="poster-story" aria-live="polite" aria-atomic="true"><strong key={stage}>{current.title}</strong>{!compact && <p>{current.text}</p>}</div>
      <div className="poster-stops" role="group" aria-label="Choose a service stage">
        {STAGES.map((item, index) => <button type="button" key={item.name} aria-pressed={index === stage} onClick={() => setStage(index)}><span>{item.number}</span>{item.name}<span aria-hidden="true">↗</span></button>)}
      </div>
    </section>
  );
}
