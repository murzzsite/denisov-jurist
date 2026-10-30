const LEAD_ENDPOINT = 'https://lead-relay.leestygpt.workers.dev/lead/DXM6PE9SF6';

(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ===== header: прячется при скролле вниз, возвращается вверх =====
  const header = $('#header');
  let lastY = window.scrollY;
  const burger = $('#burger');
  const nav = $('#nav');
  burger?.addEventListener('click', () => {
    const open = burger.classList.toggle('is-open');
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    header.classList.remove('is-hidden');
  });
  $$('a', nav).forEach(a => a.addEventListener('click', () => {
    burger.classList.remove('is-open');
    nav.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
  }));

  // ===== смена хэдера, плавные якоря =====
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const href = a.getAttribute('href');
      if (href.length <= 1) return;
      const target = $(href);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 60;
      window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
    });
  });

  // ===== вступительная анимация героя =====
  const heroSplit = $('#split-1');
  $$('.wordmark .ch').forEach((c, i) => c.style.setProperty('--ci', i));
  requestAnimationFrame(() => requestAnimationFrame(() => heroSplit?.classList.add('is-loaded')));

  // ===== появление элементов (stagger внутри групп) =====
  $$('[data-rg]').forEach(group => {
    $$('[data-r]', group).forEach((el, i) => el.style.setProperty('--d', Math.min(i, 10) * 80 + 'ms'));
  });
  const revealIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      revealIO.unobserve(e.target);
    });
  }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
  $$('[data-r]').forEach(el => revealIO.observe(el));

  // ===== фото-сцена: подпись и смена кадра по секции =====
  $$('.split').forEach(split => {
    const photo = $('.photo', split);
    const imgs = $$('.photo__img', photo);
    const cap = $('.photo__cap-in', photo);
    const secs = $$('[data-status]', split);
    let current = null;
    const apply = sec => {
      if (!sec || sec === current) return;
      current = sec;
      const key = sec.dataset.photo;
      imgs.forEach(im => im.classList.toggle('is-on', im.dataset.key === key));
      if (cap && cap.textContent !== sec.dataset.status) {
        cap.classList.add('is-out');
        setTimeout(() => { cap.textContent = sec.dataset.status; cap.classList.remove('is-out'); }, reduce ? 0 : 320);
      }
    };
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) apply(e.target); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    secs.forEach(s => io.observe(s));
    if (!split.id.endsWith('1')) {
      const reveal = new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting) { photo.classList.add('is-in'); reveal.disconnect(); }
      }), { threshold: 0.1 });
      reveal.observe(photo);
    }
  });

  // ===== счётчик в кейсах =====
  const fmtInt = n => Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ');
  const countEls = $$('[data-count]');
  const countIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = +el.dataset.count;
      countIO.unobserve(el);
      if (reduce) return;
      const start = performance.now(), dur = 1900;
      const tick = t => {
        const p = clamp((t - start) / dur, 0, 1);
        el.textContent = fmtInt(target * (1 - Math.pow(1 - p, 4)));
        if (p < 1) requestAnimationFrame(tick);
      };
      el.textContent = '0';
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.6 });
  countEls.forEach(el => countIO.observe(el));

  // ===== калькулятор: сколько стоит юрист в штате =====
  const salary = $('#salary');
  if (salary) {
    const money = n => fmtInt(n) + ' ₽';
    const out = {
      net: $('#out-net'), ndfl: $('#out-ndfl'), contrib: $('#out-contrib'),
      total: $('#out-total'), year: $('#out-year'), tax: $('#out-taxsum'),
    };
    const fill = $('#range-fill');
    const calc = net => {
      const netY = net * 12;
      const thr = 2400000;
      const grossY = netY <= thr * 0.87 ? netY / 0.87 : thr + (netY - thr * 0.87) / 0.85;
      const gross = grossY / 12;
      const ndfl = gross - net;
      const base = 2979000;
      const contribY = Math.min(grossY, base) * 0.30 + Math.max(0, grossY - base) * 0.151;
      const contrib = contribY / 12;
      const total = gross + contrib;
      return { net, ndfl, contrib, total, year: total * 12, tax: ndfl + contrib };
    };
    let shown = { net: 0, ndfl: 0, contrib: 0, total: 0, year: 0, tax: 0 };
    let raf = 0;
    const paint = v => {
      out.net.textContent = money(v.net);
      out.ndfl.textContent = money(v.ndfl);
      out.contrib.textContent = money(v.contrib);
      out.total.textContent = money(v.total);
      out.year.textContent = money(v.year);
      out.tax.textContent = money(v.tax);
    };
    const update = (animate = true) => {
      const v = +salary.value;
      const p = (v - +salary.min) / (+salary.max - +salary.min) * 100;
      fill.style.setProperty('--p', p + '%');
      const to = calc(v);
      cancelAnimationFrame(raf);
      if (reduce || !animate) { shown = to; paint(to); return; }
      const from = { ...shown };
      const start = performance.now(), dur = 520;
      const tick = t => {
        const k = clamp((t - start) / dur, 0, 1);
        const e = 1 - Math.pow(1 - k, 3);
        const cur = {};
        Object.keys(to).forEach(key => { cur[key] = from[key] + (to[key] - from[key]) * e; });
        shown = cur; paint(cur);
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    salary.addEventListener('input', () => update(true));
    update(false);
    const calcIO = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { shown = { net: 0, ndfl: 0, contrib: 0, total: 0, year: 0, tax: 0 }; update(true); calcIO.disconnect(); }
    }), { threshold: 0.35 });
    calcIO.observe($('#calc'));
  }

  // ===== scroll-linked: wordmark, parallax, бегущая строка, футер =====
  const wordmark = $('#wordmark');
  const heroEl = $('.hero');
  const ticker = $('#ticker');
  const footerWm = $('#footer-wm');
  const photoImgs = $$('.photo');
  const pano = $('.pano img');
  let ticking = false;
  const frame = () => {
    ticking = false;
    const y = window.scrollY;
    const vh = window.innerHeight;

    if (header && !nav.classList.contains('is-open')) {
      header.classList.toggle('is-hidden', y > lastY && y > 240);
    }
    lastY = y;

    if (reduce) return;

    if (wordmark && heroEl) {
      const h = heroEl.offsetHeight + 60;
      const p = clamp(y / h, 0, 1);
      wordmark.style.transform = `translateY(${p * 22}px) scale(${1 - p * 0.07})`;
    }
    photoImgs.forEach(ph => {
      const r = ph.parentElement.getBoundingClientRect();
      const p = clamp(-r.top / Math.max(1, r.height - vh), 0, 1);
      ph.style.setProperty('--py', ((p - 0.5) * -28).toFixed(1) + 'px');
    });
    if (ticker) {
      const r = ticker.parentElement.getBoundingClientRect();
      const half = ticker.scrollWidth / 2;
      const off = ((r.top - vh) * 0.32) % half;
      ticker.style.transform = `translateX(${(-Math.abs(off)).toFixed(1)}px)`;
    }
    if (footerWm) {
      const r = footerWm.getBoundingClientRect();
      const p = clamp((vh - r.top) / (vh * 0.9), 0, 1);
      footerWm.style.setProperty('--fs', (0.9 + p * 0.1).toFixed(3));
    }
    if (pano) {
      const r = pano.parentElement.getBoundingClientRect();
      const p = clamp((vh - r.top) / (vh + r.height), 0, 1);
      pano.style.setProperty('--py', ((p - 0.5) * -60).toFixed(1) + 'px');
    }
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
  window.addEventListener('resize', frame);
  frame();

  // ===== маска телефона =====
  $$('input[type="tel"]').forEach(input => {
    input.addEventListener('input', e => {
      let v = e.target.value.replace(/\D/g, '');
      if (!v) { e.target.value = ''; return; }
      if (v.startsWith('8')) v = '7' + v.slice(1);
      if (!v.startsWith('7')) v = '7' + v;
      v = v.slice(0, 11);
      let o = '+7';
      if (v.length > 1) o += ' (' + v.slice(1, 4);
      if (v.length >= 4) o += ') ' + v.slice(4, 7);
      if (v.length >= 7) o += '-' + v.slice(7, 9);
      if (v.length >= 9) o += '-' + v.slice(9, 11);
      e.target.value = o;
    });
  });

  // ===== форма → Cloudflare Worker → Telegram =====
  const form = $('#leadForm');
  const status = $('#formStatus');
  form?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const orig = btn.textContent;
    const fd = new FormData(form);
    const payload = {};
    fd.forEach((v, k) => { payload[k] = v; });
    if (payload._gotcha) return;
    status.classList.remove('is-err');
    if (!payload.name || !payload.phone || payload.phone.replace(/\D/g, '').length < 11) {
      status.textContent = 'Укажите имя и телефон полностью.';
      status.classList.add('is-err');
      return;
    }
    if (!payload.consent) {
      status.textContent = 'Нужно согласие на обработку персональных данных.';
      status.classList.add('is-err');
      return;
    }
    delete payload.consent;
    payload.source = 'Лендинг: юрист на аутсорсе';
    btn.disabled = true;
    btn.textContent = 'Отправляем...';
    try {
      const resp = await fetch(LEAD_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      status.textContent = 'Заявка отправлена. Отвечу в рабочее время, с 9 до 19.';
      form.reset();
    } catch (err) {
      console.error(err);
      status.textContent = 'Не получилось отправить. Напишите в Telegram: @daniladenisovvv';
      status.classList.add('is-err');
    } finally {
      btn.disabled = false;
      btn.textContent = orig;
    }
  });
})();
