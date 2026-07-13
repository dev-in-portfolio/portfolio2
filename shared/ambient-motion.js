(function () {
  'use strict';

  if (window.NexusAmbientMotion) return;

  if (!document.querySelector('style[data-nx-ambient-style]')) {
    const ambientStyle = document.createElement('style');
    ambientStyle.dataset.nxAmbientStyle = 'true';
    ambientStyle.textContent = '.nx-ambient-host {\n  position: relative;\n  isolation: isolate;\n}\n\n.nx-ambient-layer {\n  display: block;\n  pointer-events: none;\n  user-select: none;\n  contain: strict;\n}\n\n.nx-ambient-host--workspace > .nx-ambient-layer {\n  position: absolute;\n  inset: 0;\n  z-index: 0;\n  width: 100%;\n  height: 100%;\n  opacity: .32;\n}\n\n.nx-ambient-host--workspace > :not(.nx-ambient-layer) {\n  position: relative;\n  z-index: 1;\n}\n\n.nx-ambient-host--hero > .nx-ambient-layer {\n  position: absolute;\n  inset: 0;\n  z-index: -1;\n  width: 100%;\n  height: 100%;\n  opacity: .38;\n}\n\n.page-contact .nx-ambient-host--hero > .nx-ambient-layer {\n  z-index: 0;\n  opacity: 1;\n}\n\n.page-contact .heroInner {\n  position: relative;\n  z-index: 1;\n}\n\n.nx-ambient-ripple {\n  position: absolute;\n  width: 18px;\n  height: 18px;\n  margin: -9px 0 0 -9px;\n  border: 1px solid rgba(121, 215, 232, .75);\n  border-radius: 50%;\n  box-shadow: 0 0 22px rgba(121, 215, 232, .26);\n  transform: scale(.25);\n  opacity: .85;\n  animation: nxAmbientRipple 900ms cubic-bezier(.18,.8,.2,1) forwards;\n  pointer-events: none;\n}\n\n@keyframes nxAmbientRipple {\n  70% { opacity: .32; }\n  100% { transform: scale(14); opacity: 0; }\n}\n\n.node-card.nx-grid-reveal {\n  opacity: 0;\n  transform: translateY(10px) scale(.985);\n  animation: nxGridReveal 520ms cubic-bezier(.2,.8,.2,1) forwards;\n  animation-delay: calc(min(var(--nx-reveal-order, 0), 12) * 34ms);\n}\n\n@keyframes nxGridReveal {\n  to { opacity: 1; transform: none; }\n}\n\n@media (prefers-reduced-motion: reduce) {\n  .nx-ambient-ripple { display: none !important; }\n  .node-card.nx-grid-reveal {\n    opacity: 1 !important;\n    transform: none !important;\n    animation: none !important;\n  }\n}\n';
    document.head.appendChild(ambientStyle);
  }

  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const lowPower = (navigator.hardwareConcurrency || 8) <= 4;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const random = (min, max) => min + Math.random() * (max - min);

  function canvasController(host, mode, renderer) {
    if (!host || host.querySelector(`.nx-ambient-layer[data-motion="${mode}"]`)) return null;
    host.classList.add('nx-ambient-host', host.classList.contains('workspace-split') ? 'nx-ambient-host--workspace' : 'nx-ambient-host--hero');
    const canvas = document.createElement('canvas');
    canvas.className = 'nx-ambient-layer';
    canvas.dataset.motion = mode;
    canvas.setAttribute('aria-hidden', 'true');
    host.insertBefore(canvas, host.firstChild);
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) {
      canvas.remove();
      return null;
    }

    let width = 1;
    let height = 1;
    let frame = 0;
    let visible = true;
    let destroyed = false;
    let scene = null;

    const resize = () => {
      const rect = host.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      const dpr = clamp(window.devicePixelRatio || 1, 1, 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      scene = renderer.create(width, height, lowPower);
      renderer.draw(context, scene, width, height, 0, true);
    };

    const shouldAnimate = () => !destroyed && visible && !document.hidden && !reducedMotion?.matches;
    const tick = time => {
      frame = 0;
      if (!shouldAnimate()) return;
      renderer.draw(context, scene, width, height, time, false);
      frame = requestAnimationFrame(tick);
    };
    const resume = () => {
      if (!frame && shouldAnimate()) frame = requestAnimationFrame(tick);
    };
    const pause = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    };

    const observer = 'IntersectionObserver' in window
      ? new IntersectionObserver(entries => {
          visible = entries.some(entry => entry.isIntersecting);
          visible ? resume() : pause();
        }, { rootMargin: '100px', threshold: 0.01 })
      : null;
    observer?.observe(host);

    const resizeObserver = 'ResizeObserver' in window ? new ResizeObserver(resize) : null;
    resizeObserver?.observe(host);
    if (!resizeObserver) window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', () => document.hidden ? pause() : resume());
    reducedMotion?.addEventListener?.('change', () => {
      pause();
      renderer.draw(context, scene, width, height, 0, true);
      resume();
    });

    resize();
    resume();
    return {
      canvas,
      destroy() {
        destroyed = true;
        pause();
        observer?.disconnect();
        resizeObserver?.disconnect();
        canvas.remove();
      }
    };
  }

  const circuitRenderer = {
    create(width, height, low) {
      const nodeCount = low || width < 700 ? 14 : 24;
      const points = Array.from({ length: nodeCount }, () => ({ x: random(24, Math.max(25, width - 24)), y: random(24, Math.max(25, height - 24)), links: [] }));
      const connections = [];
      const threshold = Math.max(120, Math.min(240, Math.min(width, height) * .42));
      for (let i = 0; i < points.length; i += 1) {
        for (let j = i + 1; j < points.length; j += 1) {
          const distance = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
          if (distance < threshold && Math.random() < .32) {
            connections.push([i, j]);
            points[i].links.push(j);
            points[j].links.push(i);
          }
        }
      }
      if (!connections.length) {
        for (let i = 1; i < points.length; i += 1) {
          connections.push([i - 1, i]);
          points[i - 1].links.push(i);
          points[i].links.push(i - 1);
        }
      }
      const particleCount = low || width < 700 ? 12 : 24;
      const particles = Array.from({ length: particleCount }, () => {
        const [from, to] = connections[Math.floor(Math.random() * connections.length)];
        return { from, to, progress: Math.random(), speed: random(.0018, .0046), phase: random(0, Math.PI * 2) };
      });
      return { points, connections, particles };
    },
    draw(ctx, scene, width, height, time, still) {
      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = .7;
      ctx.strokeStyle = 'rgba(79, 181, 218, .085)';
      for (const [from, to] of scene.connections) {
        ctx.beginPath();
        ctx.moveTo(scene.points[from].x, scene.points[from].y);
        ctx.lineTo(scene.points[to].x, scene.points[to].y);
        ctx.stroke();
      }
      for (const particle of scene.particles) {
        if (!still) particle.progress += particle.speed;
        if (particle.progress >= 1) {
          particle.progress = 0;
          particle.from = particle.to;
          const options = scene.points[particle.from].links;
          particle.to = options[Math.floor(Math.random() * options.length)] ?? particle.from;
        }
        const start = scene.points[particle.from];
        const end = scene.points[particle.to];
        const eased = 1 - Math.pow(1 - particle.progress, 2);
        const x = start.x + (end.x - start.x) * eased;
        const y = start.y + (end.y - start.y) * eased;
        const pulse = .55 + Math.sin(time * .001 + particle.phase) * .25;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 10);
        gradient.addColorStop(0, `rgba(121, 215, 232, ${pulse})`);
        gradient.addColorStop(1, 'rgba(121, 215, 232, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  const constellationRenderer = {
    create(width, height, low) {
      const count = low || width < 700 ? 18 : 30;
      return Array.from({ length: count }, () => ({ x: Math.random() * width, y: Math.random() * height, vx: random(-.018, .018), vy: random(-.012, .012), r: random(.7, 1.7), phase: random(0, Math.PI * 2) }));
    },
    draw(ctx, points, width, height, time, still) {
      ctx.clearRect(0, 0, width, height);
      for (const point of points) {
        if (!still) {
          point.x = (point.x + point.vx + width) % width;
          point.y = (point.y + point.vy + height) % height;
        }
      }
      for (let i = 0; i < points.length; i += 1) {
        for (let j = i + 1; j < points.length; j += 1) {
          const distance = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
          if (distance < 118) {
            ctx.strokeStyle = `rgba(121, 215, 232, ${(1 - distance / 118) * .12})`;
            ctx.lineWidth = .6;
            ctx.beginPath();
            ctx.moveTo(points[i].x, points[i].y);
            ctx.lineTo(points[j].x, points[j].y);
            ctx.stroke();
          }
        }
      }
      for (const point of points) {
        const alpha = .28 + Math.sin(time * .0007 + point.phase) * .12;
        ctx.fillStyle = `rgba(232, 194, 122, ${alpha})`;
        ctx.beginPath();
        ctx.arc(point.x, point.y, point.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  const driftRenderer = {
    create(width, height, low) {
      const count = low || width < 700 ? 12 : 22;
      return Array.from({ length: count }, () => ({ x: Math.random() * width, y: Math.random() * height, vx: random(-.018, .025), vy: random(-.025, -.008), r: random(10, 34), alpha: random(.018, .07), phase: random(0, Math.PI * 2) }));
    },
    draw(ctx, points, width, height, time, still) {
      ctx.clearRect(0, 0, width, height);
      for (const point of points) {
        if (!still) {
          point.x += point.vx;
          point.y += point.vy;
          if (point.y < -point.r) point.y = height + point.r;
          if (point.x < -point.r) point.x = width + point.r;
          if (point.x > width + point.r) point.x = -point.r;
        }
        const glow = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, point.r);
        glow.addColorStop(0, `rgba(174, 224, 255, ${point.alpha * (1 + Math.sin(time * .0004 + point.phase) * .18)})`);
        glow.addColorStop(1, 'rgba(174, 224, 255, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(point.x, point.y, point.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  function mountRipple(host) {
    if (!host || host.dataset.nxRippleMounted === 'true') return;
    host.dataset.nxRippleMounted = 'true';
    host.classList.add('nx-ambient-host', 'nx-ambient-host--hero');
    const targets = host.querySelectorAll('.chip, .btn, a[href^="mailto:"], a[href^="tel:"]');
    const pulse = (target, clientX, clientY) => {
      if (reducedMotion?.matches) return;
      const rect = host.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const x = Number.isFinite(clientX) ? clientX - rect.left : targetRect.left - rect.left + targetRect.width / 2;
      const y = Number.isFinite(clientY) ? clientY - rect.top : targetRect.top - rect.top + targetRect.height / 2;
      const ripple = document.createElement('span');
      ripple.className = 'nx-ambient-ripple';
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      ripple.setAttribute('aria-hidden', 'true');
      host.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
    };
    targets.forEach(target => {
      target.addEventListener('pointerdown', event => pulse(target, event.clientX, event.clientY), { passive: true });
      target.addEventListener('focus', () => pulse(target), { passive: true });
    });
    host.addEventListener('nexus:contact-success', event => pulse(event.target || host));
  }

  function mountGridReveal(host) {
    if (!host || host.dataset.nxGridRevealMounted === 'true') return;
    host.dataset.nxGridRevealMounted = 'true';
    const decorate = () => {
      [...host.querySelectorAll('.node-card')].forEach((card, index) => {
        card.style.setProperty('--nx-reveal-order', String(index));
        card.classList.remove('nx-grid-reveal');
        void card.offsetWidth;
        card.classList.add('nx-grid-reveal');
      });
    };
    const observer = new MutationObserver(decorate);
    observer.observe(host, { childList: true });
    decorate();
  }

  function mount(mode, host) {
    if (mode === 'circuit') return canvasController(host, mode, circuitRenderer);
    if (mode === 'constellation') return canvasController(host, mode, constellationRenderer);
    if (mode === 'drift') return canvasController(host, mode, driftRenderer);
    if (mode === 'ripple') return mountRipple(host);
    if (mode === 'grid-reveal') return mountGridReveal(host);
    return null;
  }

  function autoMount() {
    const app = document.body?.dataset.app || '';
    const path = location.pathname.replace(/\/+$/, '/');
    if (app === 'apps' || path === '/apps/') mount('circuit', document.querySelector('.workspace-split'));
    else if (app === 'about' || path === '/about/') mount('drift', document.querySelector('.hero'));
    else if (app === 'contact' || path === '/contact/') mount('ripple', document.querySelector('.hero'));
    else if (path === '/tools/' || path.endsWith('/utilities/tools/')) mount('grid-reveal', document.querySelector('#node-deck'));
    else if (path === '/capabilities/') mount('constellation', document.querySelector('.hero'));
  }

  window.NexusAmbientMotion = { mount, autoMount };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoMount, { once: true });
  else autoMount();
})();
