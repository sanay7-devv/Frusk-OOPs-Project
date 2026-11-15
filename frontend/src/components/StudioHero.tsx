import { Link } from 'react-router-dom';
import WorkshopRoom from './WorkshopRoom';

const COPY = {
  employee: { label: 'YOUR SERVICE DESK', title: <>Make work<br /><em>work again.</em></>, text: 'Big blocker or little glitch. Start a report, follow the fix, and get back to what matters.', action: 'Report an issue', to: '/employee/report', stage: 0 },
  admin: { label: 'THE BIG PICTURE', title: <>Every action.<br /><em>Accounted for.</em></>, text: 'Keep the moving parts moving. Follow incidents, find the pressure points, and see the whole story.', action: 'Explore incidents', to: '/admin/tickets', stage: 2 },
  tech: { label: 'THE REPAIR DEPARTMENT', title: <>Good fixes.<br /><em>Better days.</em></>, text: 'Pick up the next challenge. Turn a reported problem into someone’s productive afternoon.', action: 'Go to your queue', to: '#work-queue', stage: 1 },
};
export default function StudioHero({ workspace }: { workspace: keyof typeof COPY }) {
  const copy = COPY[workspace];
  return <section className="studio-hero studio-hero--workshop">
    <div className="studio-hero-copy"><div className="eyebrow"><span className="shape-dot" />{copy.label}</div>
      <h1>{copy.title}</h1><p>{copy.text}</p>
      {copy.to.startsWith('#') ? <a href={copy.to} className="studio-button">{copy.action}<span>↘</span></a> : <Link to={copy.to} className="studio-button">{copy.action}<span>↗</span></Link>}
      <span className="hero-edition">PEOPLE. PROCESS. PROGRESS.</span>
    </div><WorkshopRoom workspace={workspace} />
  </section>;
}
