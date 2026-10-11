/**
 * clipart-cast.js: purely decorative clip-art bystanders drawn around the game controls.
 * Not part of the quantum pipeline: the figures live in an aria-hidden, inert overlay
 * outside the scene canvas, so they never reach the pixels that the QNN scores.
 */
// Ten static people stand on three game objects. No ornament enters the scene canvas.
const GROUPS = [
  { anchor: 'scene-frame', selector: '.scene-frame', people: [1, 2, 3, 4], heights: [36, 33, 38, 35] },
  { anchor: 'welcome-card', selector: '.play-menu', people: [5, 6, 7], heights: [34, 37, 35] },
  { anchor: 'find', selector: '#find', people: [8, 9, 10], heights: [30, 32, 29] }
];
// Alpha-bottom rows of the intact 1024×1536 PNGs; these are display metrics only.
const FOOT_ROWS = [1500, 1522, 1512, 1508, 1522, 1526, 1522, 1536, 1521, 1504];
const host = document.querySelector('#experiment');
const records = [];
let active = true;
let layoutFrame = 0;
const px = value => `${value}px`;

function scheduleLayout() {
  if (!active || layoutFrame || document.hidden) return;
  layoutFrame = requestAnimationFrame(() => {
    layoutFrame = 0;
    layout();
  });
}

function makePerson(group, person, index) {
  const figure = document.createElement('span');
  figure.className = 'clipart-cast-person';
  figure.dataset.person = `person-${String(person).padStart(2, '0')}`;
  figure.dataset.instance = '1';
  figure.dataset.anchor = group.anchor;
  figure.dataset.placement = 'right-top-edge';
  const image = document.createElement('img');
  image.alt = '';
  image.draggable = false;
  image.decoding = 'async';
  image.src = `assets/ui-clipart/person-${String(person).padStart(2, '0')}.png`;
  image.style.setProperty('--cast-facing', (person * 7 + index * 3) % 5 < 2 ? '-1' : '1');
  figure.append(image);
  image.addEventListener('load', () => {
    figure.dataset.asset = 'ready';
    scheduleLayout();
  }, { once: true });
  image.addEventListener('error', () => { figure.dataset.asset = 'missing'; }, { once: true });
  return { figure, image, person, baseHeight: group.heights[index], footFraction: FOOT_ROWS[person - 1] / 1536 };
}

function gameObstacles() {
  const boxes = [];
  const add = rect => {
    if (rect.width > 2 && rect.height > 2) boxes.push(rect);
  };
  for (const element of host.querySelectorAll('button,canvas,input,select,a,.tray-portrait,.scene-thumbnails,.wanda-speech-bubble')) add(element.getBoundingClientRect());
  const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let node;
  while ((node = walker.nextNode())) {
    if (!node.textContent.trim() || node.parentElement?.closest('.clipart-cast-layer,#wanda-drag-ghost,.sr-only')) continue;
    range.selectNodeContents(node);
    for (const rect of range.getClientRects()) add(rect);
  }
  return boxes;
}

