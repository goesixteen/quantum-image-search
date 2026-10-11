import { CROWD_CAST } from './crowd-cast.js';

// Decorative cast only. These overlays never enter the image or detector input.
const CAST = CROWD_CAST.filter(person => person.src && person.width > 0 && person.height > 0);
const TARGETS = [
  { selector: '.play-heading h1', kind: 'main', count: 6, min: 54, max: 66 },
  { selector: '.hood-heading h2', kind: 'heading', count: 4, min: 48, max: 58 },
  { selector: '#lesson-step-title', kind: 'stage', count: 3, min: 36, max: 43 },
  { selector: '#find', kind: 'button', count: 3, min: 36, max: 43 },
  { selector: '#lesson-run', kind: 'button', count: 2, min: 33, max: 39 },
  { selector: '#circuit-play', kind: 'button', count: 2, min: 33, max: 38 },
  { selector: '#grover-watch, #grover-guide-play', kind: 'button', count: 2, min: 34, max: 40 },
  { selector: '#lesson-sample, #lesson-measure', kind: 'button', count: 3, min: 34, max: 41 },
  { selector: '#explainer-next', kind: 'button', count: 2, min: 33, max: 39 }
];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const motionControl = document.querySelector('#circuit-reduce-motion');
const records = [];
let layoutFrame = 0;
let castOffset = 0;

const prefersStill = () => reduceMotion.matches || Boolean(motionControl?.checked);
const px = number => `${Math.round(number * 100) / 100}px`;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

function makePerson(asset, index) {
  const figure = document.createElement('span');
  figure.className = 'crowd-ui-person';
  figure.style.setProperty('--crowd-hip', `${clamp(asset.hip || .72, .5, .88) * 100}%`);
  figure.style.setProperty('--crowd-step-delay', `${-index * .055}s`);
  figure.dataset.cast = asset.id;
  for (const part of ['upper', 'leg-left', 'leg-right']) {
    const region = document.createElement('span');
    region.className = `crowd-ui-part crowd-ui-${part}`;
    const image = document.createElement('img');
    image.alt = '';
    image.width = asset.width;
    image.height = asset.height;
    image.decoding = 'async';
    image.draggable = false;
    image.dataset.src = asset.src;
    region.append(image);
    figure.append(region);
  }
  return { asset, figure, height: 0, width: 0, parkX: 0, startX: 0, side: index % 2 ? 1 : -1 };
}

function cancelWalking(record) {
  clearTimeout(record.walkTimer);
  cancelAnimationFrame(record.entryFrame);
  record.entryFrame = 0;
  record.group.classList.remove('is-walking');
}

function loadCast(record) {
  if (record.loaded) return;
  record.loaded = true;
  record.group.querySelectorAll('img[data-src]').forEach(image => {
    image.src = image.dataset.src;
    delete image.dataset.src;
  });
}

function positionPeople(record, clustered = false) {
  const still = prefersStill() || document.hidden;
  record.group.classList.toggle('is-still', still);
  const isButton = record.config.kind === 'button';
  const baseY = isButton ? -4 : record.clearance - 5;
  for (const person of record.people) {
    const extra = !clustered && record.hovered ? person.side * record.hoverStep : 0;
    const x = clamp((clustered ? person.startX : person.parkX) + extra, person.minX, person.maxX);
    const y = clustered ? baseY + (isButton ? record.height * .7 : Math.min(record.height * .17, 18)) : baseY;
    person.figure.style.transform = `translate3d(${px(x - person.width / 2)}, ${px(y - person.height)}, 0)`;
    person.figure.style.setProperty('--crowd-facing', extra < 0 ? '-1' : '1');
  }
}

function walk(record, { entrance = false } = {}) {
  cancelWalking(record);
  if (!record.visible || !record.ready || document.hidden) return;
  loadCast(record);
  record.group.classList.add('is-ready');
  if (prefersStill()) {
    positionPeople(record);
    return;
  }
  if (entrance) {
    record.group.classList.add('is-resetting');
    positionPeople(record, true);
    // A painted starting pose makes the first walk visible on scroll re-entry.
    record.entryFrame = requestAnimationFrame(() => {
      record.entryFrame = requestAnimationFrame(() => {
        record.entryFrame = 0;
        record.group.classList.remove('is-resetting');
        startWalk(record);
      });
    });
  } else {
    record.group.classList.remove('is-resetting');
    startWalk(record);
  }
}

function startWalk(record) {
  if (!record.visible || document.hidden || prefersStill()) {
    positionPeople(record);
    return;
  }
  record.group.classList.add('is-walking');
  positionPeople(record);
  // The footstep animations and their cleanup both finish; there is no idle loop.
  record.walkTimer = setTimeout(() => {
    record.group.classList.remove('is-walking');
    record.walkTimer = 0;
  }, 1420);
}

