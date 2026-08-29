# Power BI Date Range Visual

A custom Power BI visual that provides a two-calendar date-range picker and applies the selected interval as an advanced report filter.

## Features

- Dual-month date selection
- Previous and next month navigation
- Editable year controls
- Quick date-range presets
- Reset support
- Default range derived from the bound date column
- Native Power BI modal dialog and filter APIs

## Project structure

```text
src/visual.ts                       Power BI visual lifecycle and filtering
src/DatePickerDialog.ts             Modal dialog integration
src/custom_calendar/                Date-range picker implementation
style/visual.less                   Visual styling
capabilities.json                   Date field role and filter capabilities
pbiviz.json                         Visual package metadata
```

## Getting started

Requirements: Node.js 20+ and the Power BI visuals CLI.

```bash
npm install
npm install --global powerbi-visuals-tools
npm start
```

Add the developer visual to a Power BI report and bind a date column to the **Date Field** role.

## Validation and packaging

```bash
npm run lint
npm run package
```

Generated `.pbiviz` packages, build output, editor settings, and dependencies are excluded from version control.
