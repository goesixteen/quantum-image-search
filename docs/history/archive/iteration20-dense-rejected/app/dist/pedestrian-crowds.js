// Interface crowds only. Their PNGs never enter the game or classifier canvas.
const COLORS = ['red', 'yellow', 'blue'];
const SPEED = 28; // CSS pixels per second, identical for every moving person.
const PLACES = [
  { selector: '.play-heading h1', kind: 'heading', count: 48, mobile: 36, min: 24, max: 36, strip: 74 },
  { selector: '.hood-heading h2', kind: 'heading', count: 36, mobile: 28, min: 23, max: 34, strip: 70 },
  { selector: '#lesson-step-title', kind: 'heading', count: 16, mobile: 12, min: 20, max: 28, strip: 60 },
  { selector: '#find', kind: 'action', count: 18, mobile: 14, min: 20, max: 28, strip: 66 },
  { selector: '#lesson-run', kind: 'action', count: 14, mobile: 10, min: 19, max: 26, strip: 62 },
  { selector: '#circuit-play', kind: 'action', count: 14, mobile: 10, min: 19, max: 26, strip: 62 },
  { selector: '#grover-watch', kind: 'action', count: 14, mobile: 10, min: 19, max: 26, strip: 62 },
  { selector: '#lesson-sample', kind: 'action', count: 16, mobile: 12, min: 19, max: 26, strip: 62 },
  { selector: '#explainer-next', kind: 'action', count: 14, mobile: 10, min: 19, max: 26, strip: 62 }
];
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
const motionControl = document.querySelector('#circuit-reduce-motion');
const records = [];
let layoutFrame = 0;
let active = true;
let colorOffset = 0;

const px = value => `${Math.round(value * 100) / 100}px`;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const transformAt = point => `translate3d(${point.x}px, ${point.y}px, 0)`;
const reducedMotion = () => motionQuery.matches || Boolean(motionControl?.checked);

function seededValues(key) {
  let seed = 2166136261;
  for (const letter of key) seed = Math.imul(seed ^ letter.charCodeAt(0), 16777619);
  return () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
}

function makePerson(color, index, seedKey) {
  const figure = document.createElement('span');
  figure.className = 'pedestrian-crowd-person';
  figure.dataset.color = color;
  figure.dataset.person = `${seedKey}/${index}`;
  const image = document.createElement('img');
  image.alt = '';
  image.draggable = false;
  image.decoding = 'async';
  image.loading = 'lazy';
  image.src = `assets/ui-pedestrians/pedestrian-${color}.png`;
  figure.append(image);
  const random = seededValues(`${seedKey}/${index}`);
  const person = { figure, image, ratio: 5 / 6, index, size: random(), rise: random(), radius: Math.sqrt(random()), angle: random() * Math.PI * 2, facing: random() < .5 ? -1 : 1, animation: null, from: null, to: null };
  figure.dataset.facing = person.facing < 0 ? 'left' : 'right';
  image.style.setProperty('--pedestrian-facing', String(person.facing));
  image.addEventListener('load', () => {
    if (!active || !image.naturalHeight) return;
    const ratio = image.naturalWidth / image.naturalHeight;
    if (Math.abs(person.ratio - ratio) > .00001) {
      person.ratio = ratio;
      const record = records.find(item => item.people.includes(person));
      if (record) record.geometryKey = '';
      scheduleLayout();
    }
  }, { once: true });
  return person;
}

function stop(record) {
  record.people.forEach(person => {
    if (person.animation) {
      person.animation.onfinish = null;
      person.animation.cancel();
      person.animation = null;
    }
    if (person.to) person.figure.style.transform = transformAt(person.to);
    person.figure.dataset.motion = 'parked';
  });
  record.group.dataset.motion = 'parked';
}

