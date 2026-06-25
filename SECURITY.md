# Security Policy

## Supported versions

Security fixes are provided for the latest minor release of the current major version. Maintainers may backport critical fixes when operationally practical.

## Reporting a vulnerability

Do not open a public issue for suspected vulnerabilities. Use the repository host's private security-advisory feature. If that is unavailable, contact the maintainers through the private address published in the repository metadata.

Include affected versions, impact, reproduction details, and any proposed mitigation. Maintainers should acknowledge reports within three business days and coordinate disclosure after a fix is available.

## Deployment boundary

The included HTTP server and simulated backend are reference implementations. Production operators are responsible for:

- authentication, authorization, TLS, and network policy;
- Temporal namespace and mTLS configuration;
- least-privilege Kubernetes, Git, metrics, registry, and object-store credentials;
- secret management and audit-log retention;
- validating third-party adapters before granting infrastructure access.
