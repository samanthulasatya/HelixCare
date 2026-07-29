# Walkthrough - HelixCare Visual & Communication Upgrades

We have successfully implemented the visual, calling, and chat enhancements for HelixCare, bringing premium UX transition animations, loopable ringtones, multiple visual themes, WebRTC screen sharing, and Base64-based file uploads to the application!

---

## 1. Feature Map & Mappings

### 🎨 Visual Theme Customizer
* Adds a new **🎨 Visual Theme** select dropdown at the bottom of the sidebar.
* Supports two distinct visual configurations (Cyberpunk has been completely removed as requested):
  1. **Slate Dark** (Default): Cyberpunk-inspired deep dark interface.
  2. **Helix Light**: A clean, light medical dashboard with soft gray backgrounds and blue primary highlights.
* Custom theme choices are dynamically set on the `document.documentElement` class list and persisted in **`localStorage`** across page refreshes.

### 📈 Smooth Page Transitions
* Tab switching is wrapped in a dynamic `<div className="page-enter" key={activeTab}>` block.
* When navigating, pages fade in and slide up via CSS `@keyframes slideUpFade`, making the app feel fluid and modern.

### 🔔 Ambient Glow & Call Ringing Tone
* Added a loopable ringtone (`Audio` object) that sounds immediately on the recipient's computer or mobile phone during incoming calls.
* Silent-mode triggers auto-stop the audio when accepted, declined, or timed out.
* The incoming call ringing modal container pulses with a high-contrast **`ringing-ambient-glow`** animation to call user attention.

### 🖥️ WebRTC Screen Sharing & Mobile Play Constraints
* A **Share Screen** button (with screen-icon SVG) is rendered in the active teleconsultation overlay.
* Clicking the button prompts the browser's native window selector via `navigator.mediaDevices.getDisplayMedia`.
* We perform live track replacement (`RTCRtpSender.replaceTrack`) on the WebRTC connection without renegotiating, replacing the camera stream with the screen feed dynamically.
* **Mobile Autoplay Bypass**: We explicitly call `.play()` programmatically on both `localVideoRef` and `remoteVideoRef` elements when stream tracks arrive. This bypasses mobile Safari/Chrome strict autoplay blocks on non-muted streams, ensuring the video stream plays instantly when answered on mobile phones.

### 🎥 WebRTC Signaling Track Alignment (Offerer/Answerer Visibility)
* **The Calling Visibility Bug**: Previously, because React updates state variables asynchronously, `localStreamRef.current` was still `null` at the moment `createPeerConnection()` was invoked on the receiver's (doctor's) client. This caused the doctor's client to generate a WebRTC answer with **0 local audio/video tracks**, resulting in the doctor's feed being visible to the patient, but the patient's feed being completely invisible to the doctor.
* **The Fix**:
  1. I updated `createPeerConnection(customStream)` to accept an optional stream argument, instantly binding local tracks to the connection.
  2. In `initializeLocalVideoAndJoinCall`, we set `localStreamRef.current = stream` immediately when the promise resolves and pass the stream directly to `createPeerConnection`.
  3. Added a dynamic track-addition fallback under the `offer` signaling case block in `App.jsx` to dynamically attach local camera tracks if they weren't bound when the connection was initially configured. Both caller and receiver now have perfect mutual visibility!

### 💬 Premium Chat Room Overhaul & Keyboard Locking
* Overhauled the **Virtual Chat Room** layout to take up the full viewport height (`height: calc(100vh - 130px)`), floating as a clean modern panel.
* **The Keyboard/Input Squish Bug**: Previously, the `.page-enter` wrapper was set to `display: flex`, but because its default direction was row and it lacked a block-prop height resolver, the `<Chat />` window grew dynamically with message logs. This pushed the message input row off-screen where it was hidden by the wrapper's overflow setting.
* **The Fix**:
  1. I removed the `display: flex` override from `.page-enter` in `App.jsx`, allowing standard block height propagation from the parent `.content-body` height of `calc(100vh - 75px)` down to `<Chat />`.
  2. Applied `flex-shrink: 0` to both the `.chat-header` and the message input `<form>` inside `Chat.jsx` to prevent the browser flex engine from squeezing them to 0px under any conditions. The input row remains perfectly locked and visible at the bottom of the screen!
