import './style.css';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Experience } from './src/Experience.js';

gsap.registerPlugin(ScrollTrigger);

/* -------------------------------------------------------------------------- */
/*  Smooth scroll (Lenis) wired into GSAP's ScrollTrigger                     */
/* -------------------------------------------------------------------------- */
const lenis = new Lenis({
  duration: 1.2,
  smoothWheel: true,
});

lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

/* -------------------------------------------------------------------------- */
/*  3D experience + loading screen                                            */
/* -------------------------------------------------------------------------- */
const canvas = document.querySelector('canvas.webgl');
const loader = document.querySelector('.loader');
const loaderBar = document.querySelector('.loader__bar-fill');
const loaderPercent = document.querySelector('.loader__percent');

let displayProgress = 0;

new Experience(canvas, {
  onProgress: (p) => {
    const pct = Math.round(p * 100);
    displayProgress = pct;
    if (loaderBar) loaderBar.style.transform = `scaleX(${p})`;
    if (loaderPercent) loaderPercent.textContent = `${pct}%`;
  },
  onReady: () => {
    if (loaderBar) loaderBar.style.transform = 'scaleX(1)';
    if (loaderPercent) loaderPercent.textContent = '100%';
    gsap.to(loader, {
      opacity: 0,
      duration: 1,
      delay: 0.3,
      ease: 'power2.out',
      onComplete: () => {
        loader.style.display = 'none';
        ScrollTrigger.refresh();
        revealHero();
      },
    });
  },
});

/* -------------------------------------------------------------------------- */
/*  DOM entrance + scroll reveal animations                                   */
/* -------------------------------------------------------------------------- */
function revealHero() {
  gsap
    .timeline({ defaults: { ease: 'power3.out' } })
    .from('.site-header', { y: -40, opacity: 0, duration: 1 })
    .from('.hero__eyebrow', { y: 30, opacity: 0, duration: 0.8 }, '-=0.5')
    .from('.hero__title span', { y: 80, opacity: 0, stagger: 0.12, duration: 1 }, '-=0.4')
    .from('.hero__lead', { y: 30, opacity: 0, duration: 0.8 }, '-=0.6')
    .from('.hero__cta', { y: 30, opacity: 0, duration: 0.8 }, '-=0.6')
    .from('.hero__scroll', { opacity: 0, duration: 0.8 }, '-=0.4');
}

// Generic reveal for panels as they scroll into view.
gsap.utils.toArray('.reveal').forEach((el) => {
  gsap.from(el, {
    y: 60,
    opacity: 0,
    duration: 1.1,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: el,
      start: 'top 80%',
    },
  });
});

// Staggered reveal for grouped items (e.g. collection cards, stats).
gsap.utils.toArray('[data-stagger]').forEach((group) => {
  gsap.from(group.children, {
    y: 50,
    opacity: 0,
    duration: 0.9,
    stagger: 0.12,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: group,
      start: 'top 82%',
    },
  });
});

// Progress rail in the side nav.
const railFill = document.querySelector('.progress-rail__fill');
if (railFill) {
  gsap.to(railFill, {
    scaleY: 1,
    ease: 'none',
    scrollTrigger: {
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
    },
  });
}