function labelObstacles(scope, target, targetRect, clearance) {
  const obstacles = [];
  const top = targetRect.top - clearance - 3;
  const bottom = targetRect.bottom + 35;
  const collect = rect => {
    if (!rect.width || !rect.height || rect.bottom < top || rect.top > bottom) return;
    obstacles.push({ left: rect.left - targetRect.left - 3, right: rect.right - targetRect.left + 3, top: rect.top - targetRect.top - 2, bottom: rect.bottom - targetRect.top + 2 });
  };
  const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let node;
  while ((node = walker.nextNode())) {
    if (!node.textContent.trim() || node.parentElement?.closest('.pedestrian-crowd')) continue;
    range.selectNodeContents(node);
    for (const rect of range.getClientRects()) collect(rect);
  }
  for (const control of scope.querySelectorAll('button,input,select,canvas,a,summary')) {
    if (control === target || target.contains(control)) continue;
    collect(control.getBoundingClientRect());
  }
  return obstacles;
}

function layout(record) {
  const { target, parent, group, config, people } = record;
  const mobile = innerWidth <= 650;
  const scale = innerWidth <= 360 ? .84 : mobile ? .92 : 1;
  const clearance = config.strip - (mobile ? 8 : 0);
  if (record.clearance !== clearance) {
    record.clearance = clearance;
    target.style.setProperty('--pedestrian-clearance', px(clearance));
  }
  const targetRect = target.getBoundingClientRect();
  const parentRect = parent.getBoundingClientRect();
  const region = target.closest('.play-heading,.hood-heading,.play-menu,.circuit-core,.grover-guide,.compact-explainer') || parent;
  const regionRect = region.getBoundingClientRect();
  const left = Math.max(8, regionRect.left + 5) - targetRect.left;
  const right = Math.max(left, Math.min(innerWidth - 8, regionRect.right - 5) - targetRect.left);
  const relativeLeft = targetRect.left - parentRect.left - parent.clientLeft + parent.scrollLeft;
  const relativeTop = targetRect.top - parentRect.top - parent.clientTop + parent.scrollTop;
  const geometryKey = [innerWidth, targetRect.width, targetRect.height, relativeLeft, relativeTop, left, right, clearance, target.textContent].join('|');
  const ready = targetRect.width > 0 && targetRect.height > 0;
  group.classList.toggle('is-positioned', ready);
  record.ready = ready;
  if (!ready) {
    stop(record);
    record.geometryKey = '';
    return false;
  }
  if (geometryKey === record.geometryKey) return false;
  stop(record);
  record.geometryKey = geometryKey;
  group.style.left = px(relativeLeft);
  group.style.top = px(relativeTop);
  group.style.width = px(targetRect.width);
  group.style.height = px(targetRect.height);
  const count = mobile ? config.mobile : config.count;
  group.dataset.count = String(count);
  group.dataset.speed = String(SPEED);
  const available = right - left;
  const activePeople = people.slice(0, count);
  const sizes = activePeople.map(person => {
    const depth = person.index % 3 === 1 ? .87 : 1;
    const height = (config.min + (config.max - config.min) * person.size) * scale * depth;
    return { height, width: Math.min(height * person.ratio, available) };
  });
  const obstacles = labelObstacles(parent.parentElement || parent, target, targetRect, clearance);
  const insideLeft = Math.max(left, 0);
  const insideRight = Math.min(right, targetRect.width);
  const shelfWidth = Math.min(targetRect.width * .4, config.kind === 'heading' ? 135 : 60);
  const isClear = (candidate, size) => !obstacles.some(rect => candidate.x < rect.right && candidate.x + size.width > rect.left && candidate.y < rect.bottom && candidate.y + size.height > rect.top);
  activePeople.forEach((person, index) => {
    const size = sizes[index];
    person.figure.hidden = false;
    person.figure.style.width = px(size.width);
    person.figure.style.height = px(size.height);
    const side = index % 2 ? 1 : -1;
    const rank = Math.floor(index / 2);
    const column = rank % 5;
    const tier = Math.floor(rank / 5) % 3;
    const spread = column / 4 * Math.max(0, shelfWidth - size.width);
    const perchX = side < 0 ? insideLeft + spread : insideRight - size.width - spread;
    const usableY = Math.max(0, clearance - size.height - 6);
    const perchY = config.kind === 'heading' ? 2 + tier / 2 * usableY + person.rise * 2 : -clearance + 2 + tier / 2 * usableY + person.rise * 2;
    const fallback = { x: perchX, y: perchY, kind: 'perch' };
    const candidates = [];
    if (config.kind === 'heading' && index % 6 >= 4) {
      const sideX = side < 0 ? -size.width - 6 - column * 9 : targetRect.width + 6 + column * 9;
      candidates.push({ x: sideX, y: clearance + tier / 2 * Math.max(0, targetRect.height - clearance - size.height) + person.rise * 3, kind: 'flank' });
    } else if (config.kind === 'action' && index % 4 >= 2) {
      const sideX = side < 0 ? -size.width * .63 - column * 3 : targetRect.width - size.width * .37 + column * 3;
      candidates.push({ x: sideX, y: targetRect.height - size.height * .75 + tier * 3, kind: 'corner' });
      candidates.push({ x: sideX, y: targetRect.height * .3 - size.height / 2, kind: 'corner' });
    }
    candidates.push(fallback);
    candidates.push({ x: insideLeft + (index + .5) / count * Math.max(0, insideRight - insideLeft - size.width), y: config.kind === 'heading' ? 1 : -clearance + 1, kind: 'perch' });
    const bounded = candidates.map(candidate => ({ ...candidate, x: clamp(candidate.x, left, right - size.width) }));
    const chosen = bounded.find(candidate => isClear(candidate, size)) || bounded[bounded.length - 1];
    person.to = { x: chosen.x, y: chosen.y };
    person.figure.dataset.placement = chosen.kind;
    const centerY = config.kind === 'heading' ? clearance + (targetRect.height - clearance) * .4 : targetRect.height / 2;
    const radiusX = Math.min(config.kind === 'heading' ? 105 : 55, targetRect.width * .33);
    const radiusY = Math.min(config.kind === 'heading' ? 35 : 15, targetRect.height * .2);
    person.from = {
      x: clamp(targetRect.width / 2 + Math.cos(person.angle) * radiusX * person.radius - size.width / 2, Math.max(left, 0), Math.min(right, targetRect.width) - size.width),
      y: clamp(centerY + Math.sin(person.angle) * radiusY * person.radius - size.height / 2, 0, Math.max(0, targetRect.height - size.height))
    };
    person.figure.style.zIndex = String(100 + Math.round(chosen.y + size.height));
    person.figure.style.transform = transformAt(person.to);
    person.figure.dataset.startX = person.from.x.toFixed(3);
    person.figure.dataset.startY = person.from.y.toFixed(3);
    person.figure.dataset.endX = person.to.x.toFixed(3);
    person.figure.dataset.endY = person.to.y.toFixed(3);
    const distance = Math.hypot(person.to.x - person.from.x, person.to.y - person.from.y);
    person.figure.dataset.distance = distance.toFixed(3);
    person.figure.dataset.duration = (distance / SPEED * 1000).toFixed(3);
  });
  people.slice(count).forEach(person => { person.figure.hidden = true; });
  return true;
}

