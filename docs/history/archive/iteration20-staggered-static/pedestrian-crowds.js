// Static interface ornaments only: never drawn into the game/search canvases.
const COLORS = ['red', 'yellow', 'blue'];
const PLACES = [
  { selector: '.play-heading h1', kind: 'heading', count: 9, min: 28, max: 40 },
  { selector: '.hood-heading h2', kind: 'heading', count: 6, min: 27, max: 35 },
  { selector: '#lesson-step-title', kind: 'heading', count: 3, min: 24, max: 29 },
  { selector: '#find', kind: 'action', count: 4, min: 24, max: 30 },
  { selector: '#lesson-run', kind: 'action', count: 3, min: 23, max: 28 },
  { selector: '#circuit-play', kind: 'action', count: 3, min: 22, max: 27 },
  { selector: '#grover-watch', kind: 'action', count: 3, min: 23, max: 28 },
  { selector: '#lesson-sample', kind: 'action', count: 4, min: 23, max: 28 },
  { selector: '#explainer-next', kind: 'action', count: 3, min: 22, max: 27 }
];
const records = [];
let layoutFrame = 0;
let active = true;
let colorOffset = 0;

const px = value => `${Math.round(value * 100) / 100}px`;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

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

function scheduleLayout() {
  if (!active || layoutFrame || document.hidden) return;
  layoutFrame = requestAnimationFrame(() => {
    layoutFrame = 0;
    records.forEach(layout);
  });
}

function makePerson(color, index, seedKey) {
  const figure = document.createElement('span');
  figure.className = 'pedestrian-crowd-person';
  figure.dataset.color = color;
  const image = document.createElement('img');
  image.alt = '';
  image.draggable = false;
  image.decoding = 'async';
  image.loading = 'lazy';
  image.src = `assets/ui-pedestrians/pedestrian-${color}.png`;
  figure.append(image);
  const random = seededValues(`${seedKey}/${index}`);
  const person = { figure, image, ratio: 5 / 6, index, size: random(), rise: random(), facing: random() < .5 ? -1 : 1 };
  figure.dataset.facing = person.facing < 0 ? 'left' : 'right';
  image.style.setProperty('--pedestrian-facing', String(person.facing));
  image.addEventListener('load', () => {
    if (!active || !image.naturalHeight) return;
    person.ratio = image.naturalWidth / image.naturalHeight;
    scheduleLayout();
  }, { once: true });
  return person;
}

