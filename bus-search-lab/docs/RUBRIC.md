# Qollab × IonQ rubric and quality reference

Checked October 10, 2026, America/New_York against the official [Rules & terms](https://qollab.xyz/programs/hackathon/terms) and [How it works / judging / FAQ](https://qollab.xyz/programs/hackathon/how-it-works#judging). The intended event is **Qollab × IonQ, October 9–11, 2026**. Earlier investigation of PennyLane QHack was about a different event and is superseded here.

**Current human instruction: do not submit any work; keep iterating improvements.** This rubric is a quality/reference guide. Public Qollab uploads, public source/video publication, and captain submission are withheld. Local SDK validation, local drafts, and improvements to the existing private review sites may continue. Requirements/deadlines below do not authorize an external action.

The official pages were retrieved directly over HTTPS when the web index could not read them. This document distinguishes published requirements from our quality assessment. Both private review websites are deployed. Registration, team/node eligibility, Qollab account access, and external contest publication remain unverified and are not being pursued under the current instruction.

## Published submission requirements

The terms require Qiskit, a runnable public Qollab project under MIT, accessible UI, a project page explaining use/reproduction, disclosure of pre-existing work, and a public 2–3 minute working-demo video that requires no sign-in. Supporting external frontend/backend repositories must be public and MIT-licensed. The build/submission window closes **Sunday, October 11 at 7:00 PM Eastern**. Code/documentation must remain available on Qollab for 12 months, with the attribution “This effort is supported by Qollab & IonQ”. [Official terms](https://qollab.xyz/programs/hackathon/terms).

The four published judging traits are **Novelty & Creativity, Technical Execution, Impact Potential, and Documentation Quality**. The retrieved pages provide no numerical criterion weights. Local judges review first; advancing projects are scored again globally. [Official judging page](https://qollab.xyz/programs/hackathon/how-it-works#judging).

The terms set a bar beyond a standard tutorial/reference implementation: a new application context, technical extension, or original analytical/educational contribution. They allow zero scores for novelty and technical execution if this bar is missed. AI/library/template use is allowed when disclosed; additions during the build window are what count. [Official terms](https://qollab.xyz/programs/hackathon/terms).

## Evidence mapped to each criterion

The evidence/gaps below are our assessment, not additional official subcriteria or a promised score.

| Official criterion | Evidence in this project | Main gap or action |
| --- | --- | --- |
| Novelty & Creativity | Two interactive image domains; learned region predicate; visible errors; shared constructed-oracle lesson and quiz; exact error propagation; coherent raw-event/majority appendices | Present the original educational contribution: 100% accepted probability can mean 25% or 0% true-target probability. The supplied teaching oracle is separate from model predictions; do not imply a new Grover algorithm. |
| Technical Execution | 20 Node tests; parity/gradient checks; three matched logistic baselines; 384-probe crowd suites; frozen-before-disclosure photo-v3 evaluation; coherent inverse/reflection checks; local Qiskit; two private sites | Preserve current checkpoints. Photo v3 retains more dim evidence but fails ranking/coverage and default regression; next is v4 local representation and foreground variation with scene-level constrained validation. Keep reserve c identities steward-only until freeze. Platform validation stays deferred. |
| Impact Potential | Reproducible interference/oracle experiments; accepted-vs-true-target lesson, quiz, boundary challenges and two-demo comparison | Obtain explicitly volunteered local feedback or a designed before/after comprehension probe. The implemented quiz alone does not establish a measured learning effect or practical acceleration. |
| Documentation Quality | Persistent state/log; provenance and disclosure ordering; exact model/protocol freeze; matched baselines; rejected candidates; audit denominators and inactive-parameter evidence; local storyboard | Preserve inspected-vs-reserved identity distinctions and renderer/alpha rules. Report predefined probe weighting, true-target mass and nominal slots accurately. Final private deployment receipts belong in root QA; public source/project/video materials stay withheld. |

Iteration 03's architecture audit corrects the parameter narrative: each live hybrid circuit has **40 nominal fitted slots**, including four prediction-insensitive final **RZ slots 25, 27, 29 and 31**. The actual final CNOT ring `0→1→2→3→0` permutes basis amplitudes; Z-product observables depend on probabilities, so these final phases cannot change predictions. The **36 remaining prediction-influencing slots** are not evidence of independence, identifiability or a 36-dimensional function family. Existing checkpoints were not modified. See [hybrid-parameter-audit.json](../../waldo-search-lab/model/hybrid-parameter-audit.json).

The crowd nominal 8 × 8 denominator is **384 predefined probes**, with **369 unique geometry configurations** and 15 repeated corner probes. Report its weighting rather than calling the probes distinct independent scenes. Photo-v3 fresh tests contain new photograph identities but repeated placements of the same trained foreground. The experiments answer different questions and cannot rank the websites by aggregate accuracy. See [SCENE_AUDIT.md](../../waldo-search-lab/docs/SCENE_AUDIT.md), [PHOTO_V3.md](PHOTO_V3.md) and [COMPARISON_PLAN.md](COMPARISON_PLAN.md).

## Best-fit theme

**Quantum Unlocked** is the recommended theme: the project teaches an algorithm and the role of its oracle through an interactive experiment. This is our fit assessment. The official description invites interactive visual teaching of hard quantum concepts. Quantum Impact would require a stronger real-problem performance case; the current demonstration makes no end-to-end quantum-speedup claim. [Official themes and rules](https://qollab.xyz/programs/hackathon/terms).

The pitch should lead with the contribution: *a trainable, inspectable oracle turns an image-placement experiment into a lesson about what Grover can and cannot amplify*. A familiar algorithm can still meet the originality bar through a specific application, benchmarking, and an original explanation; acceptance/scoring remains the judges' decision.

## Packaging that satisfies the Run requirement

The browser site is useful supporting evidence, but it does not replace the Qiskit/Qollab Run path. Prepare a self-contained notebook or Qollab project with a small fixed scene/feature fixture, saved trained weights, a Qiskit circuit, and visible outputs. It should reproduce a selected classification and Grover distribution without depending on a local Node server or a writable filesystem between runs.

The first Qollab package is now implemented at [qollab/main.py](../qollab/main.py), with packaged model/scene fixtures, `main(bus_tile: int = 11, shots: int = 2048)`, and support for Qollab's pre-created backend. It submits one circuit in one backend job. Six local tests passed with Qiskit 2.5.2, including automatic-main/injected-backend emulation. This confirms the local integration; it does not confirm a successful live Qollab publication/run. See [QOLLAB.md](QOLLAB.md).

**A notebook is our recommended packaging choice.** The retrieved rules require a runnable Qiskit project; they do not explicitly say every entry must have a `.ipynb` file. Avoid presenting this implementation choice as an extra official requirement.

The FAQ says judges press Run on a free local simulator; hardware use is not rewarded by itself. Qollab's IonQ path permits one submitted job per run, while local simulators allow multiple. Run state is ephemeral, so ship saved assets/weights as project files. Network calls are read-only GET to CORS-enabled servers. A hosted supporting repository must list dependencies and contain no secrets. [Official platform FAQ](https://qollab.xyz/programs/hackathon/how-it-works#faq).

The team captain submits through the registration page during the window. A public video should show the project actually working; a voiceover screen recording is sufficient. This project cannot assert successful entry until the user's team/account publication and submission are verified. [Official submission/video FAQ](https://qollab.xyz/programs/hackathon/how-it-works#faq).

## Current improvements and deferred submission requirements

1. **Completed locally:** mobile feedback/keyboard controls; common alpha >32 evaluation; true-target probability; unchanged-model street stress preset; constructed oracle lesson/quiz; crowd boundary/reset; two-demo comparison; 20 Node tests. The final private deployment update awaits its external receipt in root QA.
2. **Completed at labelled scope:** same-asset metrics, three matched baselines, expanded crowd nominal/stress probes, independent-photo diagnostics, rejected negative-mix and rejected photo-v3 candidates. V3 was frozen before fresh a/b disclosure and has severe misses despite zero fresh empty false marks. Next: v4 local representation/foreground variation and scene-constrained validation; keep c assets reserved until the later freeze.
3. **Locally verified; external action deferred:** the Qiskit companion. No live Qollab upload/run/publication under the current instruction.
4. **Local preparation only:** project-page text, dependencies, source/AI disclosures and the [2–3 minute storyboard](DEMO_STORYBOARD.md). Do not publish a public project, repository or video as submission material.
5. **Present:** original-code MIT licensing, media licenses/provenance, and reproducibility notes. Preserve required credits and support attribution in any future authorized package.
6. **Withheld for the user:** public project/video publication, eligibility/account verification for submission, and captain entry. No deadline creates authorization to perform them.

Keep the progress log factual about completed local improvements, private review deployments, rejected experiments, and intentionally withheld external actions.
