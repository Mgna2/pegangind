// main.js — Global Scripts

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initScrollReveal();
  initTypewriter();
  initCounters();
});

// ---- Navbar ----
function initNavbar() {
  const navbar = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileLinks = document.querySelectorAll('.mobile-menu a');

  if (!navbar) return;

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  });

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      mobileMenu.classList.toggle('open');
      document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
    });

    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // Active link
  const currentPath = window.location.pathname;
  document.querySelectorAll('.nav-links a').forEach(a => {
    if (a.getAttribute('href') === currentPath) a.classList.add('active');
  });
}

// ---- Scroll Reveal ----
function initScrollReveal() {
  const targets = document.querySelectorAll('.reveal');
  if (!targets.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  targets.forEach(el => observer.observe(el));
}

// ---- Typewriter ----
function initTypewriter() {
  const el = document.getElementById('typewriter');
  if (!el) return;

  const words = el.dataset.words ? JSON.parse(el.dataset.words) : [el.textContent];
  let wordIdx = 0;
  let charIdx = 0;
  let isDeleting = false;

  function type() {
    const word = words[wordIdx];
    if (!isDeleting) {
      el.textContent = word.slice(0, charIdx + 1);
      charIdx++;
      if (charIdx === word.length) {
        isDeleting = true;
        setTimeout(type, 2000);
        return;
      }
    } else {
      el.textContent = word.slice(0, charIdx - 1);
      charIdx--;
      if (charIdx === 0) {
        isDeleting = false;
        wordIdx = (wordIdx + 1) % words.length;
      }
    }
    setTimeout(type, isDeleting ? 60 : 100);
  }

  el.textContent = '';
  setTimeout(type, 600);
}

// ---- Number Counter ----
function initCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      const duration = 1500;
      const step = target / (duration / 16);
      let current = 0;

      const interval = setInterval(() => {
        current = Math.min(current + step, target);
        el.textContent = Math.floor(current) + suffix;
        if (current >= target) clearInterval(interval);
      }, 16);

      observer.unobserve(el);
    });
  }, { threshold: 0.5 });

  counters.forEach(el => observer.observe(el));
}

// ---- Image Lightbox ----
function openLightbox(src, caption) {
  const existing = document.getElementById('lightbox');
  if (existing) existing.remove();

  const lb = document.createElement('div');
  lb.id = 'lightbox';
  lb.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,0.9);
    z-index: 9999; display: flex; align-items: center; justify-content: center;
    animation: fadeIn 0.3s ease;
  `;
  lb.innerHTML = `
    <button onclick="document.getElementById('lightbox').remove()" style="
      position: absolute; top: 20px; right: 24px; background: none; border: none;
      color: white; font-size: 2rem; cursor: pointer; line-height: 1;
    ">✕</button>
    <img src="${src}" style="max-width: 90vw; max-height: 90vh; border-radius: 12px; object-fit: contain;" />
    ${caption ? `<p style="position:absolute;bottom:20px;color:rgba(255,255,255,0.7);font-size:0.875rem;">${caption}</p>` : ''}
  `;
  lb.addEventListener('click', e => { if (e.target === lb) lb.remove(); });
  document.body.appendChild(lb);
}
window.openLightbox = openLightbox;
