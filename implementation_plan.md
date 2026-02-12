# Version Bump: 1.2 -> 1.3

## Goal
Update the application version from `1.2` to `1.3` (specifically `gsg-v 1.3 122025` where applicable) across all configuration files, source code, and documentation.

## Proposed Changes

### Backend
#### [MODIFY] [pom.xml](file:///e:/workspace/gsg-IT4U/backend/pom.xml)
- Change `<version>1.2.0</version>` to `<version>1.3.0</version>`.

### Frontend
#### [MODIFY] [package.json](file:///e:/workspace/gsg-IT4U/frontend/package.json)
- Change `"version": "1.2.0"` to `"version": "1.3.0"`.

#### [MODIFY] [App.jsx](file:///e:/workspace/gsg-IT4U/frontend/src/App.jsx)
- Update footer text: `gsg-v 1.2 122025` -> `gsg-v 1.3 122025`.

### Documentation
#### [MODIFY] [README.md](file:///e:/workspace/gsg-IT4U/README.md)
- Update "Current Version" references.
- Update release note headers (latest only).

#### [MODIFY] [functional_document.md](file:///e:/workspace/gsg-IT4U/functional_document.md)
- Update version headers.

## Verification Plan

### Automated
- Run `npm run build` (Frontend) -> Verify success.
- Run `mvn package` (Backend) -> Verify success.

### Manual
- Inspect `App.jsx` footer change.
- Verify `pom.xml` and `package.json` versions.
