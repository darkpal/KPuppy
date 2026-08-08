# Releasing KPuppy (webOS / Homebrew)

Feed used by Homebrew Channel:

`https://raw.githubusercontent.com/darkpal/KPuppy/main/homebrew/apps.json`

That file’s `manifestUrl` must point at the **current** release manifest. Updating only the GitHub Release is not enough if `apps.json` still pins an older tag.

## Steps

```bash
# 1) version
# edit package.json → 0.0.X

npm run test:run
npm run build
rm -f com.kpuppy.app_*.ipk
ares-package dist -o .

# 2) manifest (ipkHash MUST be { "sha256": "..." })
IPK=com.kpuppy.app_0.0.X_all.ipk
SHA=$(shasum -a 256 "$IPK" | cut -d' ' -f1)
# write com.kpuppy.app.manifest.json with version, ipkUrl, ipkHash.sha256

# 3) Homebrew feed — required every release
# homebrew/apps.json → manifestUrl =
# https://github.com/darkpal/KPuppy/releases/download/v0.0.X/com.kpuppy.app.manifest.json

git add package.json homebrew/apps.json src tests
git commit -m "Release v0.0.X …"
git push darkpal HEAD:main

gh release create v0.0.X "$IPK" com.kpuppy.app.manifest.json \
  --repo darkpal/KPuppy --target main --title "v0.0.X" --notes "…"
```

## Common failure

`Invalid file checksum (undefined expected, got …)` → manifest has string `ipkHash` instead of `{ "sha256": "…" }`.

## Distinguish Homebrew checksum errors from LG installer errors

There are two separate verification stages:

1. Homebrew Channel downloads the IPK and compares it with
   `manifest.ipkHash.sha256`.
2. LG `com.webos.appInstallService/dev/install` verifies and installs that
   already-downloaded IPK.

`Invalid file checksum (<expected> expected, got <actual>)` is stage 1. Fix the
manifest or uploaded asset.

`-5: ipk verified failed` is stage 2. Do not rotate the manifest hash blindly.
First prove the public artifact is intact:

```bash
curl -L -o /tmp/kpuppy.ipk \
  https://github.com/darkpal/KPuppy/releases/download/v0.0.X/com.kpuppy.app_0.0.X_all.ipk
shasum -a 256 /tmp/kpuppy.ipk
ares-package -c dist
ares-package -I /tmp/kpuppy.ipk
```

If the downloaded SHA matches the manifest and `ares-package` accepts the IPK,
the failure is device-side. Check automatic TV date/time, an active/extended
Developer Mode session on unrooted setups, or Homebrew Channel root/elevation
state after reboot. A cold TV reboot may be required after correcting that
state. Repacking identical content does not address device signature/session
verification.
