# Grover simulator: mathematical contract and limitations

`dist/quantum.js` is a dependency-free browser ES module. It simulates a standard
uniform initialization, a binary phase oracle, and inversion about the mean. It
does not require quantum hardware. The browser explicitly stores every amplitude,
so its execution time is classical.

## State and operators

For a power-of-two search space `N = 2^n`, an index labels one image region.
The array entry `state[i]` is the real amplitude of basis state `|i>`; its
measurement probability is `state[i] ** 2`. Initialization is

```text
|s> = (1 / sqrt(N)) sum_{i=0}^{N-1} |i>
```

The marked set defines the predicate `f(i)`: 1 for a classifier-positive region,
0 otherwise. The phase oracle negates amplitudes at marked indices. It does not
change their probabilities immediately. The diffuser then replaces every
amplitude `a_i` by `2 * mean(a) - a_i`:

```text
O_f |i> = (-1)^f(i) |i>
D = 2|s><s| - I
G = D O_f
```

Each recorded iteration means one complete oracle followed by one diffuser.
`history[0]` is the uniform initial state. Every snapshot contains signed
amplitudes as well as squared probabilities; a chart of probabilities alone hides
the phase changes responsible for interference.

With `M` marked states and `theta = asin(sqrt(M/N))`, the exact success probability
after `k` completed iterations is

```text
P_k(marked) = sin^2((2k + 1) theta)
a_i(k) = sin((2k + 1) theta) / sqrt(M)         when marked
a_i(k) = cos((2k + 1) theta) / sqrt(N - M)     when unmarked
```

