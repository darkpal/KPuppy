# Releasing KPuppy (webOS / Homebrew)

Feed used by Homebrew Channel:

`https://raw.githubusercontent.com/darkpal/KPuppy/develop/homebrew/apps.json`

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
git push darkpal HEAD:develop

gh release create v0.0.X "$IPK" com.kpuppy.app.manifest.json \
  --repo darkpal/KPuppy --target develop --title "v0.0.X" --notes "…"
```

## Common failure

`Invalid file checksum (undefined expected, got …)` → manifest has string `ipkHash` instead of `{ "sha256": "…" }`.
