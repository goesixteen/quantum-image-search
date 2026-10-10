# Published review sites

Both Sites deployments succeeded on October 10, 2026. They preserve owner-private access; the owner may need to sign in with ChatGPT to view them. Submission access is a separate outstanding gate.

- Bus CAPTCHA: https://bus-search-quantum-lab.syrupyspool2.chatgpt.site
- Crowd explorer: https://quantum-crowd-search.syrupyspool2.chatgpt.site

Project identities are stored in each project's `.openai/hosting.json`. Reuse them for every update; do not create duplicate sites.

The initial bus publication used source commit `4153a01d066bc84e57bf7481a49beab803a7259d` and deployment `appgdep_6ac9f0621a988191a465f564a1df9d3a`. The initial crowd publication used source commit `89071afadc1b48db29627f0bb3980c704190d53c` and deployment `appgdep_6ac9f27d429081918a247f1e7ba6ddab`. Later documentation-only versions may supersede these initial versions without changing the interactive.

## Windows packaging handoff

The official Sites source helper committed, pushed, and verified the source successfully, but its packaging helper requires Bash, which is absent in this Windows environment. The portable adapter in `work/session-01/` retains the official Git authentication, checkout, push, and source validation logic. It changes only the packaging call to a Node wrapper around `package_static.py`.

That script archives the exact pushed HEAD, runs the unmodified official `prepare-site-build.cjs` validator against that snapshot, verifies `.openai/hosting.json` and the static entry point, and creates the deployment tar. Credentials remain in memory and hidden stdin. No credential belongs in source, output archives, URLs, or notes.

For later hourly updates, mint a fresh short-lived credential for the existing project, use the adapter, and save/deploy the resulting exact source SHA and archive through Sites. Poll only a non-terminal deployment. Record the actual returned URL and terminal status.
