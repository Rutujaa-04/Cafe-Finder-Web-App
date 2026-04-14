# Cafe-Finder-Web-App
# ☕ Cafe Finder

A location-aware cafe discovery app that surfaces nearby cafes based on where you are and what kind of coffee moment you're having — a quick morning grab, a focused work break, or a late-night hangout.

Live demo → https://rutujaa-04.github.io/Cafe-Finder-Web-App/

---

## What it does

Cafe Finder uses your live GPS location as the primary discovery method. Open the app, tap **Find Cafes Near Me**, and it instantly pulls up to 50 real map-listed cafes around you — including hidden local spots that don't show up on Zomato or Swiggy.

City search is available as a secondary flow for scouting cafes in another neighborhood or planning an intercity cafe hunt.

---

## Features

- **GPS-first discovery** — detects your live location and finds cafes within a 3 km radius instantly
- **City search** — manually search any city to get up to 50 cafes within a 10 km radius
- **Coffee Mode system** — three modes that auto-select based on time of day and shape the entire experience
  - ☀️ Morning Run Mode — fast, close-by, grab-and-go picks (auto from 6am–11am)
  - 💻 Work Break Mode — chill, stay-awhile cafes for focused afternoons (auto from 11am–6pm)
  - 🌙 Late Night Mode — atmospheric, hangout-worthy spots for evenings (auto from 6pm onward)
- **Smart mode scoring** — cafes are ranked using a scoring algorithm that weighs distance and keyword matches against the active coffee mode
- **Distance filtering** — filter by walkable (1 km), quick hop (3 km), or coffee mission (5 km)
- **Sort options** — sort by best for this mode, closest first, name A–Z, or saved cafes first
- **Grid and list views** — switch between a card grid and a list layout
- **Save to your coffee map** — bookmark cafes locally using localStorage so your saves persist across sessions
- **Directions** — one tap opens Google Maps directions to any cafe
- **Reviews** — one tap opens Google Maps reviews for the exact cafe
- **Open Map** — opens the cafe pin on OpenStreetMap
- **Quick city chips** — one-tap shortcuts to popular Indian and global cities
- **Real-time distance calculation** — all distances are always calculated from your actual GPS position, even when searching another city
- **Dynamic UI theming** — the background, card colors, and UI accents shift based on the active coffee mode

---

## Tech stack

- **HTML5** — semantic structure and accessibility attributes
- **CSS3** — custom properties, CSS Grid, Flexbox, animations, responsive design, backdrop filters
- **Vanilla JavaScript** — DOM manipulation, event handling, Fetch API, localStorage, Geolocation API
- **Nominatim API** (OpenStreetMap) — free, open geocoding and place search with no API key required
- **Google Maps** — directions and reviews via deep links
- **OpenStreetMap** — map view via deep links
- **Google Fonts** — Manrope and Space Grotesk typefaces

---

## How it works

1. On page load the app silently requests your GPS coordinates in the background
2. The Coffee Mode is auto-selected based on the current time of day
3. When you tap **Find Cafes Near Me** your coordinates are sent to the Nominatim API
4. The API returns up to 50 cafe results within a bounding box around your location
5. Each cafe is normalized and scored using the mode scoring algorithm
6. Results are rendered as interactive cards with links to directions, reviews, and the map
7. Saves are stored in localStorage and persist between sessions

---

## Project structure
cafe-finder/
├── index.html       # App structure and layout
├── styles.css       # All styling, theming, animations, and responsive design
├── script.js        # App logic, API calls, scoring, state management
└── README.md        

## Future improvements

- Native mobile app version
- User-submitted reviews and ratings
- Filter by cuisine type or price range
- Offline mode with cached results
- Map view with pinned cafe markers
