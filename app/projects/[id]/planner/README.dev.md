Dev notes — Planner page and API auth
===================================

When running the frontend locally the Planner page fetches tasks from the backend API at /api/tasks/project/:projectId.

If you see a 401 Unauthorized or "Access token required" in the browser console, that means the frontend has no valid auth token for the backend.

Quick ways to make Planner load tasks in development:

- Sign in using the app's built-in sign-in (click the Sign in button in the planner card). This will set the session/cookie or auth token used by the API client.
- If testing in a headless environment or automated QA, set a valid token in localStorage under key `auth_token` or use the backend auth shim.

Example (set token in browser console):

```js
localStorage.setItem('auth_token', 'YOUR_TEST_TOKEN')
window.location.reload()
```

If you prefer not to sign in during local dev, you can also:

- Configure the API client to use a development bypass token (only for local testing) — NOT recommended for production.
- Mock the tasks API in the UI tests.

If you need help creating a test token for local development, let me know and I can add a dev helper script that prints a test token for a sample dev user.
