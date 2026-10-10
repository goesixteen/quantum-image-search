# Constructed oracle lesson

Iteration 03 adds “Confident search. Wrong answer?” to both websites, after the main interaction and scientific explanation. It is an explicitly constructed teaching oracle. It never supplies scores, marks, ground truth, or measurements to either image classifier.

The lesson uses the same actual real-amplitude Grover simulator as the image demos. There are 16 or 64 candidate addresses, one designated target address when present, and a user-selected accepted set. The colors indicate acceptance and target membership; each miniature bar represents an exact Born probability, scaled to the largest bar.

## What it demonstrates

- A correct one-target oracle at N=16, M=1, k=3 gives 96.1319% accepted probability and the same target probability.
- With one correct target and three false positives, N=16, M=4, k=1 gives 100% accepted probability but only 25% target probability.
- With no target and four false positives, the same circuit has 100% accepted probability and 0% target probability.
- A missed target can retain unmarked probability. At N=16, M=1, k=3, each unmarked region receives `(1−Paccepted)/15`; amplification has not repaired the classifier.
- An empty oracle follows the main sites' explicit no-output convention. The UI displays the uniform state and abstains from requesting a measurement.
- If all regions are accepted, the simulator remains uniform; accepting every candidate does not localize a target.

For the main demos, alpha >32 inserted-foreground pixels determine genuine target overlap **after measurement**. The constructed lesson's known target is supplied by its separate teaching configuration. It must not be described as a QNN prediction or performance benchmark.

## Error propagation

Let N be the number of regions, M the number accepted by the oracle, G the number of genuine regions, and T the accepted genuine regions. For a uniform initial state and 0<M<N, after k Grover rounds:

`Paccepted = sin²((2k+1) asin(sqrt(M/N)))`

`Ptarget = Paccepted × T/M + (1−Paccepted) × (G−T)/(N−M)`

The first term is the genuine share of the amplified accepted set; the second is the genuine share remaining outside it. When exactly one genuine target is accepted, this reduces to `Ptarget=Paccepted/M`, which the website shows. For M=N, the uniform target mass is G/N. For M=0, our application requests no measurement and reports no output, rather than equating the uniform state's raw target mass with a reported localization result.

The separate earlier contamination audit compared this equation with actual simulator states in 48,874 cases. Iteration 03 adds three independent golden-case Node tests for the public teaching module, bringing the bus suite to 20 passing tests.

## Learning check and evidence

A local “Check your intuition” question asks whether 100% accepted-set probability guarantees the target. It gives immediate explanatory feedback and records no telemetry. This implements a comprehension check for the educational rubric story. We have not collected participant responses or demonstrated an educational learning effect.

The four presets, sliders, grid selector, first-peak control, and quiz use native accessible controls. Mobile feedback stays near the presets, before the detailed control/region diagram. The example is also linked from the two-demo comparison page. Browser verification and screenshots are recorded in iteration QA.

## Reproduction

Serve either project with `node serve.mjs`; open `/#oracle-lab`. For automated golden cases, run `node --test tests/oracle-quality.test.mjs` in the bus project. The shared module is `dist/oracle-quality.js`, with scoped CSS in `dist/oracle-quality.css`; copies are identical across the two sites.
