import { useEffect, useId, useRef } from 'react';

// Measure the moving DOM, including horizontal scrolling. Lines never receive pointer events.
export default function PortfolioNewsConnections({ rootRef, pairs, selected }) {
  const svg = useRef(null), path = useRef(null), detailPath = useRef(null), clip = useRef(null);
  const clipId = useId().replace(/:/g, '');
  const signature = JSON.stringify(pairs);
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !svg.current) return undefined;
    const track = root.querySelector('.portfolio-news-track');
    let frame;
    let until = 0;
    function measure() {
      const bounds = root.getBoundingClientRect(), viewport = track.getBoundingClientRect();
      const rects = new Map([...root.querySelectorAll('[data-news-card]')].map(el => [el.dataset.newsCard, el.getBoundingClientRect()]));
      const detail = root.querySelector('.portfolio-news-detail');
      if (detail && selected) rects.set(selected, detail.getBoundingClientRect());
      const x = value => value - bounds.left, y = value => value - bounds.top;
      svg.current.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
      for (const [key, value] of Object.entries({ x: x(viewport.left), y: y(viewport.top), width: viewport.width, height: viewport.height })) clip.current.setAttribute(key, value);
      const normal = [], expanded = [];
      const visible = rect => rect.left >= viewport.left - 1 && rect.right <= viewport.right + 1;
      const visibleCards = [...rects.entries()].filter(([code, rect]) => code !== selected && visible(rect)).map(([, rect]) => rect);
      const bottomLane = y(Math.max(viewport.top, ...visibleCards.map(rect => rect.bottom))) + 6;
      for (const [a, b] of pairs) {
        let left = rects.get(a), right = rects.get(b);
        if (!left || !right || !left.width || !right.width) continue;
        const isDetail = a === selected || b === selected;
        if (isDetail) {
          const source = a === selected ? left : right, target = a === selected ? right : left;
          // Only connect visible card edges; do not draw over a clipped card or the detail text.
          if (!visible(target)) continue;
          const heading = detail.querySelector('h3').getBoundingClientRect();
          if (target.top >= source.bottom) {
            const lane = x(viewport.left) + 5;
            expanded.push(`M ${x(source.left)} ${y(source.bottom) - 14} H ${lane} V ${y(target.top + target.height / 2)} H ${x(target.left)}`);
          } else {
            const startY = y(heading.top + heading.height / 2), lane = x(source.right) + 10;
            const endY = y(target.top + target.height / 2);
            if (target.left - source.right <= 48) {
              expanded.push(`M ${x(source.right)} ${startY} H ${lane} V ${endY} H ${x(target.left)}`);
            } else {
              expanded.push(`M ${x(source.right)} ${startY} H ${lane} V ${bottomLane} H ${x(target.left) - 8} V ${endY} H ${x(target.left)}`);
            }
          }
          continue;
        }
        // Hide the whole connection when an endpoint is outside the horizontal window.
        // Clipping a partial connection leaves a misleading loose end at the viewport edge.
        if (!visible(left) || !visible(right)) continue;
        if (left.left > right.left || (Math.abs(left.left - right.left) < 2 && left.top > right.top)) [left, right] = [right, left];
        if (Math.abs(left.left - right.left) < 2) {
          const center = x(left.left + left.width / 2);
          normal.push(`M ${center} ${y(left.bottom)} V ${y(right.top)}`);
        } else {
          const startY = y(left.top + left.height / 2), endY = y(right.top + right.height / 2);
          if (right.left - left.right <= 32) {
            normal.push(`M ${x(left.right)} ${startY} H ${x((left.right + right.left) / 2)} V ${endY} H ${x(right.left)}`);
          } else {
            normal.push(`M ${x(left.right)} ${startY} H ${x(left.right) + 8} V ${bottomLane} H ${x(right.left) - 8} V ${endY} H ${x(right.left)}`);
          }
        }
      }
      path.current.setAttribute('d', normal.join(' '));
      detailPath.current.setAttribute('d', expanded.join(' '));
    }
    function tick(now) { measure(); if (now < until) frame = requestAnimationFrame(tick); }
    function refresh() {
      measure();
      if (typeof requestAnimationFrame !== 'function') return;
      cancelAnimationFrame(frame);
      until = performance.now() + 550;
      frame = requestAnimationFrame(tick);
    }
    refresh();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(refresh) : null;
    [root, track, ...root.querySelectorAll('[data-news-card], .portfolio-news-detail')].forEach(el => observer?.observe(el));
    track.addEventListener('scroll', refresh, { passive: true });
    window.addEventListener('resize', refresh);
    return () => {
      observer?.disconnect(); track.removeEventListener('scroll', refresh); window.removeEventListener('resize', refresh);
      if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame);
    };
  }, [rootRef, signature, selected]);
  return <svg ref={svg} className="portfolio-news-connections" aria-hidden="true" focusable="false">
    <defs><clipPath id={clipId}><rect ref={clip} /></clipPath></defs>
    <path ref={path} clipPath={`url(#${clipId})`} />
    <path ref={detailPath} />
  </svg>;
}
