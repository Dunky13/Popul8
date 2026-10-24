# Pages release delivery

The Pages workflow publishes only on `release.published`. It does not publish
or build automatic main-push previews. The release-please workflow still runs
on main pushes.

GitHub Pages uses the source commit SHA as the deployment version. Deploying a
preview on a main push and then different stable files on a release of the same
SHA can report success while continuing to serve the preview artifact. See
[actions/deploy-pages issue 383](https://github.com/actions/deploy-pages/issues/383).
Reserve each release SHA's first Pages promotion for the stable release.

After promotion, the workflow compares the canonical HTTPS root, deploy marker,
and root JavaScript bundle byte for byte with the uploaded site. HTTP failures,
an old marker, or different content fail verification. The bounded checks allow
for propagation; they do not rerun a deployment or change provider settings.

## Existing v1.7.1 incident

The accepted v1.7.1 source is
`76c8b8b1334a1166c0203922511ce0a1e2222a26`. Push run `40045235546`, release run
`40045436096` attempt 1, and its authorized attempt 2 submitted different Pages
artifacts under that same deployment version. Both release attempts reported
success while the public root continued to reference the previous stable bundle
and the deploy marker identified the push run.

This workflow repair prevents future push/release collisions. It does not prove
that the existing v1.7.1 deployment has recovered, and merging it does not rerun
the release workflow stored at the old tag. Keep the signed tag and published
release fixed. Any new release or deployment source requires the owner's next
delivery decision and fresh artifact/public-byte verification.

Cloudflare defaults were not verified. No DNS, TLS, proxy, origin, security,
custom-domain, or application-source changes form part of this repair.
