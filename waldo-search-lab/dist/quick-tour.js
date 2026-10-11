/**
 * quick-tour.js: wires a <details> "quick tour" whose buttons trigger demo actions and
 * report the result in a feedback element. Not imported by the current index.html.
 *   mountQuickTour(root, actions): actions maps data-tour-step names to async functions
 *   that resolve to a feedback message.
 */
export function mountQuickTour(root, actions) {
  const buttons = [...root.querySelectorAll('[data-tour-step]')];
  const feedback = root.querySelector('[data-tour-feedback]');
  const summary = root.querySelector('summary');
  buttons.forEach(button => {
    button.disabled = !actions[button.dataset.tourStep];
    button.addEventListener('click', async () => {
      buttons.forEach(item => item.disabled = true);
      feedback.textContent = 'Running this tour step…';
      try {
        const message = await actions[button.dataset.tourStep]();
        feedback.textContent = message;
        buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      } catch (error) {
        feedback.textContent = 'This step could not finish. Inspect the main result and retry.';
        console.error(error);
      } finally {
        buttons.forEach(item => item.disabled = !actions[item.dataset.tourStep]);
      }
    });
  });
  document.querySelectorAll('[data-open-tour]').forEach(link => link.addEventListener('click', () => {
    root.open = true; summary.focus({preventScroll: true});
  }));
}