function labelObstacles(scope, target, targetRect, clearance) {
  const obstacles = [];
  const top = targetRect.top - clearance - 3;
  const bottom = targetRect.bottom + 32;
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
  const scale = innerWidth <= 360 ? .82 : innerWidth <= 650 ? .9 : 1;
  const clearance = Math.ceil(config.max * scale) + 14;
  if (record.clearance !== clearance) {
    record.clearance = clearance;
    target.style.setProperty('--pedestrian-clearance', px(clearance));
  }
  const targetRect = target.getBoundingClientRect();
  const parentRect = parent.getBoundingClientRect();
  const visible = targetRect.width > 0 && targetRect.height > 0;
  group.classList.toggle('is-positioned', visible);
  if (!visible) return;
  group.style.left = px(targetRect.left - parentRect.left - parent.clientLeft + parent.scrollLeft);
  group.style.top = px(targetRect.top - parentRect.top - parent.clientTop + parent.scrollTop);
  group.style.width = px(targetRect.width);
  group.style.height = px(targetRect.height);
  const region = target.closest('.play-heading,.hood-heading,.play-menu,.circuit-core,.grover-guide,.compact-explainer') || parent;
  const regionRect = region.getBoundingClientRect();
  const left = Math.max(8, regionRect.left + 5) - targetRect.left;
  const right = Math.max(left, Math.min(innerWidth - 8, regionRect.right - 5) - targetRect.left);
  const available = right - left;
  const sizes = people.map(person => {
    const depthScale = person.index % 2 ? .86 : 1;
    const height = (config.min + (config.max - config.min) * person.size) * scale * depthScale;
    return { height, width: Math.min(height * person.ratio, available) };
  });
  const obstacles = labelObstacles(parent.parentElement || parent, target, targetRect, clearance);
  const insideLeft = Math.max(left, 0);
  const insideRight = Math.min(right, targetRect.width);
  const leftCount = config.kind === 'heading' ? Math.max(1, Math.floor(people.length / 3)) : Math.ceil(people.length / 2);
  const rightCount = config.kind === 'heading' ? Math.max(1, people.length - leftCount - 2) : Math.floor(people.length / 2);
  const averageWidth = sizes.reduce((sum, size) => sum + size.width, 0) / sizes.length;
  const step = Math.min(averageWidth * .8, 22 * scale, targetRect.width / (people.length + 1));
  const clear = (candidate, size) => !obstacles.some(rect => candidate.x < rect.right && candidate.x + size.width > rect.left && candidate.y < rect.bottom && candidate.y + size.height > rect.top);
  people.forEach((person, index) => {
    const size = sizes[index];
    const onLeft = config.kind === 'action' ? index % 2 === 0 : index < leftCount;
    const rank = config.kind === 'action' ? Math.floor(index / 2) : onLeft ? index : Math.min(index - leftCount, rightCount - 1);
    const perchX = onLeft ? insideLeft + rank * step : insideRight - size.width - rank * step;
    // Two uneven depth tiers remain visible even when narrow screens have no gutters.
    const tier = index % 2 ? 18 : 1 + person.rise * 3;
    const perchY = config.kind === 'action' ? Math.max(-clearance + 1, -size.height - 2 - tier) : Math.max(0, clearance - size.height - 2 - tier);
    const fallback = { x: perchX, y: perchY, kind: 'perch' };
    const candidates = [];
    if (config.kind === 'heading' && index >= leftCount + rightCount) {
      const side = index % 2 ? 'right' : 'left';
      const sideX = side === 'left' ? -size.width - 5 : targetRect.width + 5;
      candidates.push({ x: sideX, y: clearance + (targetRect.height - clearance) * .45 - size.height / 2, kind: 'flank' });
      candidates.push({ x: targetRect.width + 5 + (index % 2) * step, y: targetRect.height - size.height - 3, kind: 'flank' });
    } else if (config.kind === 'action' && index >= 2) {
      const sideX = onLeft ? -size.width * .62 : targetRect.width - size.width * .38;
      candidates.push({ x: sideX, y: targetRect.height - size.height * .72, kind: 'corner' });
      candidates.push({ x: sideX, y: Math.max(1, targetRect.height * .3 - size.height / 2), kind: 'corner' });
    }
    candidates.push(fallback);
    candidates.push({ x: insideLeft + (index + .25) * (insideRight - insideLeft) / people.length, y: perchY, kind: 'perch' });
    const bounded = candidates.map(candidate => ({ ...candidate, x: clamp(candidate.x, left, right - size.width) }));
    const chosen = bounded.find(candidate => clear(candidate, size)) || { ...fallback, x: clamp(fallback.x, insideLeft, insideRight - size.width), y: config.kind === 'action' ? -clearance + 1 : 0 };
    person.figure.dataset.placement = chosen.kind;
    person.figure.style.left = px(chosen.x);
    person.figure.style.top = px(chosen.y);
    person.figure.style.width = px(size.width);
    person.figure.style.height = px(size.height);
    person.figure.style.zIndex = String(index % 2 ? 1 : 2);
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
  // Mutable headings/button labels remain ordinary app-owned text.
  parent.append(group);
  records.push({ config, target, parent, group, people, madeHost, clearance: 0 });
}

const sizeObserver = new ResizeObserver(scheduleLayout);
records.forEach(record => {
  sizeObserver.observe(record.target);
  sizeObserver.observe(record.parent);
});
const onVisibility = () => {
  if (document.hidden) {
    cancelAnimationFrame(layoutFrame);
    layoutFrame = 0;
  } else scheduleLayout();
};
const onPageHide = event => {
  if (!event.persisted) teardown();
};

function teardown() {
  if (!active) return;
  active = false;
  cancelAnimationFrame(layoutFrame);
  sizeObserver.disconnect();
  removeEventListener('resize', scheduleLayout);
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

addEventListener('resize', scheduleLayout, { passive: true });
addEventListener('pageshow', scheduleLayout);
addEventListener('pagehide', onPageHide);
document.addEventListener('visibilitychange', onVisibility);
document.fonts?.ready.then(scheduleLayout);
scheduleLayout();
