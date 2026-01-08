Calendar Web Frontend

Run:

  cd web_frontend
  npm install
  npm run dev

By default the frontend will talk to API base URL from env VITE_API_BASE_URL, fallback http://127.0.0.1:8080

Implemented:
- Vite + React + TypeScript scaffold
- Login/Register, Calendars list, Members, Month view, Event create/edit, Tasks
- JWT saved in localStorage (calendar_token) and attached to requests
- 401 handling -> logout and redirect to /login
- Fetch wrapper with timeout (AbortController)

Not implemented yet:
- recurrence, exdates, overrides (out of scope MVP)
