# AGENTS

## Purpose

This file defines the execution plan for parallel agents working on the theater QR + AR quest MVP.

Primary MVP goal:
- Open the site over HTTPS.
- Request camera access.
- Scan a QR code.
- Open an AR scene.
- Show a 3D character above a marker.
- Let the user start a quest and talk to the character.
- Save quest progress in the backend database.

## Product Scope

Project type:
- Mobile-first web app with QR entry point, marker-based AR scene, simple quest flow, and backend persistence.

Core user flow:
1. User opens the web app.
2. User grants camera permission.
3. User scans a QR code.
4. App opens the character scene.
5. Marker is detected and a 3D model appears.
6. User taps `Start Quest` or `Talk`.
7. Frontend calls backend API.
8. Backend returns quest/dialog data.
9. Progress is stored and restored.

## Recommended Stack

Frontend:
- React + Vite
- Three.js
- React Three Fiber
- `@react-three/drei`
- `html5-qrcode`
- MindAR
- Zustand

Backend:
- Node.js
- Express
- PostgreSQL

Deployment:
- Frontend: Vercel or Netlify
- Backend: Render or similar

## Agent Roles

### Agent 1: Frontend / AR

Responsibilities:
- Build the React app.
- Implement camera access and QR scanning.
- Implement marker-based AR scene.
- Load and render 3D character models.
- Build quest/dialog UI.
- Integrate frontend with backend API.

Deliverables:
- Working QR scanner screen.
- Working AR viewer screen.
- Visible `.glb` model anchored to marker.
- Buttons for `Start Quest` and `Talk`.
- Error and loading states.

Execution steps:
1. Create frontend app structure.
2. Install required dependencies.
3. Create QR scanner component.
4. Create AR viewer component.
5. Add model loading and simple animation.
6. Add UI controls and state store.
7. Connect to backend endpoints.
8. Test on mobile browser.

Definition of done:
- QR scan works on supported mobile browsers.
- Marker detection opens or updates AR content.
- 3D character is visible.
- User can start a quest and get response from API.

### Agent 2: Backend / API

Responsibilities:
- Build the Node.js backend.
- Configure database connection.
- Create quest and dialogue data model.
- Implement API endpoints.
- Persist and restore quest progress.

Deliverables:
- Running Express server.
- Health endpoint.
- Quest endpoints.
- Dialogue endpoint.
- Database schema and seed data.

Execution steps:
1. Create backend app structure.
2. Install server dependencies.
3. Configure Express, CORS, JSON parsing, env variables.
4. Add PostgreSQL connection.
5. Create tables: `users`, `characters`, `quests`, `quest_steps`, `quest_progress`, `dialogues`.
6. Implement API endpoints.
7. Add validation and error handling.
8. Seed one working quest flow.

Definition of done:
- `GET /api/health` returns success.
- Quest start and progress update work.
- Dialogue endpoint returns deterministic replies.
- Progress is stored in DB and can be restored.

### Agent 3: Integration / QA

Responsibilities:
- Verify frontend-backend communication.
- Validate full user flow.
- Check mobile behavior and fallback handling.
- Prepare demo-ready build.

Deliverables:
- Tested end-to-end flow.
- Bug list with severity.
- Final verification checklist.

Execution steps:
1. Verify frontend can reach backend.
2. Test QR -> AR -> quest -> dialog -> save flow.
3. Test camera denied state.
4. Test marker not found state.
5. Test API unavailable state.
6. Validate responsive mobile UI.
7. Verify deployment settings and HTTPS.

Definition of done:
- Full MVP path works on at least one real mobile device.
- Main failure states show understandable messages.
- Demo build is deployable and stable.

## Shared API Contract

Minimum endpoints:
- `GET /api/health`
- `GET /api/characters/:id`
- `POST /api/quests/start`
- `GET /api/quests/:userId`
- `PUT /api/quests/:userId`
- `POST /api/dialog`

Contract rules:
- JSON request/response only.
- Stable field names across frontend and backend.
- Return user-friendly errors for expected failures.

## Shared Data Model

Required tables:
- `users`
- `characters`
- `quests`
- `quest_steps`
- `quest_progress`
- `dialogues`

Minimum seed content:
- 1 user or anonymous test user
- 2 characters
- 1 quest
- 2-3 quest steps
- 1 dialogue set per character

## Work Sequence

### Phase 1: Setup
1. Create repository structure:
   - `frontend/`
   - `backend/`
2. Initialize frontend and backend apps.
3. Add shared environment configuration.

### Phase 2: Core MVP
1. Frontend agent implements QR scanning.
2. Frontend agent implements AR marker rendering.
3. Backend agent implements API and DB.
4. Both agents align request/response payloads.

### Phase 3: Integration
1. Connect `Start Quest` button to API.
2. Connect `Talk` flow to API.
3. Save and reload progress.

### Phase 4: Hardening
1. Add error handling.
2. Test mobile UX.
3. Optimize 3D assets if needed.
4. Prepare deployment.

## Priorities

Highest priority:
1. Camera access.
2. QR scanning.
3. Marker-based 3D rendering.
4. Working API health and quest start.
5. Saved quest progress.

Medium priority:
1. Dialogue polish.
2. UI polish.
3. Asset optimization.

Lower priority:
1. Realtime features.
2. AI-driven dialogue.
3. Admin panel.

## Risks And Mitigations

1. iOS Safari AR limitations.
   Mitigation: provide fallback 3D view or clear unsupported message.
2. Heavy 3D assets.
   Mitigation: use small `.glb` files first; optimize later.
3. Camera permission denied.
   Mitigation: show clear retry instructions.
4. Marker detection instability.
   Mitigation: use a high-contrast marker and clear scan instructions.
5. Backend unavailable.
   Mitigation: show API error state and avoid silent failure.

## MVP Acceptance Checklist

- App runs over HTTPS.
- Camera permission is requested.
- QR code is detected.
- AR scene is opened.
- 3D character is shown above marker.
- `Start Quest` works.
- `Talk` works.
- Progress is saved and restored.
- Mobile UI remains usable.

## Notes For Agents

- Prefer the smallest working implementation.
- Do not block on advanced optimization before MVP works.
- Keep API payloads simple and explicit.
- Test with real devices as early as possible.
- Treat iPhone support as a constrained platform and prepare fallback messaging.