function spread(record) {
  stop(record);
  if (!record.ready || !record.visible || document.hidden) return;
  record.entryPlayed = true;
  if (reducedMotion()) return;
  record.group.dataset.motion = 'spreading';
  record.people.filter(person => !person.figure.hidden).forEach(person => {
    const distance = Math.hypot(person.to.x - person.from.x, person.to.y - person.from.y);
    if (distance < .1 || !person.figure.animate) return;
    person.figure.dataset.motion = 'spreading';
    const animation = person.figure.animate([
      { transform: transformAt(person.from) },
      { transform: transformAt(person.to) }
    ], { duration: distance / SPEED * 1000, easing: 'linear', fill: 'none' });
    person.animation = animation;
    person.figure.dataset.startedAt = performance.now().toFixed(3);
    animation.onfinish = () => {
      if (person.animation !== animation) return;
      person.animation = null;
      person.figure.dataset.motion = 'parked';
      if (record.people.every(item => !item.animation)) record.group.dataset.motion = 'parked';
    };
  });
}

function scheduleLayout() {
  if (!active || layoutFrame || document.hidden) return;
  layoutFrame = requestAnimationFrame(() => {
    layoutFrame = 0;
    records.forEach(layout);
  });
}

for (const config of PLACES) {
  const target = document.querySelector(config.selector);
  if (!target?.parentElement) continue;
  const parent = target.parentElement;
  const madeHost = getComputedStyle(parent).position === 'static';
  if (madeHost) parent.classList.add('pedestrian-crowd-host');
  target.classList.add(`pedestrian-crowd-${config.kind}`);
  const group = document.createElement('span');
  group.className = `pedestrian-crowd pedestrian-crowd--${config.kind}`;
  group.setAttribute('aria-hidden', 'true');
  group.setAttribute('inert', '');
  group.dataset.pedestrianTarget = target.id || config.selector;
  const people = Array.from({ length: config.count }, (_, index) => makePerson(COLORS[(colorOffset + index) % COLORS.length], index, config.selector));
  colorOffset = (colorOffset + 1) % COLORS.length;
  people.forEach(person => group.append(person.figure));
  parent.append(group); // App-owned mutable text and accessible names remain untouched.
  records.push({ config, target, parent, group, people, madeHost, clearance: 0, geometryKey: '', ready: false, visible: false, entryPlayed: false });
}

