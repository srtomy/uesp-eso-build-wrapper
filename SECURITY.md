# Security Policy

## Supported Versions

Only the latest release on npm is supported.

## Trust Boundary

This package loads vendored JavaScript from
[uesp/uesp-esochardata](https://github.com/uesp/uesp-esochardata) into Node's global
scope via `vm.runInThisContext`. That means the vendored scripts execute with full access
to the Node.js process — the same trust level as your own application code.

**Do not** pass untrusted content as inputs to `calculateBuild()`. The input is fed
directly into the UESP engine without sanitization. This library is intended for use
with known, application-controlled build data.

## Reporting a Vulnerability

If you find a security issue in this package (not in the upstream UESP engine):

1. **Do not open a public GitHub issue.**
2. Email the maintainer at the address on the npm package page, with subject
   `[SECURITY] uesp-eso-build-wrapper`.
3. Include: description, reproduction steps, and potential impact.

You can expect an acknowledgement within 72 hours. If the issue is confirmed, a patched
release will be published and you will be credited in the release notes (unless you
prefer to remain anonymous).

Issues in the upstream UESP engine (`vendor/uesp-esochardata`) should be reported to
the [uesp/uesp-esochardata](https://github.com/uesp/uesp-esochardata) maintainers.
