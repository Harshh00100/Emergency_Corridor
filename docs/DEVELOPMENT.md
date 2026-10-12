# Development guide

Use Node.js 18 or newer and install dependencies with `npm install`. Copy `.env.example` to `.env` for local configuration. Start the Vite development server with `npm run dev`.

Keep components focused on presentation and user intent. Put calculations into a pure utility when they are used by more than one component or when they need unit tests. Public API calls belong in `src/services/api`; a component should use a feature hook instead of calling `fetch` directly.

Before submitting changes:

```bash
npm run lint
npm test
npm run build
npm run test:browser
```

When adding shared state, add an action type, reducer transition, and a reducer test. When changing public response handling, add a service test for both valid and malformed responses. Use explicit source labels for all fallback or simulated values.

Run `npx playwright install chromium` once before browser tests. The production offline shell is generated from `src/offline/service-worker.js`; it is not registered during `npm run dev`. Change the serializer version and provide a migration before altering the saved-scenario schema incompatibly. Keep API request effects cancellable when a scenario is replaced.
