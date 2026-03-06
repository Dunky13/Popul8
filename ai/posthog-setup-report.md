<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the character sheet generator. The app is a Vite+React browser SPA so `posthog-js` was used (the correct client-side SDK). A singleton is initialised once in `src/lib/posthog.ts` and imported by each instrumented file. Ten events were added across six files covering the full five-step card-generation workflow — from uploading source files through to generating and printing cards.

| Event | Description | File(s) |
|---|---|---|
| `csv uploaded` | User successfully uploads a CSV data file | `src/components/FileUpload/FileUpload.tsx` |
| `template uploaded` | User successfully uploads an SVG template file | `src/components/TemplateUpload/TemplateUpload.tsx` |
| `bootstrapped csv downloaded` | User downloads the auto-generated CSV scaffold based on detected placeholders | `src/components/TemplateUpload/TemplateUpload.tsx` |
| `template from history used` | User loads a previously uploaded SVG template from history | `src/components/TemplateUpload/TemplateUpload.tsx` |
| `step navigated` | User navigates between workflow steps (properties: `from_step`, `to_step`) | `src/App.tsx` |
| `data mapping auto suggested` | User clicks Auto-Suggest Mapping (properties: `placeholder_count`, `auto_mapped_count`) | `src/components/DataMapping/DataMapping.tsx` |
| `data mapping completed` | All placeholders are mapped; ready for preview (properties: `placeholder_count`, `mapped_count`, `coverage_percent`) | `src/components/DataMapping/DataMapping.tsx` |
| `print layout configured` | User changes grid or preset layout (properties: `page_size`, `orientation`, `rows`, `columns`, `source`) | `src/components/PrintSidebar/PrintSidebar.tsx` |
| `cards generated` | User reaches the preview step with renderable records (properties: `record_count`, `placeholder_count`) | `src/App.tsx` |
| `file upload failed` | A file upload fails validation or processing (properties: `error_message`, `file_type`) | `src/hooks/useFileUpload.ts` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behaviour, based on the events we just instrumented:

- **Dashboard — Analytics basics:** https://eu.posthog.com/project/135886/dashboard/553073
- **Card Generation Funnel** (conversion funnel upload → mapping → cards generated): https://eu.posthog.com/project/135886/insights/2YajYokP
- **Upload & Generation Activity** (daily trend of CSV uploads, template uploads, cards generated): https://eu.posthog.com/project/135886/insights/h44mqQh3
- **Upload Failures & Auto-Suggest Usage** (weekly bar chart of errors vs auto-suggest clicks): https://eu.posthog.com/project/135886/insights/8wtuCIK1
- **Step Navigation Depth** (daily per-step navigation counts to identify drop-off): https://eu.posthog.com/project/135886/insights/5k0g7bz9
- **Power Feature Usage** (print layout changes, bootstrapped CSV downloads, template history reuse): https://eu.posthog.com/project/135886/insights/AxAvNZqQ

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/posthog-integration-javascript_node/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
