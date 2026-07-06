/* Thrdwheel landing — interactions */
(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ————— Nav scrolled state ————— */
  const nav = document.querySelector('.site-nav');
  if (nav) {
    const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ————— Mobile menu (only if a toggle exists) ————— */
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });

    navLinks.addEventListener('click', (event) => {
      if (event.target.closest('a')) {
        navLinks.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ————— Reveal on scroll ————— */
  const revealables = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window && !prefersReducedMotion) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    revealables.forEach((el) => observer.observe(el));
  } else {
    revealables.forEach((el) => el.classList.add('is-visible'));
  }

  /* ————— Hero phone: two private doors, one AI ————— */
  const MESSAGE_STAGGER_MS = 420;
  const AUTO_CYCLE_MS = 8000;

  const CONVERSATIONS = {
    maya: [
      { from: 'user', text: 'We argued about the dishes again. It’s never really about the dishes, is it?' },
      { from: 'ai', text: 'Rarely. Small chores often carry bigger feelings — like wanting to be noticed. What did you wish Leo had seen tonight?' },
      { from: 'user', text: 'That I was running on empty too.' },
      { from: 'typing' },
    ],
    leo: [
      { from: 'user', text: 'I feel like I keep getting it wrong lately, and I don’t know where to start.' },
      { from: 'ai', text: 'Wanting to get it right is already a form of care. What might change if you asked Maya, instead of guessing?' },
      { from: 'user', text: 'Honestly… I’ve never just asked.' },
      { from: 'typing' },
    ],
  };

  const chatBody = document.getElementById('chat-body');
  const tabs = Array.from(document.querySelectorAll('.phone-tab'));

  function buildMessage(message, index) {
    const el = document.createElement('div');
    el.style.setProperty('--msg-delay', `${index * MESSAGE_STAGGER_MS}ms`);

    if (message.from === 'typing') {
      el.className = 'msg from-ai typing';
      el.setAttribute('aria-label', 'Thrdwheel is typing');
      el.innerHTML = '<i></i><i></i><i></i>';
    } else {
      el.className = `msg from-${message.from}`;
      el.textContent = message.text;
    }
    return el;
  }

  function renderConversation(key) {
    const note = chatBody.querySelector('.chat-note');
    chatBody.replaceChildren(note);
    CONVERSATIONS[key].forEach((message, index) => {
      chatBody.appendChild(buildMessage(message, index));
    });
  }

  function selectTab(tab, { fromUser } = { fromUser: false }) {
    tabs.forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
    renderConversation(tab.dataset.chat);
    if (fromUser) {
      userTookOver = true;
      clearInterval(cycleTimer);
    }
  }

  let userTookOver = false;
  let cycleTimer = null;

  if (chatBody && tabs.length) {
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => selectTab(tab, { fromUser: true }));
    });

    renderConversation('maya');

    if (!prefersReducedMotion) {
      cycleTimer = setInterval(() => {
        if (userTookOver) return;
        const current = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
        selectTab(tabs[(current + 1) % tabs.length]);
      }, AUTO_CYCLE_MS);
    }
  }

  /* ————— FAQ: keep one answer open at a time ————— */
  const faqItems = Array.from(document.querySelectorAll('.faq-item'));
  faqItems.forEach((item) => {
    item.addEventListener('toggle', () => {
      if (!item.open) return;
      faqItems.forEach((other) => {
        if (other !== item) other.open = false;
      });
    });
  });

  /* ————— Footer year ————— */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