function layout() {
  if (!active || !host) return;
  const hostRect = host.getBoundingClientRect();
  const viewportWidth = document.documentElement.clientWidth;
  const mobile = innerWidth <= 650;
  const obstacles = gameObstacles();
  for (const record of records) {
    const rect = record.target.getBoundingClientRect();
    const gap = mobile ? 1.5 : 2;
    const sizes = record.people.map(person => {
      const imageHeight = mobile ? Math.max(24, person.baseHeight * .84) : person.baseHeight;
      return { imageHeight, width: imageHeight * 2 / 3, height: imageHeight * person.footFraction };
    });
    const clusterWidth = sizes.reduce((sum, size) => sum + size.width, 0) + gap * (sizes.length - 1);
    const right = Math.min(rect.right - (mobile ? 5 : 8), viewportWidth - 8);
    const minimumLeft = Math.max(rect.left + 4, 8);
    const defaultLeft = Math.max(minimumLeft, right - clusterWidth);
    const clearAt = start => {
      let left = start;
      return record.people.every((person, index) => {
        const size = sizes[index];
        const box = { left, right: left + size.width, top: rect.top - size.height, bottom: rect.top };
        left += size.width + gap;
        return !obstacles.some(other => box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top);
      });
    };
    // Preserve one compact group and its exact shared feet edge; only shift left if needed.
    let start = defaultLeft;
    if (!clearAt(start)) {
      const limit = Math.max(minimumLeft, rect.left + rect.width * .5);
      for (let proposal = defaultLeft - 3; proposal >= limit; proposal -= 3) {
        if (clearAt(proposal)) { start = proposal; break; }
      }
    }
    const clear = clearAt(start);
    record.group.dataset.clear = String(clear);
    record.group.dataset.edge = String(rect.top);
    record.group.dataset.count = String(record.people.length);
    let left = start;
    record.people.forEach((person, index) => {
      const size = sizes[index];
      person.figure.style.left = px(left - hostRect.left);
      person.figure.style.top = px(rect.top - size.height - hostRect.top);
      person.figure.style.width = px(size.width);
      person.figure.style.height = px(size.height);
      person.figure.style.setProperty('--cast-image-height', px(size.imageHeight));
      person.figure.dataset.left = String(left);
      person.figure.dataset.top = String(rect.top - size.height);
      person.figure.dataset.feet = String(rect.top);
      person.figure.dataset.height = String(size.height);
      person.figure.dataset.clear = String(clear);
      left += size.width + gap;
    });
  }
}

if (host) {
  const madeHost = getComputedStyle(host).position === 'static';
  if (madeHost) host.classList.add('clipart-cast-host');
  const worlds = host.querySelector('.world-picker');
  const menu = host.querySelector('.play-menu');
  const find = host.querySelector('#find');
  worlds?.classList.add('clipart-cast-worlds');
  menu?.classList.add('clipart-cast-menu');
  find?.classList.add('clipart-cast-find');
  const layer = document.createElement('div');
  layer.className = 'clipart-cast-layer';
  layer.setAttribute('aria-hidden', 'true');
  layer.setAttribute('inert', '');
  layer.dataset.count = '10';
  for (const group of GROUPS) {
    const target = host.querySelector(group.selector);
    if (!target) continue;
    const element = document.createElement('div');
    element.className = 'clipart-cast-group';
    element.dataset.anchor = group.anchor;
    const people = group.people.map((person, index) => makePerson(group, person, index));
    people.forEach(person => element.append(person.figure));
    layer.append(element);
    records.push({ target, group: element, people });
  }
  host.append(layer);
  const sizeObserver = new ResizeObserver(scheduleLayout);
  [host, worlds, menu, find, ...records.map(record => record.target)].filter(Boolean).forEach(element => sizeObserver.observe(element));
  const mutationObserver = new MutationObserver(mutations => {
    if (mutations.some(mutation => !mutation.target.parentElement?.closest('.clipart-cast-layer,#wanda-drag-ghost') && !mutation.target.closest?.('.clipart-cast-layer,#wanda-drag-ghost'))) scheduleLayout();
  });
  mutationObserver.observe(host, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['hidden', 'class', 'style'] });
  const onVisibility = () => {
    if (document.hidden) { cancelAnimationFrame(layoutFrame); layoutFrame = 0; }
    else scheduleLayout();
  };
  const onPageHide = event => {
    if (event.persisted) return;
    active = false;
    cancelAnimationFrame(layoutFrame);
    sizeObserver.disconnect();
    mutationObserver.disconnect();
    removeEventListener('resize', scheduleLayout);
    removeEventListener('pageshow', scheduleLayout);
    removeEventListener('pagehide', onPageHide);
    document.removeEventListener('visibilitychange', onVisibility);
    layer.remove();
    worlds?.classList.remove('clipart-cast-worlds');
    menu?.classList.remove('clipart-cast-menu');
    find?.classList.remove('clipart-cast-find');
    if (madeHost) host.classList.remove('clipart-cast-host');
  };
  addEventListener('resize', scheduleLayout, { passive: true });
  addEventListener('pageshow', scheduleLayout);
  addEventListener('pagehide', onPageHide);
  document.addEventListener('visibilitychange', onVisibility);
  document.fonts?.ready.then(scheduleLayout);
  scheduleLayout();
}
