import { lazy, Suspense, useState } from 'react';

const WorkshopRoom = lazy(() => import('./WorkshopRoom'));

/** Keep the optional spatial view out of the operational dashboard's way. */
export default function StudioHero({ workspace }: { workspace: 'employee' | 'admin' | 'tech' }) {
  const [open, setOpen] = useState(false);
  return <details className="workshop-disclosure" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary><span>Interactive service desk</span><small>Optional view</small></summary>
    {open && <Suspense fallback={<p className="workshop-loading" role="status">Loading service desk…</p>}><WorkshopRoom workspace={workspace} /></Suspense>}
  </details>;
}
