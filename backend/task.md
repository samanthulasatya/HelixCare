# React UI Migration Progress - decoupled Frontend

- [x] Initialize Vite React Project
  - [x] Run `npx create-vite@latest --help` to comply with frameworks rules
  - [x] Scaffold Vite React application inside `/frontend`
- [x] Dependencies Installation
  - [x] Install `sockjs-client` and `@stomp/stompjs`
- [x] Component Implementations
  - [x] Reconfigure `index.html` with FontAwesome & Google Fonts links
  - [x] Copy CSS glassmorphism styles to `src/index.css`
  - [x] Write `src/App.jsx` carrying websocket loops, WebRTC states, and view routes
  - [x] Write modular component sheets (Auth, Dashboard, Appointments, Chat, SoapInsurance, CallingOverlay)
- [x] Build & Test
  - [x] Run `npm run build` to verify compiling
  - [x] Start Vite dev server on port `3000`
