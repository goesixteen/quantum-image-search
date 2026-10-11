"""Plot exact Grover formulas beside saved statevector results; no model fitting."""
from pathlib import Path
import json
import math
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

here = Path(__file__).resolve().parent
report = json.loads((here / "report.json").read_text())
fig, axes = plt.subplots(1, 2, figsize=(11, 4.3), constrained_layout=True)
colors = ["#285b99", "#c54d45"]
maximum = max(case["maximum"] for case in report["cases"])
rounds = list(range(maximum + 1))
for case, color in zip(report["cases"], colors):
    theta = math.asin(math.sqrt(case["M"] / case["N"]))
    analytic = [math.sin((2 * r + 1) * theta) ** 2 for r in rounds]
    for row in case["rounds"]:
        assert abs(row["acceptedProbability"] - analytic[row["round"]]) < 1e-11
    title = f"{case['targetCount']} " + ("copy" if case["targetCount"] == 1 else "copies")
    axes[0].plot(rounds, analytic, color=color, label=f"{title}: M={case['M']}, peak r={case['peak']}")
    axes[1].plot(rounds, [p / case["M"] for p in analytic], color=color, label=title)
    for ax, divisor in zip(axes, [1, case["M"]]):
        ax.scatter([row["round"] for row in case["rounds"]][::4],
                   [row["acceptedProbability"] / divisor for row in case["rounds"]][::4],
                   s=13, color=color, marker="o", linewidths=.6, edgecolors="white", zorder=3)
        ax.axvline(case["peak"], color=color, alpha=.22, linewidth=1)
for ax, title in zip(axes, ["Probability of either accepted address", "Probability of one particular Wanda copy"]):
    ax.set(title=title, xlabel="Completed Grover rounds", ylabel="Exact Born probability", ylim=(0, 1.04), xlim=(0, maximum))
    ax.grid(alpha=.18)
    ax.legend(frameon=False, fontsize=9)
fig.suptitle("Frozen Wanda detector: one versus two fully visible copies", fontsize=15)
fig.supxlabel("N=4096. Lines: sin²((2r+1)asin√(M/N)); dots: saved statevector. Both accepted points match a target.", fontsize=9)
output = here.parents[2] / "docs" / "screenshots" / "wanda-two-target-convergence.png"
fig.savefig(output, dpi=190)
fig.savefig(here / "convergence.svg")
print(output)
