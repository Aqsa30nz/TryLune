# VirtueNova — Product Requirements Document

## Original Problem Statement
VirtueNova: SIH interactive prototype — a high-fidelity AI shopping web app combining Virtual Try-On (fashion) and Room/Furniture Visualization (home). Every flow works end-to-end; heavy AI outputs are served as pre-generated *representative* results (never claimed as live inference). Flow: DISCOVER → VISUALIZE → ASSESS → COMPARE → DECIDE.

## User Choices
- Auth: Simple JWT login
- Photo input: Upload + live camera capture
- Catalog: 8–10 hero products
- Images: Mix (AI-generated + representative)
- Theme: agent's discretion → High-End Editorial + Swiss Tech (light)

## Architecture
- Frontend: React (CRA) + Tailwind, framer-motion, sonner, shadcn/ui. Editorial light theme (Playfair Display / Manrope / JetBrains Mono, #F9F9F6 / #121212 / #0033FF, sharp corners).
- Backend: FastAPI, all routes under `/api`. JWT (bcrypt + PyJWT), Bearer token in localStorage.
- DB: MongoDB — single source of truth for catalog (p1–p10), cart, wishlist, users.
- Assets: 18 AI-generated images (10 product shots, 4 try-on composites, 4 room composites) hosted on cloud storage; mapped by product_id.

## User Personas
Online shoppers, first-time/uncertain buyers, fashion shoppers, home & décor shoppers.

## Core Requirements (static)
Discover feed w/ AI Match Score, Product Details, Virtual Try-On + validation, Room Visualization + validation, Assess panel, Compare, Wishlist + Cart (no payment), Input Validation UX with Retake/Upload Another.

## Implemented (2026-06)
- JWT auth (register/login/me/logout) + seeded admin. Protected routes.
- Discover: 10 products, AI Match ranking, search, category filter, sort. Bento hero layout.
- Product Details: sticky image, colors/sizes/specs, add-to-cart, wishlist, Assess side-panel (GET /api/assess).
- Virtual Try-On: garment select, upload/camera, validation stub (with controlled demo-fail), ~3s scanning processing overlay, representative result + "AI-generated representative visualization" microcopy.
- Room Visualization: same flow for furniture/décor with room-specific validation checks + composite.
- Compare: 3-slot side-by-side table (price, rating, AI score, specs).
- Cart: qty CRUD, totals, prototype checkout. Wishlist grid.
- Representative-output strategy: `/api/visualize/generate` maps (mode + product_id) → pre-rendered image behind honest 2–4s processing state.
- Tested: 25/25 backend pytest pass; all critical frontend E2E flows pass.

## Backlog (P1/P2)
- P1: Persist "user photo" for a real MediaPipe validation stub; multiple product images/gallery.
- P1: Wire real IDM-VTON via the same generate endpoint (async job queue + GPU worker).
- P2: Split server.py into routers; order history; product reviews; refresh-token rotation.

## Next Tasks
- Rehearse demo happy path + one failure (bad photo → validation blocks).
- Optional: enable more hero garments/rooms.
