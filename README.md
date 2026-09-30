# Unlimited Duration AI Explainer Video Generator

A provider-agnostic AI explainer-video workspace designed around **duration-by-content** rather than a fixed maximum duration.

## What this project provides

- Web UI for creating explainer-video projects.
- File-based project storage with resumable jobs.
- Segment/chapter based timelines so very long videos do not need to be rendered as one giant request.
- Provider interfaces for script generation, narration, visuals, subtitles, and rendering.
- Local/demo providers that work without paid AI APIs.
- FFmpeg rendering support when FFmpeg is installed.
- No application-level maximum duration: the requested duration is represented as a target, not a hard-coded ceiling.
- Progress reporting and cancellation hooks.
- Configuration through environment variables.

> "Unlimited" here means the application does not impose a fixed duration ceiling. Real limits still come from available CPU/GPU/RAM, disk space, browser memory, FFmpeg performance, provider quotas, and hosting limits.

## Architecture

```
Browser -> API -> Job Manager -> Content Providers -> Segment Renderer -> Final Video
                         |             |                    |
                         |             +-- script           +-- FFmpeg
                         |             +-- narration
                         |             +-- visuals
                         +-- project metadata
```

The pipeline is intentionally modular so a free/local provider can be used now and stronger providers can be added later without changing the UI.

## Run locally

Requirements:

- Node.js 20+
- npm
- FFmpeg (optional for the demo API; required for actual video rendering)

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## API

- `POST /api/projects` create a project
- `GET /api/projects` list projects
- `GET /api/projects/:id` inspect a project
- `POST /api/projects/:id/generate` start generation
- `GET /api/projects/:id/progress` stream progress as Server-Sent Events
- `DELETE /api/projects/:id` delete a project

Example:

```bash
curl -X POST http://localhost:3000/api/projects \
  -H "content-type: application/json" \
  -d '{"title":"How Space Weather Works","prompt":"Explain space weather for beginners","targetDurationSeconds":3600}'
```

## Design principles

1. Never use a fixed `MAX_DURATION` constant.
2. Split long projects into independently resumable segments.
3. Keep the browser responsible for control and preview, not giant in-memory video buffers.
4. Keep AI providers behind interfaces.
5. Make local/free execution possible with deterministic demo providers.
6. Store progress so interrupted jobs can resume.

## License

MIT. See [LICENSE](LICENSE).