* Redesigned the sidebar session buttons with dedicated user avatars, bold names, and smooth active state transitions.
* Modernized the chat input text box (iOS / Discord style) with deep rounded corners (`border-radius: 24px`), soft backgrounds, and glowing border focus transitions.
* **Signaling Filter**: We filter out all messages starting with `__WEBRTC__:` when loading historical logs from the database, ensuring clean and professional text chat histories.

### 📎 Base64 Chat File Sharing & Buffer Limits Fix
* A clip attachment button (`fa-paperclip`) is mounted next to the chat text input field.
* Clicking it opens a file selector. Files are limited to **1MB** to prevent database bloating.
* Selected documents/images are converted to Base64 strings using a `FileReader` and broadcasted via Stomp WebSockets inside a structured token `[FILE:filename:mime]base64...`.
* The message parser renders files beautifully: images show up inline with instant previews, and non-image files (like PDFs) display inside high-contrast download card boxes.
* **WebSocket Size Limit Fix**: We overrode `configureWebSocketTransport` inside `WebSocketConfig.java` in the backend `gateway-service` to set `messageSizeLimit` and `sendBufferSizeLimit` to **5MB** (up from the Spring default of 64KB). This allows seamless transfer of large Base64 files without triggering session limit exceptions or socket terminations.

### 🛡️ SOAP Claims Verification & Card Payment checkout
* Overhauled the **SOAP Insurance** tab to dynamically load the logged-in patient's outstanding database invoices (`/api/billing/invoices/patient/{id}`) on mount.
* **ID Alignment**: We fixed a key mapping error by querying invoices using **`user.patientId`** instead of `user.id` (which was sending the `userId`). This guarantees that invoices populate correctly for patients so they can click to verify claims and proceed with checkout payments.
* Selecting an invoice automatically pre-fills the claim verification form with the exact billing amount.
* Submitting the verification query calculates coverage amounts, deductibles, copays, and the remaining out-of-pocket costs via the SOAP web service endpoint (`/ws`).
* Integrates a **Secure Credit Card checkout form** below the receipt. Entering card details (validating against system card failure simulation checks) and submitting triggers a real payment update POST request to `/api/billing/pay`. 
* On success, this updates the invoice's status in the MySQL database to `PAID` and displays a confirmation checkmark receipt in the UI.

---

## 2. New Features Integrated (Approved Sprints)

### 📝 AI SOAP Notes Scribe & Claims Generator
* **Doctor Scribe Panel**: When a Doctor opens an active consultation chat, a grid drawer splits the screen to expose a **SOAP Scribe Console**.
* **AI Note Generator**: Doctors click a button to scan chat keywords. The scribe compiles Subjective reports (symptom summaries), Objective observations, Assessment (pharyngitis, headaches, or gastroenteritis depending on keywords), and Plan recovery directives locally.
* **Claims Integrations**: Doctors enter a bill amount and click **"Submit Claim Invoice"**. This posts a new invoice to the MySQL database via the new **`POST /api/billing/invoice`** API endpoint! 
* Once posted, it broadcasts a system message inside the chat, alert-booking the invoice instantly for the patient to verify and pay.

### 💊 E-Prescription (e-Rx) PDF Generator
* **Electronic Rx Pad**: Doctors fill out medication details, dosage rules, instructions, and refills within the scribe drawer.
* **Secure Rx Token**: Sending the prescription transmits a secure stream token `[PRESCRIPTION:JsonString]`.
* **Robust Rx Parser**: The patient's client extracts prescription JSON by searching for the bounding `{` and `}` braces, automatically unescaping double quotes. This guarantees the prescription renders as a styled clinical card rather than raw JSON text under all network conditions.
* **Printable Rx Card**: Renders in the message feed as a styled Rx prescription sheet. Clicking **"Print Rx"** opens a print-ready canvas, triggering a standard system print prompt so patients can save it as a local PDF or print it instantly!

