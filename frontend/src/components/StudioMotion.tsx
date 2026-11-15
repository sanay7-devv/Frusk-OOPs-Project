import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

/** Viewport-triggered motion; content stays readable if animation APIs are absent. */
export default function StudioMotion() {
  const { pathname } = useLocation();
  const progress = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(preference.matches);
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const disabled = paused || reduced || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.documentElement.dataset.studioMotion = disabled ? 'off' : 'on';
    if (disabled || !('IntersectionObserver' in window)) return;

    const seen = new WeakSet<Element>();
    const animations = new Set<Animation>();
    const observer = new IntersectionObserver(entries => {
      let order = 0;
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        if (typeof entry.target.animate !== 'function') return;
        const illustration = entry.target.matches('.service-poster');
        const animation = entry.target.animate([
          { opacity: 0, transform: illustration ? 'translateY(36px) rotate(2deg) scale(.96)' : 'translateY(28px)' },
          { opacity: 1, transform: 'translateY(0) rotate(0) scale(1)' },
        ], { duration: illustration ? 950 : 700, delay: Math.min(order++, 3) * 75, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' });
        animations.add(animation);
        animation.onfinish = () => animations.delete(animation);
      });
    }, { threshold: .06, rootMargin: '0px 0px -18px 0px' });

    const discover = () => {
      document.querySelectorAll('.studio-hero-copy > *, .auth-editorial > h1, .auth-form-heading, .service-poster, .studio-section-title, .incident-card, .audit-summary > div, .audit-timeline li, .studio-route .MuiPaper-root').forEach(element => {
        // Animate the outer card once, rather than every nested MUI surface.
        if (seen.has(element) || element.parentElement?.closest('.MuiPaper-root') || element.closest('[role="dialog"]')) return;
        seen.add(element);
        observer.observe(element);
      });
    };
    discover();
    const mutations = new MutationObserver(discover);
    mutations.observe(document.getElementById('root')!, { childList: true, subtree: true });
    let frame = 0;
    const updateProgress = () => {
      frame = 0;
      const distance = document.documentElement.scrollHeight - window.innerHeight;
      if (progress.current) progress.current.style.transform = `scaleX(${distance > 0 ? Math.min(1, Math.max(0, window.scrollY / distance)) : 0})`;
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(updateProgress); };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    updateProgress();
    return () => {
      observer.disconnect();
      mutations.disconnect();
      animations.forEach(animation => animation.cancel());
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
      delete document.documentElement.dataset.studioMotion;
    };
  }, [pathname, paused, reduced]);

  return <>
    <div className="studio-scroll-progress" ref={progress} aria-hidden="true" />
    {!reduced && <button type="button" className="studio-motion-toggle" aria-pressed={paused} aria-label={paused ? 'Resume animations' : 'Pause animations'} onClick={() => setPaused(value => !value)}><span aria-hidden="true">{paused ? '▷' : 'Ⅱ'}</span> Motion {paused ? 'off' : 'on'}</button>}
  </>;
}
