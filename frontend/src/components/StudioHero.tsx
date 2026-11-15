import { Link } from 'react-router-dom';
import WorkshopRoom from './WorkshopRoom';

const COPY = {
  employee: { label: 'EMPLOYEE WORKSPACE', title: 'Service overview', text: 'Report an incident, review your requests and track resolution progress.', action: 'Report incident', to: '/employee/report' },
  admin: { label: 'SERVICE OPERATIONS', title: 'Incident dashboard', text: 'Monitor incident activity, service performance and operational workload.', action: 'Manage tickets', to: '/admin/tickets' },
  tech: { label: 'TECHNICIAN WORKSPACE', title: 'Assigned incidents', text: 'Review your queue, manage active incidents and update resolution progress.', action: 'View queue', to: '#work-queue' },
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