### 🗄️ Clinical Document Vault & Live Consultation Files
* **Document Vault screen**: Added a side-navigation menu tab: **"🗄️ Document Vault"**.
* **Patient Mode**: Patients upload scan reports, X-rays, and lab reports. File actions are sent to the REST backend and synchronized globally.
* **Doctor Mode**: Doctors select a patient from the consult directory to instantly browse and download their shared files.
* **🗂️ Patient Files Drawer Tab**: Added a third tab inside the doctor's consultation side-drawer in `Chat.jsx`. This tab queries the active patient's digital health vault files in real-time. Doctors can view, preview, and download patient reports immediately next to the chat logs during calls.
* **Global Sync REST Endpoints**: Implemented thread-safe concurrent in-memory document storage maps in the backend `patient-service` via `/api/patients/{id}/documents`. The vault now synchronizes files **instantly across different computers, browsers, profiles, and incognito sessions**, with automatic local database fallbacks!

### 🔔 Bell Notification Center
* **Header Bar**: Added a Top Navigation Bar containing a search bar and a bell icon with red unread counter badge.
* **Sliding Tray drawer**: Clicking the bell toggles a sliding notification dropdown list, showing recent logs (like payment processing notifications, claim creations, or missed calls) with read/unread dismiss options.

### 📅 Calendar Picker and Light Mode Upgrades
* **Calendar Visibility**: Appended `color-scheme: dark` to `:root` variables and `color-scheme: light` to the theme selector. This informs browser layout engines to render date dropdown popups and calendars in the correct readable theme.
* Added active CSS selectors for `input[type="date"]::-webkit-calendar-picker-indicator` to automatically colorize calendar indicator buttons.
* **Crisp Light Theme**: Re-styled light mode variables using high-contrast solid gray card backdrops (`#ffffff`), border lines (`#cbd5e1`), and legible typography (`#0f172a`), giving it the look of a premium modern telehealth dashboard.

### 🔍 Unified Dashboard Global Search & Doctor Directory Filter
* **Search Input Binding**: Wired up the static `.top-bar` input search box dynamically. Removed its `readOnly` restriction, binding it to a React state wrapper `searchQuery`.
* **Real-time Filters**:
  * **Appointments tab**: Filters the scheduled consultation sessions table dynamically by doctor name, patient name, specialization, or appointment ID.
  * **Doctor Directory**: Incorporates the global search term to dynamically query the database for doctors by name or specialization when booking a new appointment, letting users search for doctors globally!
  * **Chat tab**: Filters the active consultations sidebar links instantly.
  * **Document Vault tab**: Filters vault records and displays a customized "No matching files" layout helper if search yields zero results.

### 🔒 Appointment Conflicts Locking & JSON Parse Fixes
* **Booking Validation**: The backend `appointment-service` contains real-time validation checks checking database records for scheduling overlaps. If a patient tries to book a doctor at a time slot that is already booked, the backend throws an `AppointmentConflictException`.
* **Frontend Error Parser**: I updated `Appointments.jsx` to parse JSON error payloads properly. If the backend returns a `409 Conflict` response, the frontend extracts the specific `.message` property (e.g. *"Doctor already has an appointment booked for date..."*) and displays it in a clean alert modal, rather than displaying raw JSON strings.

### 👁️ Password Visibility Toggle (Show/Hide)
* **Auth Forms Upgrade**: Added a state wrapper `showPassword` inside `Auth.jsx`.
* **Eye Icon Button**: Integrated a glassmorphic-aligned absolute eye button (`fa-eye` / `fa-eye-slash`) inside the password fields of both the **Login** and **Registration** forms. Clicking it toggles the input field type between `password` and `text` instantly.
