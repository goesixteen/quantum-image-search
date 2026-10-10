# Quantum Image Search

Private hackathon workspace containing two interactive quantum image-search demonstrations, trained models, classical statevector simulators, evaluation evidence, and project documentation.

## Run the demos

Install Node.js, then open two terminals from the repository root:

```powershell
cd bus-search-lab
node serve.mjs
```

Open http://127.0.0.1:4173 for the schoolbus CAPTCHA demo.

```powershell
cd waldo-search-lab
node serve.mjs
```

Open http://127.0.0.1:4174 for the crowd-search demo. No npm install or build step is required.

## Project guide

- [Latest handoff](ITERATION_03_HANDOFF.md) and [deliverables overview](DELIVERABLES.md)
- [Schoolbus project](bus-search-lab/README.md), including model trainers and the Qiskit companion
- [Crowd-search project](waldo-search-lab/README.md)
- [Current project state](bus-search-lab/docs/PROJECT_STATE.md)
- [Evaluation and simulator explanation](bus-search-lab/docs/SIMULATOR.md)
- [Asset provenance](bus-search-lab/docs/ASSETS.md) and [crowd artwork](waldo-search-lab/docs/ASSETS.md)

The demos score image regions using classically simulated quantum classifiers, compile those scores into a Grover oracle, and simulate amplitude amplification. They do not establish a measured end-to-end runtime advantage or general image-recognition capability. See the model cards and evaluation reports for accuracy, failure cases, and dataset scope.

This repository is private and has not been submitted to the hackathon. Invite teammates through the repository's **Settings → Collaborators** page; a repository link alone does not grant access. Original code licensing and third-party asset credits are documented within each project.
