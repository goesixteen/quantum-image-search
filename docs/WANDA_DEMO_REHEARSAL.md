# Where’s Wanda — private two-minute rehearsal

Draft for owner review. No contest submission, public video, source or Qollab
project has been sent. Use the [private website](https://quantum-crowd-search.syrupyspool2.chatgpt.site/).
This script was rehearsed against iteration16, source `2f3f836e5d13df81f32abc040f101a2959c04ee0`.
The later welcome interface starts empty. Place Wanda from her box near
(420,300) before following the historical default-placement script below;
the new introduction has not been included in the recorded rehearsal timing.
The two-minute timings below are a proposed spoken script, not a measured
presentation or a claim about learning outcomes.

## Prepare

Choose **Start over** and wait for Festival. Keep Wanda at the default52px size
and measured-point region420,300, fully visible. Keep the trained Wanda detector
and default display settings. Open at desktop width for the rehearsal.
In Image + QNN, choose **Fast · 4 gates/s** and leave Reduce animations unchecked.
Each20-gate layer then takes approximately5seconds, plus rendering overhead.
Four layers at Explore speed would take approximately80seconds and do not fit
this short script. Test the chosen browser before presenting.

## Spoken script and actions

| Time | Action | Say |
|---|---|---|
| 0:00–0:25 | Show the five world choices and Wanda in Festival. Choose Find Wanda and let the overlay finish. | “Hide Wanda in a crowd. A trained quantum neural network scores image windows, then Grover amplifies the locations that the detector accepts. The interesting part is how quantum signs change the odds.” |
| 0:25–0:40 | Open Look under the hood, Inspect top-scoring window, set Fast and Restart. Play the first layer. Pause at its automatic gate20 stop. | “Seven pixel descriptors and the supplied size become rotation angles. Learned rotations and CNOTs transform one joint four-qubit state. These spheres show each qubit’s reduced state.” |
| 0:40–1:05 | Continue explicitly through layers2,3,4, stopping at40,60,80. Point to the fixed full-circuit score. | “The angles were trained beforehand and stay fixed during this check. CNOTs can entangle the qubits, so their individual arrows can lie inside the spheres. The score below uses all four layers, even while we inspect an earlier state.” |
| 1:05–1:20 | Point to the classical bridge, then choose Grover interference and Start at round0. | “The classifier has four qubits. Its threshold and peak suppression define accepted addresses. A separate twelve-qubit register represents4,096 possible locations.” |
| 1:20–1:40 | Watch one round. Point first to Flip signs, then Reflect; allow its single saved commit. | “The oracle reverses the accepted amplitudes’ signs. That alone leaves their probabilities unchanged. The second reflection creates interference and changes those probabilities. This is one real simulated round.” |
| 1:40–2:00 | Choose First peak, then Measurement and Sample this state once. Show the address and independent target check. | “At the first useful peak, accepted locations carry almost all the probability. We sample the saved distribution once and check the returned point afterward. More rounds can overshoot, and Grover cannot repair a detector’s wrong acceptance.” |

Speak during playback. Do not wait silently through each rotation. The script
does not run50 rounds live in this final shortcut: **First peak** selects the
simulator’s already computed exact round50. The game’s soft heat field uses
smoothing and interpolation for display, while the technical amplitudes and probabilities are
exact snapshots. Do not describe either as quantum-hardware execution.

If the one sample is unmarked, show it honestly. Do not repeat samples until a
good outcome appears and call that the first shot. If the page stalls, pause and
read the status; do not claim a result that is still pending. Start over restores
the demonstration, but a restart is a new attempt.

## Short answers for technical questions

- **Is it genuinely trained?** Yes: input angles feed a trained four-qubit,
  four-layer circuit; seven expectations feed a learned classical readout.
  Training happened offline. The live demo performs inference and statevector
  simulation, not training or quantum-hardware execution.
- **Where is the oracle?** Classical window scores, thresholding and peak
  suppression compile accepted addresses. Grover marks that resulting predicate
  with sign flips in the separate location register. This is a hybrid pipeline.
- **Why are arrows shorter?** They are reduced states of a pure joint state,
  obtained by tracing out other wires. Entanglement can make an individual state
  mixed. Connected ZZ correlations alone are not an entanglement witness.
- **Does it recognize anyone or beat classical vision?** No such result is
  established. The frozen native benchmark uses the same known Wanda PNG on five
  known backgrounds, supplied scales and fully visible placements. The matched
  classical baseline is slightly better:299/300 versus298/300 target scenes.
  Browser rendering and the curated Park lookalike have separate retained
  failures, including false acceptances at40/46px.
- **Is there a quantum speedup?** None is demonstrated end to end. The app
  classically scores image windows and simulates the quantum states. It explains
  amplitude amplification under a prepared oracle, including its limitations.

## Internal presentation priorities

The provisional30/35/25/10 split means fun, engaging explanation, technical rigor
and reproducibility. These are planning assumptions, not an official rubric.
Lead with the playful placement, spend most narration on the difficult idea of
phase/interference, and keep benchmark/provenance detail available for questions.
Quantum Unlocked is the user’s selected theme. Actual submission format and
duration are not established by this script; nothing is ready-authorized for
contest submission.

Read the [handoff](WANDA_HANDOFF.md), [exact release receipt](history/publication-receipt.json),
[quick-start](WANDA_QUICKSTART.md), [source bundle](quantum-image-search-deliverables.zip)
and [scientific scope](../waldo-search-lab/docs/WANDA_LESSON.md). Keep the schoolbus
deliverable as the separate comparison, not another detour in this short story.