The first peak is near `k = pi/(4 theta) - 1/2`. The module compares the two
adjacent nonnegative integers and prefers fewer calls when their probabilities
tie. Continuing past the peak can sharply reduce success. These standard Grover
relationships follow the original search construction and the analysis of
multiple solutions. [Grover (1996)](https://arxiv.org/abs/quant-ph/9605043),
[Boyer, Brassard, Hoyer, Tapp (1996/1998), sections 2–4](https://arxiv.org/abs/quant-ph/9605034).

## Verified reference values

| Regions `N` | Marked `M` | Initial marked probability | Recommended `k` | Final marked probability |
| ---: | ---: | ---: | ---: | ---: |
| 16 | 1 | 6.25% | 3 | 96.13189697% |
| 16 | 2 | 12.5% | 2 | 94.53125% |
| 16 | 4 | 25% | 1 | 100% |
| 64 | 1 | 1.5625% | 6 | 99.65856808% |
| 64 | 2 | 3.125% | 4 | 99.91823155% |
| 64 | 4 | 6.25% | 3 | 96.13189697% |

For `N=16, M=1`, running 6 iterations reduces success to approximately 2.038%.
This is an instructive overshoot demonstration; additional iterations are not
additional independent attempts.

## API

All output vectors are ordinary JavaScript arrays. Functions copy inputs instead
of modifying them, and simulation snapshots do not share mutable array storage.
Arrays and typed arrays are accepted as state inputs. Marked indices can be any
iterable; duplicates are removed before the oracle is applied.

| Export | Contract |
| --- | --- |
| `createUniformState(N)` | Returns `N` copies of `1/sqrt(N)`. |
| `oracle(state, markedIndices)` | Returns a state with exactly the marked amplitudes negated. |
| `diffuse(state)` | Returns `2*mean(state)-state[i]` at every index. |
| `probabilities(state)` | Returns amplitude squares without renormalization. |
| `recommendIterations(N,M)` | Returns the first-peak count for a known marked count. Returns 0 for empty/full sets. |
| `simulateGrover(N,markedIndices,iterations?)` | Returns `{history,iterations,theta}`. History includes iteration 0 through `iterations`, each `{iteration,amplitudes,probabilities,successProbability}`. |
| `sample(probabilities,random=Math.random)` | Draws one outcome; nonnegative finite weights are normalized by their total. A supplied RNG must return a finite value in `[0,1)`. |
| `bitstring(index,qubits)` | Returns the padded big-endian display label, e.g. `bitstring(3,4) === '0011'`. A 0-qubit register returns an empty label. |

Example:

```javascript
import { simulateGrover, sample, bitstring } from './quantum.js';

const N = 16;
const marked = [11]; // Determined by the classifier, not the known bus position.
const run = simulateGrover(N, marked);
const final = run.history.at(-1);
console.log(run.iterations);             // 3
console.log(final.successProbability);   // 0.9613189697265625
const measured = sample(final.probabilities);
console.log(measured, bitstring(measured, 4));
```

An empty marked set gives 0 success probability and 0 default iterations. If the
caller explicitly requests iterations, the state remains uniform. That outcome
does not prove there is no schoolbus in the picture; it says the provided
classifier predicate has no positives. If every state is marked, the success
probability is already 1 and no amplification is useful. Explicit iterations can
change the global phase but not observable probabilities.

Invalid sizes, out-of-range indices, nonintegral iteration counts, nonfinite
amplitudes, and invalid probability distributions throw explicit errors. The
module does not silently repair unnormalized input amplitudes. Finite-precision
norm drift is tolerated only when sampling a probability distribution.

## What this demo can claim

The QNN supplies a learned image predicate. Grover amplifies the indices that this
predicate marks. A useful evaluation reports three different quantities:

1. **Classifier quality:** how well the QNN detects schoolbus-containing regions.
2. **Amplification quality:** the probability of measuring any classifier-positive
   region, conditioned on its fixed marked set.
3. **Localization quality:** how often that measured region overlaps the actual
   bus, using a declared overlap threshold or region label convention.

These quantities can disagree. A false positive is amplified just as faithfully
as a true bus region. A bus spanning two cells may produce more than one valid
mark. If the QNN's threshold misses every cell containing the bus, Grover cannot
recover the missing evidence. Ground-truth placement should be used for scoring
localization, never as the source of the marked set.

The current browser architecture obtains scores for every region, thresholds them
classically, and then constructs a diagonal oracle from that truth table. This is
a legitimate ideal Grover circuit simulation for a fixed predicate. Its oracle
construction has already examined the regions. It does not establish a faster
image detector than classical inference.

For a coherent implementation, the image features must be accessible by an index
register and the predicate must be implemented reversibly, with temporary data
uncomputed after applying the phase. A measured QNN expectation value plus a
classical threshold does not by itself provide that coherent predicate. A future
implementation must specify how features, QNN inference, the decision rule, and
uncomputation are represented inside the oracle, including their resource costs.

## Query accounting

For an already available ideal binary phase oracle and `M` solutions, amplitude
amplification uses on the order of `sqrt(N/M)` oracle calls. This is a conditional
query-model result, discussed for known and unknown solution counts in
[Boyer et al.](https://arxiv.org/abs/quant-ph/9605034).

The simulator counts one phase-oracle call per completed iteration. It does not
include training, all-region QNN inference, loading the picture, state
preparation, gate decomposition, repeated shots, or verifying a measured result.
An actual implementation of a phase oracle from a compute/phase/uncompute
construction can use two calls to its underlying predicate computation per phase
oracle. The UI should label counts as **ideal Grover oracle calls**.

For a comparable ideal classical predicate, random sampling with replacement has
expected `N/M` queries to find a mark. Scanning a random order without replacement
has expected `(N+1)/(M+1)` queries and worst case `N-M+1`. These expectations are
not identical to the cost of a single probabilistic Grover attempt. Comparisons
must state their success criterion and retry/verification policy.

In this JavaScript implementation, each Grover iteration traverses an `N`-entry
vector. Runtime is `O(kN)` plus marked-set processing; recording the full
trajectory uses `O((k+1)N)` memory. This grows exponentially in register size
because `N=2^n`. Use small grids (such as 16 or 64 regions) for an interactive
presentation. The recommendation assumes the demo knows `M` from its classically
constructed oracle. It is not quantum counting.

## Validation and reproducibility

Run from the project directory:

```powershell
node --test tests/quantum.test.mjs
```

Ten tests verify phase versus probability behavior, the diffuser against an
independently constructed matrix, exact one-of-four search, full analytic
amplitude trajectories on 16 and 64 states, normalization, first-peak selection,
overshoot, empty/full sets, duplicate marks, independent history storage, binary
labels, and explicit invalid-input failures. A seeded 20,000-shot measurement
experiment is reproducible and checks the observed hit rate against the final
Born probability within one percentage point. No shot data are used to tune the
statevector formula.

Validated in work step 1 on 2026-10-10: **10 passed, 0 failed**.
