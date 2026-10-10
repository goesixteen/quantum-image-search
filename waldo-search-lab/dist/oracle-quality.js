import { simulateGrover, recommendIterations } from './quantum.js';

// A deliberately constructed teaching oracle. This is separate from all image
// classifiers and never changes their scores, marked sets, or measurements.
export function oracleScenario({ size = 16, falseMarks = 0, acceptTarget = true, hasTarget = true, iterations } = {}) {
  if (![16, 64].includes(size)) throw new RangeError('Choose 16 or 64 candidate regions.');
  if (!Number.isInteger(falseMarks) || falseMarks < 0 || falseMarks >= size) throw new RangeError('False marks must leave the designated target region available.');
  if (typeof acceptTarget !== 'boolean' || typeof hasTarget !== 'boolean') throw new TypeError('Target controls must be boolean.');
  const marks = Array.from({ length: falseMarks }, (_, i) => i + 1);
  if (hasTarget && acceptTarget) marks.unshift(0);
  const rounds = iterations ?? recommendIterations(size, marks.length);
  if (!Number.isInteger(rounds) || rounds < 0 || rounds > 12) throw new RangeError('Choose 0–12 Grover rounds.');
  const frame = simulateGrover(size, marks, rounds).history[rounds];
  return {
    size, marks, rounds, hasTarget, acceptTarget, falseMarks,
    probabilities: frame.probabilities,
    acceptedMass: frame.successProbability,
    // Match the main demos' abstention rule: no measurement for an empty oracle.
    targetMass: marks.length && hasTarget ? frame.probabilities[0] : 0,
    hasOutput: marks.length > 0,
    recommended: recommendIterations(size, marks.length),
  };
}

export function mountOracleLab(root) {
  const find = (name) => root.querySelector('[data-oq="' + name + '"]');
  const size = find('size'), errors = find('errors'), present = find('present');
  const accepted = find('accepted'), rounds = find('rounds');
  const percentage = (value) => (value * 100).toFixed(2) + '%';
  const configuration = () => ({ size: Number(size.value), falseMarks: Number(errors.value), hasTarget: present.checked, acceptTarget: accepted.checked, iterations: Number(rounds.value) });
  function render() {
    const result = oracleScenario(configuration());
    find('error-count').textContent = result.falseMarks;
    find('round-count').textContent = result.rounds;
    find('accepted-mass').textContent = result.hasOutput ? percentage(result.acceptedMass) : 'No output';
    find('target-mass').textContent = result.hasOutput ? percentage(result.targetMass) : 'No output';
    find('marked-count').textContent = result.marks.length + ' / ' + result.size;
    accepted.disabled = !present.checked;
    const board = find('board'); board.replaceChildren();
    board.style.gridTemplateColumns = 'repeat(' + Math.sqrt(result.size) + ', 1fr)';
    const maximum = Math.max(...result.probabilities);
    result.probabilities.forEach((probability, index) => {
      const tile = document.createElement('span');
      const marked = result.marks.includes(index), target = result.hasTarget && index === 0;
      tile.className = 'oq-tile' + (marked ? ' oq-marked' : '') + (target ? ' oq-target' : '');
      tile.setAttribute('aria-hidden', 'true');
      tile.title = 'Region ' + (index + 1) + ': ' + percentage(probability) + (target ? ' · true target' : '') + (marked ? ' · accepted' : '');
      const bar = document.createElement('i'); bar.style.height = (100 * probability / maximum) + '%';
      const label = document.createElement('b'); label.textContent = target ? '★' : index + 1;
      tile.append(bar, label); board.append(tile);
    });
    board.setAttribute('aria-label', result.size + ' regions, ' + result.marks.length + ' accepted. ' + (result.hasTarget ? 'The only true target is region 1. ' : 'There is no target. ') + (result.hasOutput ? 'Accepted-set probability ' + percentage(result.acceptedMass) + ', true-target probability ' + percentage(result.targetMass) + '.' : 'The uniform state is shown; no measurement is requested.'));
    const presets = { clean: [true, true, 0], contaminated: [true, true, 3], miss: [true, false, 1], absent: [false, false, 4] };
    root.querySelectorAll('[data-case]').forEach((button) => {
      const [hasTarget, acceptTarget, falseMarks] = presets[button.dataset.case];
      const active = result.size === 16 && result.hasTarget === hasTarget && result.acceptTarget === acceptTarget && result.falseMarks === falseMarks && result.rounds === result.recommended;
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    let explanation;
    if (!result.hasOutput) explanation = 'No region is accepted. This demo abstains, just like the image experiments; the uniform state is shown but no measurement is requested.';
    else if (!result.hasTarget) explanation = 'There is no target. Every accepted region is a false positive, even when accepted-set probability reaches 100%.';
    else if (!result.acceptTarget) explanation = 'The target is outside the accepted set. Amplification follows the wrong region; a small unmarked probability can remain, but it does not repair recognition.';
    else if (result.falseMarks) explanation = 'The true target shares accepted probability equally with ' + result.falseMarks + ' wrong region' + (result.falseMarks === 1 ? '' : 's') + '. At these settings, target probability is accepted probability ÷ ' + result.marks.length + '.';
    else explanation = 'The oracle accepts the one true target. Accepted-set and true-target probabilities agree. Extra rounds can still overshoot the first peak.';
    find('explanation').textContent = explanation;
  }
  function firstPeak() {
    errors.max = Number(size.value) - 1;
    errors.value = Math.min(Number(errors.value), Number(errors.max));
    const marks = Number(errors.value) + Number(present.checked && accepted.checked);
    rounds.value = recommendIterations(Number(size.value), marks); render();
  }
  [size, errors, present, accepted].forEach((control) => control.addEventListener('input', firstPeak));
  rounds.addEventListener('input', render);
  find('peak').addEventListener('click', firstPeak);
  root.querySelectorAll('[data-case]').forEach((button) => button.addEventListener('click', () => {
    size.value = '16'; present.checked = button.dataset.case !== 'absent';
    accepted.checked = !['miss', 'absent'].includes(button.dataset.case);
    errors.value = { clean: 0, contaminated: 3, miss: 1, absent: 4 }[button.dataset.case];
    firstPeak();
  }));
  root.querySelectorAll('[data-answer]').forEach((button) => button.addEventListener('click', () => {
    find('quiz-feedback').textContent = button.dataset.answer === 'correct'
      ? 'Exactly. Grover amplifies the predicate it is given. Check true-target probability separately.'
      : 'Accepted regions can all be wrong. A 100% oracle success rate alone does not guarantee a target.';
    root.querySelectorAll('[data-answer]').forEach((answer) => answer.setAttribute('aria-pressed', answer === button ? 'true' : 'false'));
  }));
  firstPeak();
}

if (typeof document !== 'undefined') document.querySelectorAll('[data-oracle-lab]').forEach(mountOracleLab);
