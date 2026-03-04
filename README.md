# Popul8

Compose reusable SVG and CSS outputs from CSV data.

Popul8 is a web app that takes CSV data and an SVG template, maps fields, and generates print-ready pages.

## Features
- Upload one or more CSV files
- Upload and edit SVG templates
- Map CSV fields to SVG placeholders
- Preview, select, and print generated pages
- Offline-capable PWA

## Development
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

## Preview Production Build
```bash
npm run preview
```

## Quality Gates
```bash
npm run lint
npm run build
npm run test
```

## Keyboard Shortcuts
- `Ctrl/Cmd + 1`: Upload
- `Ctrl/Cmd + 2`: Edit Template
- `Ctrl/Cmd + 3`: Map Data
- `Ctrl/Cmd + 4`: Select Rows
- `Ctrl/Cmd + 5`: Preview
- `Ctrl/Cmd + Shift + P`: Managed print request (routes through app print handler)
