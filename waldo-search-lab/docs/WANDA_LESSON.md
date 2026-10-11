# One live image, three quantum stages

The game and explanation share the same final RGB image, supplied target size,
frozen trained model and saved search. The explanation is one interactive,
with three tabs. The game remains the place to hide and find Wanda.

Find becomes Stop while scanning or animating; Stop or Escape retains the image
and cancels the old search. The visible Reduce animations checkbox supports
circuit stepping and shorter game playback without changing the saved quantum
state or sampling weights. The OS reduced-motion preference is also honored.

## 1. Image + QNN

Choose a window in the small scene, move it with arrow keys, or inspect the
highest learned score after reading the image. Eight classical measurements
describe stripe rhythm, palette contrasts, color-centroid alignment and supplied
size. These measurements set input angles; they are not semantic person labels.
The inserted coordinates, target presence, clean background and target template
are not classifier inputs.

Four qubits form one joint state with sixteen complex amplitudes. Each layer
encodes input angles, applies learned rotations and an ordered CNOT ring.
**Play this layer** stops at its actual final CNOT: gates 20, 40, 60 and 80 in
this frozen circuit. Continue explicitly to the next layer; reaching gate 80
does not rewind. Restart and the full slider remain available. Pause preserves
the current position; changing windows or manual controls cancels stale playback.
Reduced motion advances one exact gate per click. At a boundary, the map shows
the layer just completed and its CNOT after-state, rather than labelling it as
the next layer's first operation. Training set the learned angles before the
demo; this playback is inference for the selected window.
Pause, scrubbing and gate stepping reveal the actual simulation. The four
Bloch spheres display reduced qubit states derived from the joint state, so
their vectors can lie inside the sphere. They are not independent neurons.
CNOT is shown at exact before/after endpoints; the connecting pulse illustrates
the gate without inventing intermediate quantum states.

The image-angle, learned-angle and CNOT legend and completed circuit readout
remain visible in the primary stage. The score is explicitly the full four-layer
readout even when playback shows an earlier gate. Seven descriptors come from
pixels; supplied size is the eighth classical input. Chart coordinates use CSS
pixels with a bounded high-DPI backing store, so labels keep their readable size.
On narrow displays, the circuit shows a labelled consecutive slice of the real
layer. Gate controls still reach all 80 gates; a slice is not a smaller circuit.

The final seven expectation values feed a learned weighted sum and sigmoid.
Its score is an uncalibrated classifier output. A threshold and local peak
suppression compile the accepted addresses. A selected fine window need not be
its cell's representative. The four-qubit classifier and twelve-qubit location
register are different systems, connected here by a classical predicate.

**Read this image** scans the actual image and saves a round-zero Grover run
without measuring. It does not jump to a successful round or force a result.

## 2. Grover interference

The saved location register begins with equal amplitudes. The phase oracle
changes the sign of accepted amplitudes: a becomes −a. Their squares stay the
same, so this step alone cannot improve the measurement odds.

Reflection about the post-oracle mean sends each amplitude to 2ā−a. Combined
with phase marking, this changes probabilities. Before, phase and reflection
use the same signed-amplitude scale. Reflection previews the next round;
**Complete one round** commits that round to the same saved run.

**Watch one round** presents the current state, its exact oracle sign flip and
the exact reflection preview, then saves one completed round. It does not rewind
the game or interpolate between quantum states. Pause keeps the current preview;
measurement continues to use the last saved round. Restart preview returns to the
beginning of the current saved round. Manual controls, image edits and a new scan
cancel an old guided sequence. Reduced animation uses explicit step clicks.

If **Find Wanda** already completed the game, this stage retains that saved
round. **Start at round 0** explicitly rewinds the same prepared search and
clears its old sample. Tabs and resizing do not rewind it. Follow **Phase flip →
Reflect → Complete one round** to distinguish a preview from a saved round.
The guided control follows that same sequence. The four highlighted steps belong
to this stage, rather than forming another separate lesson. A round played after
the first peak can reduce accepted probability, so the control promises a round,
not an improvement in detection.
The representative bar addresses are labelled as a slice; exact signed heights,
including zero and subpixel tails, use a shared scale across the three views.

The first peak and past-peak controls expose overshoot. More iterations can
reduce accepted-set probability. The two-dimensional inset groups the actual
marked and unmarked subspaces of this uniform-start circuit. The image's soft
display field is not repeated in this primary explanation.

## 3. Measurement

The measurement view uses every exact saved probability pⱼ=aⱼ². Accepted and
unmarked class totals cover the entire location register, without subset
renormalization. A per-address value is shown for a class only when equality
was verified; otherwise individual probabilities remain available. The address
inspector and complete export expose the full distribution, including its
tiny unmarked tail.

The two class-total bars use a fixed zero-to-100% scale at every breakpoint.
Readable numerical labels retain tiny tails even when a bar is too short to see.
The optional joint-state chart keeps all sixteen classifier outcomes, arranging
them in four rows on narrow displays rather than dropping or renormalizing them.

**Sample this state** uses the game's measurement path at the current saved
round. All outcomes remain visible. The accepted predicate and an independent
post-sample target check are different claims. Repeated clicks represent fresh
preparations of the same state; the app does not simulate statevector collapse.
With zero accepted addresses it abstains and disables sampling, even though a
mathematical uniform distribution still exists.

## Navigation and optional evidence

Changing tabs only changes presentation: the window, circuit progress, selected
round and measurement stay intact. Hiding the circuit pauses its animation.
Editing the image, supplied size, threshold or grid invalidates the old run and
returns to stage one. A comparison detector has no Wanda circuit trace.
Left/Right/Home/End navigate the tablist; hidden panels leave the focus order.

Joint-state detail, the full predicate board, display controls, the constructed
oracle exercise and evidence are optional. Historical native 298/300 applies
to the original unseeded five scenes. The curated Park pilot and browser
rendering audits have separate scope and retained failures. This simulation
does not establish broad person recognition, hardware execution or an
end-to-end quantum speedup. No contest project has been uploaded or submitted.

The provisional judging allocation is an internal planning assumption, not an
official rubric. This connected visual explanation primarily supports Quantum
Unlocked's focus on engaging explanations of difficult quantum concepts.

Next: observe a novice walkthrough before claiming educational effectiveness;
make future renderer/generalization studies prospective and freeze them before
reserved testing. Foreground segmentation remains secondary.
