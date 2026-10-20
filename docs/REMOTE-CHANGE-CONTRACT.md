# Remote changes and CI execution

Prepare a complete change set locally, including all translation diagnostics.
Feature-branch pushes do not trigger the full release workflow. A draft PR is
preparation, not evidence of release review. Mark it ready only after the actual
current-source review is complete. Ordinary PRs and main retain release:verify;
production also retains the exact current user approval contract.

The existing Vercel branch allowlist already excludes CI maintenance branches;
it is preserved without adding or changing deployment configuration. Main and
the existing allowed branches retain release:verify. This is branch deployment
configuration, not notification suppression:
https://vercel.com/docs/project-configuration/git-configuration.

The Pele source preview runs only through workflow_dispatch. It collects all
independent diagnostics in one run and fails if any check fails. Missing review
or production approval is not represented as a successful release. A source
build failure blocks web projection, so stale output is not presented as valid.

Use Achmage remote_change_prepare/status/record and stable remote-change-run.
Repository/branch failure history spans sessions. A prepared remote preview is
allowed when local execution is unavailable; one automatic recovery requires
the exact failed log, a relevant source fix and fresh validation. An unknown
remote outcome must be observed before retry. Never reset the budget using a
new session, empty commit or branch. Do not disable notifications or hide errors.

Runtime guard coverage is enrolled Git repositories and participating native
hooks. Hosted tools bypassing hooks and arbitrary programs are outside the
enforcement boundary. External result observations are labelled agent-attested.

Evidence: R-028 research:rr-1ad24d4afa5a7b1fc9197b695501d220:c4d9bb461ae42e69602668661e73ede4782679474f938244703633f92da78a8f.