function layout(record) {
  const { target, parent, config, group } = record;
  const mobileScale = innerWidth <= 360 ? .74 : innerWidth <= 650 ? .82 : 1;
  const clearance = Math.ceil(config.max * mobileScale) + 9;
  if (clearance !== record.clearance) {
    record.clearance = clearance;
    target.style.setProperty('--crowd-ui-clearance', px(clearance));
  }
  const targetRect = target.getBoundingClientRect();
  const parentRect = parent.getBoundingClientRect();
  const ready = targetRect.width > 0 && targetRect.height > 0;
  record.ready = ready;
  if (!ready) {
    group.classList.remove('is-ready');
    return;
  }
  record.width = targetRect.width;
  record.height = targetRect.height;
  group.style.left = px(targetRect.left - parentRect.left - parent.clientLeft + parent.scrollLeft);
  group.style.top = px(targetRect.top - parentRect.top - parent.clientTop + parent.scrollTop);
  group.style.width = px(targetRect.width);
  group.style.height = px(targetRect.height);
  record.hoverStep = Math.min(17, targetRect.width * .09);
  record.people.forEach((person, index) => {
    person.height = (config.min + (config.max - config.min) * ((index * 3 + 1) % 7) / 6) * mobileScale;
    person.width = person.height * person.asset.width / person.asset.height;
    person.figure.style.width = px(person.width);
    person.figure.style.height = px(person.height);
    // The whole sprite remains within the anchor and viewport, including hover steps.
    person.minX = Math.max(person.width / 2 + 2, 8 - targetRect.left + person.width / 2);
    person.maxX = Math.max(person.minX, Math.min(targetRect.width - person.width / 2 - 2, innerWidth - 8 - targetRect.left - person.width / 2));
    const share = config.kind === 'button' && record.people.length === 2 ? (index ? .88 : .12) : (index + .5) / record.people.length;
    person.parkX = clamp(targetRect.width * share, person.minX, person.maxX);
    person.startX = clamp(targetRect.width / 2 + (index - (record.people.length - 1) / 2) * 13 * mobileScale, person.minX, person.maxX);
    person.side = person.parkX < targetRect.width / 2 ? -1 : 1;
  });
  if (!record.entryFrame) positionPeople(record);
}

function scheduleLayout() {
  if (layoutFrame || document.hidden) return;
  layoutFrame = requestAnimationFrame(() => {
    layoutFrame = 0;
    records.forEach(layout);
  });
}

function setHover(record, hovered) {
  if (record.hovered === hovered) return;
  record.hovered = hovered;
  walk(record);
}

if (CAST.length) {
  for (const config of TARGETS) {
    const target = document.querySelector(config.selector);
    if (!target?.parentElement) continue;
    const parent = target.parentElement;
    parent.classList.add('crowd-ui-host');
    target.classList.add(config.kind === 'button' ? 'crowd-ui-button-anchor' : 'crowd-ui-heading-anchor');
    const group = document.createElement('span');
    group.className = `crowd-ui-group crowd-ui-group--${config.kind}`;
    group.setAttribute('aria-hidden', 'true');
    group.setAttribute('inert', '');
    group.dataset.crowdTarget = target.id || config.selector;
    const people = Array.from({ length: config.count }, (_, index) => makePerson(CAST[(castOffset + index) % CAST.length], index));
    castOffset = (castOffset + config.count + 1) % CAST.length;
    people.forEach(person => group.append(person.figure));
    // A sibling overlay survives textContent updates without changing button names.
    parent.append(group);
    const record = { config, target, parent, group, people, visible: false, loaded: false, ready: false, hovered: false, clearance: 0, walkTimer: 0, entryFrame: 0 };
    records.push(record);
    if (config.kind === 'button') {
      target.addEventListener('pointerenter', event => {
        if (event.pointerType === 'mouse' || !event.pointerType) setHover(record, true);
      });
      target.addEventListener('pointerleave', () => setHover(record, document.activeElement === target));
      target.addEventListener('focus', () => setHover(record, true));
      target.addEventListener('blur', () => setHover(record, target.matches(':hover')));
    }
  }

  const sizeObserver = new ResizeObserver(scheduleLayout);
  records.forEach(record => {
    sizeObserver.observe(record.target);
    sizeObserver.observe(record.parent);
    // Read the label's new bounds when the existing app changes its stage or action.
    const labelObserver = new MutationObserver(scheduleLayout);
    labelObserver.observe(record.target, { childList: true, characterData: true, subtree: true });
  });
  const entryObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const record = records.find(item => item.target === entry.target);
      if (!record) continue;
      const visible = entry.isIntersecting && entry.intersectionRatio > 0;
      if (visible === record.visible) continue;
      record.visible = visible;
      if (visible) {
        layout(record);
        walk(record, { entrance: true });
      } else {
        cancelWalking(record);
        record.group.classList.remove('is-resetting');
        positionPeople(record);
      }
    }
  }, { threshold: [0, .15], rootMargin: '0px 0px -24px 0px' });
  records.forEach(record => entryObserver.observe(record.target));
  const updateMotion = () => {
    for (const record of records) {
      cancelWalking(record);
      record.group.classList.remove('is-resetting');
      positionPeople(record);
    }
  };
  reduceMotion.addEventListener('change', updateMotion);
  motionControl?.addEventListener('change', updateMotion);
  addEventListener('resize', scheduleLayout, { passive: true });
  addEventListener('pageshow', scheduleLayout);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(layoutFrame);
      layoutFrame = 0;
      updateMotion();
    } else {
      updateMotion();
      scheduleLayout();
    }
  });
  document.fonts?.ready.then(scheduleLayout);
  scheduleLayout();
}
