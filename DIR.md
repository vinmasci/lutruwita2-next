# Directory Structure

```
.
├── .gitignore
├── ARCHITECTURE.md
├── DIR.md
├── GPX_Processing_Issues.md
├── index.html
├── MIGRATION_LOG.md
├── MIGRATIONPLAN.md
├── package-lock.json
├── package.json
├── tailwind.config.js
├── tsconfig.app.json
├── tsconfig.base.json
├── tsconfig.client.json
├── tsconfig.json
├── tsconfig.node.json
├── tsconfig.server.json
├── logs/
│   ├── error.log
│   ├── exceptions.log
│   ├── rejections.log
│   ├── server.log
├── public/
│   └── favicon.ico
├── server/
│   ├── package-lock.json
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── server.ts
│   │   ├── controllers/
│   │   │   └── gpx.controller.ts
│   │   ├── features/
│   │   │   └── gpx/
│   │   │       ├── controllers/
│   │   │       │   └── gpx.controller.ts
│   │   │       ├── routes/
│   │   │       │   └── gpx.routes.ts
│   │   │       ├── services/
│   │   │       │   ├── gpx.service.ts
│   │   │       │   └── progress.service.ts
│   │   │       ├── types/
│   │   │       │   └── gpx.types.ts
│   │   ├── routes/
│   │   │   └── gpx.routes.ts
│   │   ├── services/
│   │   │   └── gpx/
│   │   │       └── gpx.processing.ts
│   │   ├── shared/
│   │   │   ├── config/
│   │   │   │   └── server.config.ts
│   │   │   ├── middlewares/
│   │   │   │   ├── error-handling.ts
│   │   │   │   └── upload.middleware.ts
│   │   │   └── types/
│   │   │       └── gpx.types.ts
│   └── uploads/
├── src/
│   ├── App.tsx
│   ├── env.d.ts
│   ├── index.css
│   ├── main.tsx
│   ├── theme.ts
│   ├── components/
│   │   └── ui/
│   │       └── skeleton.tsx
│   ├── features/
│   │   ├── gpx/
│   │   │   ├── components/
│   │   │   │   ├── ElevationProfile/
│   │   │   │   │   └── ElevationProfile.tsx
│   │   │   │   ├── Uploader/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── Uploader.tsx
│   │   │   │   │   ├── Uploader.types.ts
│   │   │   │   │   └── UploaderUI.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useGpxProcessing.ts
│   │   │   ├── routes/
│   │   │   │   └── gpx.ts
│   │   │   ├── services/
│   │   │   │   └── gpxService.ts
│   │   │   └── types/
│   │   │       └── gpx.types.ts
│   │   ├── map/
│   │   │   ├── components/
│   │   │   │   ├── MapControls/
│   │   │   │   │   └── MapControls.tsx
│   │   │   │   ├── MapView/
│   │   │   │   │   └── MapView.tsx
│   │   │   │   ├── Sidebar/
│   │   │   │   │   ├── icons.ts
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── Sidebar.styles.ts
│   │   │   │   │   ├── Sidebar.tsx
│   │   │   │   │   ├── SidebarListItems.tsx
│   │   │   │   │   ├── types.ts
│   │   │   │   │   └── useSidebar.ts
│   │   │   ├── context/
│   │   │   │   └── MapContext.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useGpxProcessing.ts
│   │   │   │   └── useMap.ts
│   │   │   ├── services/
│   │   │   │   └── mapService.ts
│   │   │   └── types/
│   │   │       └── map.types.ts
│   │   └── poi/
│   │       ├── components/
│   │       │   └── POIMarker/
│   │       │       └── index.ts
│   ├── lib/
│   │   ├── errors.ts
│   │   └── utils.ts
│   ├── types/
│   │   ├── api.types.ts
│   │   └── index.ts
│   └── utils/
│       └── gpx/
│           └── parsing.ts
└── uploads/
    └── gpxFile-1737847751475-711406356.gpx