records.forEach(layout);
const sizeObserver = new ResizeObserver(scheduleLayout);
const textObserver = new MutationObserver(scheduleLayout);
records.forEach(record => {
  sizeObserver.observe(record.target);
  sizeObserver.observe(record.parent);
  textObserver.observe(record.target, { childList: true, characterData: true, subtree: true });
});
const entryObserver = new IntersectionObserver(entries => {
  for (const entry of entries) {
    const record = records.find(item => item.target === entry.target);
    if (!record) continue;
    if (!entry.isIntersecting || entry.intersectionRatio === 0) {
      record.visible = false;
      record.entryPlayed = false;
      stop(record);
    } else if (!record.visible && entry.intersectionRatio >= .15) {
      record.visible = true;
      layout(record);
      spread(record);
    }
  }
}, { threshold: [0, .15] });
records.forEach(record => entryObserver.observe(record.target));

const stopAll = () => records.forEach(stop);
const onResize = () => { stopAll(); scheduleLayout(); };
const onVisibility = () => {
  if (document.hidden) {
    cancelAnimationFrame(layoutFrame);
    layoutFrame = 0;
    stopAll();
  } else {
    scheduleLayout();
    records.filter(record => record.visible && !record.entryPlayed).forEach(spread);
  }
};
const onPageHide = event => {
  stopAll();
  if (!event.persisted) teardown();
};

function teardown() {
  if (!active) return;
  active = false;
  cancelAnimationFrame(layoutFrame);
  stopAll();
  sizeObserver.disconnect();
  textObserver.disconnect();
  entryObserver.disconnect();
  motionQuery.removeEventListener('change', stopAll);
  motionControl?.removeEventListener('change', stopAll);
  removeEventListener('resize', onResize);
  removeEventListener('pageshow', scheduleLayout);
  removeEventListener('pagehide', onPageHide);
  document.removeEventListener('visibilitychange', onVisibility);
  records.forEach(record => {
    record.group.remove();
    record.target.classList.remove(`pedestrian-crowd-${record.config.kind}`);
    record.target.style.removeProperty('--pedestrian-clearance');
    if (record.madeHost) record.parent.classList.remove('pedestrian-crowd-host');
  });
}

motionQuery.addEventListener('change', stopAll);
motionControl?.addEventListener('change', stopAll);
addEventListener('resize', onResize, { passive: true });
addEventListener('pageshow', scheduleLayout);
addEventListener('pagehide', onPageHide);
document.addEventListener('visibilitychange', onVisibility);
document.fonts?.ready.then(scheduleLayout);
scheduleLayout();
