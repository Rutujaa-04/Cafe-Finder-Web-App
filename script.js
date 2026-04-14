const locationBtn = document.getElementById("location-btn");
const searchBtn = document.getElementById("search-btn");
const cityInput = document.getElementById("city-input");
const cardsContainer = document.getElementById("cards-container");
const loading = document.getElementById("loading");
const errorMessage = document.getElementById("error-message");
const emptyState = document.getElementById("empty-state");
const emptyStateMessage = document.getElementById("empty-state-message");
const resultsStatus = document.getElementById("results-status");
const resultsTitle = document.getElementById("results-title");
const resultsNote = document.getElementById("results-note");
const sortSelect = document.getElementById("sort-select");
const filterButtons = document.querySelectorAll(".filter-chip");
const viewButtons = document.querySelectorAll(".view-btn");
const quickCityButtons = document.querySelectorAll(".chip[data-city]");
const scrollButtons = document.querySelectorAll("[data-scroll-target]");
const modeButtons = document.querySelectorAll(".mode-btn");
const spotlightTitle = document.getElementById("spotlight-title");
const spotlightText = document.getElementById("spotlight-text");
const spotlightBadge = document.getElementById("spotlight-badge");
const modeSummary = document.getElementById("mode-summary");
const modeDescription = document.getElementById("mode-description");
const savedMapCount = document.getElementById("saved-map-count");
const savedMapText = document.getElementById("saved-map-text");

const FAVORITES_KEY = "cafe-finder-favorites";
const defaultMode = getDefaultMode();

const COFFEE_MODES = {
  morning: {
    label: "Morning Run Mode",
    buttonLabel: "☀️ Morning Run Mode",
    summary:
      "Morning mode keeps the list quick, close, and easy to grab before the day gets busy.",
    description:
      "Fast, close-by cafes rise to the top when you need a quick grab-and-go stop.",
    resultsTitle: "Quick grab cafe board",
    resultsNote:
      "Morning mode favors walkable, low-friction picks so the list feels useful during a coffee run.",
    defaultRange: "1",
    locationLoading:
      "Morning Run Mode is scouting quick-grab cafes near your location...",
    cityLoading: function (city) {
      return "Scanning " + city + " for quick-grab cafes...";
    },
    emptyState:
      'No cafes yet. Let\'s fix that. Tap "Find Cafes Near Me" ☕',
    noMatches:
      "No quick-grab cafes match this filter right now. Try widening the range or switching modes.",
    cardNote:
      "Fast stop first. Open Maps for live reviews, directions, and the quickest route.",
    keywords: [
      "espresso",
      "express",
      "bakery",
      "breakfast",
      "brew",
      "deli",
      "station",
      "market"
    ]
  },
  work: {
    label: "Work Break Mode",
    buttonLabel: "💻 Work Break Mode",
    summary:
      "Afternoon mode leans into cafes that feel good for a reset, a laptop session, or a longer pause.",
    description:
      "Balanced distance and stay-a-while energy help surface chill cafes for work breaks and focused afternoons.",
    resultsTitle: "Chill and work cafe board",
    resultsNote:
      "Work Break Mode looks a little farther out and ranks cafes that feel better for settling in.",
    defaultRange: "3",
    locationLoading:
      "Work Break Mode is lining up chill cafes for your next reset...",
    cityLoading: function (city) {
      return "Looking through " + city + " for chill and work-friendly cafe picks...";
    },
    emptyState:
      'No cafes yet. Let\'s fix that. Tap "Find Cafes Near Me" ☕',
    noMatches:
      "No chill or work-break cafes match this filter. Try a wider range or switch to another coffee mode.",
    cardNote:
      "A slower pace comes first here. Open Maps for reviews, directions, and a better look before you head out.",
    keywords: [
      "roastery",
      "study",
      "hub",
      "library",
      "plaza",
      "central",
      "hotel",
      "workspace"
    ]
  },
  night: {
    label: "Late Night Mode",
    buttonLabel: "🌙 Late Night Mode",
    summary:
      "Evening mode shifts toward cafes that feel worth the detour when you want atmosphere, company, or a longer hang.",
    description:
      "Aesthetic, cozy, and hangout energy gets a little more room to breathe in the evening.",
    resultsTitle: "Aesthetic hangout cafe board",
    resultsNote:
      "Late Night Mode stretches the radius and boosts cafes that feel more like a destination than a quick stop.",
    defaultRange: "5",
    locationLoading:
      "Late Night Mode is hunting for atmospheric cafe stops around you...",
    cityLoading: function (city) {
      return "Scanning " + city + " for aesthetic and hangout-worthy cafes...";
    },
    emptyState:
      'No cafes yet. Let\'s fix that. Tap "Find Cafes Near Me" ☕',
    noMatches:
      "No aesthetic or hangout cafes match this filter. Try a wider range or bounce to another mode.",
    cardNote:
      "Hangout energy comes first here. Open Maps for live reviews, directions, and the full vibe check.",
    keywords: [
      "house",
      "lounge",
      "garden",
      "terrace",
      "bistro",
      "dessert",
      "social",
      "square",
      "hotel"
    ]
  }
};

// Always store user's real GPS location
let userRealLat = null;
let userRealLon = null;

const appState = {
  cafes: [],
  searchLabel: "",
  sortBy: "smart",
  rangeKm: COFFEE_MODES[defaultMode].defaultRange,
  view: "grid",
  mode: defaultMode,
  modeSource: "auto",
  favorites: new Set(loadFavorites())
};

// Silently grab GPS on page load immediately
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    function (position) {
      userRealLat = position.coords.latitude;
      userRealLon = position.coords.longitude;
    },
    function () {
      userRealLat = null;
      userRealLon = null;
    }
  );
}

// Event listeners
locationBtn.addEventListener("click", handleLocationSearch);

searchBtn.addEventListener("click", function () {
  runCitySearch(cityInput.value.trim());
});

cityInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    runCitySearch(cityInput.value.trim());
  }
});

sortSelect.addEventListener("change", function (event) {
  appState.sortBy = event.target.value;
  renderCafes();
});

filterButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    appState.rangeKm = button.dataset.range;
    syncFilterButtons();
    renderCafes();
  });
});

viewButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    appState.view = button.dataset.view;
    viewButtons.forEach(function (item) {
      item.classList.toggle("active", item === button);
    });
    renderCafes();
  });
});

quickCityButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    const city = button.dataset.city;
    cityInput.value = city;
    runCitySearch(city);
  });
});

scrollButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    const target = document.querySelector(button.dataset.scrollTarget);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
});

modeButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    setCoffeeMode(button.dataset.mode, "manual");
  });
});

cardsContainer.addEventListener("click", function (event) {
  const favoriteButton = event.target.closest("[data-favorite-id]");
  if (!favoriteButton) return;

  const favoriteId = favoriteButton.dataset.favoriteId;
  if (appState.favorites.has(favoriteId)) {
    appState.favorites.delete(favoriteId);
  } else {
    appState.favorites.add(favoriteId);
  }

  persistFavorites();
  updateSavedMap();
  renderCafes();
});

initializeApp();

// PRIMARY: Location based search
function handleLocationSearch() {
  if (!navigator.geolocation) {
    showError("Your browser does not support location detection.");
    return;
  }

  showLoading(getCurrentMode().locationLoading);

  navigator.geolocation.getCurrentPosition(
    function (position) {
      userRealLat = position.coords.latitude;
      userRealLon = position.coords.longitude;
      appState.searchLabel = "your live location";
      fetchCafesByCoords(userRealLat, userRealLon, 3000, 50);
    },
    function () {
      showError("Could not get your location. Try a city search instead.");
    }
  );
}

// SECONDARY: City based search
function runCitySearch(city) {
  if (!city) {
    showError("Type a city name to start the search.");
    return;
  }

  showLoading(getCurrentMode().cityLoading(city));
  getCityCoords(city);
}

function getCityCoords(city) {
  const url =
    "https://nominatim.openstreetmap.org/search?q=" +
    encodeURIComponent(city) +
    "&format=json&limit=1";

  fetch(url)
    .then(function (response) {
      return response.json();
    })
    .then(function (data) {
      if (!data.length) {
        showError("That city was not found. Try another spelling.");
        return;
      }
      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);
      appState.searchLabel = city;
      // Reset filter to "all" for city searches so distance from user doesn't hide results
      appState.rangeKm = "all";
      syncFilterButtons();
      fetchCafesByCoords(lat, lon, 10000, 50);
    })
    .catch(function () {
      showError("City lookup failed. Please try again.");
    });
}

function fetchCafesByCoords(lat, lon, radiusMeters, limit) {
  const delta = radiusMeters / 111320;
  const url =
    "https://nominatim.openstreetmap.org/search?q=cafe&format=json&limit=" +
    limit +
    "&bounded=1&viewbox=" +
    (lon - delta) +
    "," +
    (lat + delta) +
    "," +
    (lon + delta) +
    "," +
    (lat - delta);

  fetch(url)
    .then(function (response) {
      return response.json();
    })
    .then(function (data) {
      hideLoading();

      if (!data.length) {
        showError("No cafes found in this area. Try expanding your search.");
        return;
      }

      appState.cafes = data.map(function (cafe) {
        return normalizeCafe(cafe, lat, lon);
      });

      renderCafes();

      document.getElementById("results-section").scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    })
    .catch(function () {
      showError("Cafe search failed. Please try again.");
    });
}

function normalizeCafe(cafe, originLat, originLon) {
  const lat = parseFloat(cafe.lat);
  const lon = parseFloat(cafe.lon);
  const fromLat = userRealLat !== null ? userRealLat : originLat;
  const fromLon = userRealLon !== null ? userRealLon : originLon;
  const distanceKm = getDistanceKm(fromLat, fromLon, lat, lon);
  const address = String(cafe.display_name || "Address unavailable");
  const name = address.split(",")[0].trim() || "Cafe";
  const id = name + "-" + lat + "-" + lon;

  return {
    id: id,
    name: name,
    address: address,
    lat: lat,
    lon: lon,
    distanceKm: distanceKm,
    vibe: getVibeLabel(distanceKm),
    saved: appState.favorites.has(id)
  };
}

function renderCafes() {
  hideMessage();
  updateSavedMap();

  if (!appState.cafes.length) {
    cardsContainer.innerHTML = "";
    cardsContainer.className = appState.view === "list" ? "cards-list" : "cards-grid";
    emptyStateMessage.textContent = getCurrentMode().emptyState;
    emptyState.classList.remove("hidden");
    updateStatus(buildIdleStatus());
    return;
  }

  const filteredCafes = getVisibleCafes();
  cardsContainer.className = appState.view === "list" ? "cards-list" : "cards-grid";

  if (!filteredCafes.length) {
    cardsContainer.innerHTML = "";
    emptyStateMessage.textContent = getCurrentMode().noMatches;
    emptyState.classList.remove("hidden");
    updateStatus(getCurrentMode().label + " wants a wider range");
    return;
  }

  emptyState.classList.add("hidden");
  updateStatus(buildResultsStatus(filteredCafes.length));
  cardsContainer.innerHTML = filteredCafes
    .map(function (cafe) {
      return createCafeCard(cafe);
    })
    .join("");
}

function getVisibleCafes() {
  const cafes = appState.cafes
    .map(function (cafe) {
      return enhanceCafeForMode(cafe);
    })
    .filter(function (cafe) {
      if (appState.rangeKm === "all") return true;
      return cafe.distanceKm <= Number(appState.rangeKm);
    });

  return cafes.sort(function (a, b) {
    if (appState.sortBy === "name") {
      return (
        a.name.localeCompare(b.name) ||
        b.modeScore - a.modeScore ||
        a.distanceKm - b.distanceKm
      );
    }

    if (appState.sortBy === "favorites") {
      return (
        Number(b.saved) - Number(a.saved) ||
        b.modeScore - a.modeScore ||
        a.distanceKm - b.distanceKm
      );
    }

    if (appState.sortBy === "distance") {
      return (
        a.distanceKm - b.distanceKm ||
        b.modeScore - a.modeScore ||
        a.name.localeCompare(b.name)
      );
    }

    return (
      b.modeScore - a.modeScore ||
      a.distanceKm - b.distanceKm ||
      a.name.localeCompare(b.name)
    );
  });
}

function createCafeCard(cafe) {
  const distanceText =
    cafe.distanceKm < 1
      ? Math.round(cafe.distanceKm * 1000) + " m away"
      : cafe.distanceKm.toFixed(1) + " km away";

  const mapLink =
    "https://www.openstreetmap.org/?mlat=" +
    cafe.lat +
    "&mlon=" +
    cafe.lon +
    "#map=17/" +
    cafe.lat +
    "/" +
    cafe.lon;
  const directionsLink =
    "https://www.google.com/maps/search/?api=1&query=" + cafe.lat + "," + cafe.lon;
  const reviewsLink =
    "https://www.google.com/maps/search/" +
    encodeURIComponent(cafe.name) +
    "/@" +
    cafe.lat +
    "," +
    cafe.lon +
    ",17z";
  const saveLabel = cafe.saved ? "Saved to your map" : "Save to your map";
  const saveAriaLabel = cafe.saved
    ? "Remove " + cafe.name + " from your coffee map"
    : "Add " + cafe.name + " to your coffee map";

  return `
    <article class="card">
      <div class="card-main">
        <div class="card-topline">
          <span class="card-tag">${escapeHtml(cafe.vibe)}</span>
          <span class="favorite-pill">${escapeHtml(cafe.modeFit)}</span>
        </div>
        <h3>${escapeHtml(cafe.name)}</h3>
        <p class="card-address">${escapeHtml(cafe.address)}</p>
        <div class="card-meta">
          <span class="distance-pill">${distanceText}</span>
          <span class="distance-pill">${getDistanceBand(cafe.distanceKm)}</span>
        </div>
      </div>
      <div class="card-side">
        <p class="card-note">${escapeHtml(cafe.cardNote)}</p>
        <div class="card-actions">
          <a class="action-btn action-btn-primary" href="${directionsLink}" target="_blank" rel="noopener noreferrer">Directions</a>
          <a class="action-btn" href="${reviewsLink}" target="_blank" rel="noopener noreferrer">Reviews</a>
          <a class="action-btn action-btn-wide" href="${mapLink}" target="_blank" rel="noopener noreferrer">Open Map</a>
        </div>
        <button type="button" class="save-btn ${cafe.saved ? "saved" : ""}" data-favorite-id="${cafe.id}" aria-pressed="${cafe.saved ? "true" : "false"}" aria-label="${escapeHtml(saveAriaLabel)}">
          <span class="save-btn-mark">${cafe.saved ? "Mapped" : "+"}</span>
          <span>${escapeHtml(saveLabel)}</span>
        </button>
      </div>
    </article>
  `;
}

function showLoading(message) {
  appState.cafes = [];
  cardsContainer.innerHTML = "";
  emptyStateMessage.textContent = getCurrentMode().emptyState;
  emptyState.classList.add("hidden");
  hideMessage();
  loading.querySelector("p").textContent = message;
  loading.classList.remove("hidden");
  updateStatus(getCurrentMode().label + " is scanning");
}

function hideLoading() {
  loading.classList.add("hidden");
}

function showError(message) {
  hideLoading();
  cardsContainer.innerHTML = "";
  emptyState.classList.add("hidden");
  errorMessage.textContent = message;
  errorMessage.classList.remove("hidden");
  updateStatus("Search needs attention");
}

function hideMessage() {
  errorMessage.classList.add("hidden");
}

function updateStatus(message) {
  resultsStatus.textContent = message;
}

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getVibeLabel(distanceKm) {
  if (distanceKm < 0.8) return "Walk now";
  if (distanceKm < 2) return "Quick detour";
  if (distanceKm < 10) return "Worth the trip";
  return "Intercity";
}

function getDistanceBand(distanceKm) {
  if (distanceKm < 1) return "Ultra nearby";
  if (distanceKm < 3) return "Easy reach";
  if (distanceKm < 10) return "City range";
  return "Far away";
}

function buildResultsStatus(count) {
  const prefix = getCurrentMode().label + ": ";

  if (!appState.searchLabel) {
    return prefix + count + " cafes ready";
  }

  if (
    userRealLat !== null &&
    userRealLon !== null &&
    appState.searchLabel !== "your live location"
  ) {
    return (
      prefix +
      count +
      " cafes around " +
      appState.searchLabel +
      " with distance from your live location"
    );
  }

  return prefix + count + " cafes around " + appState.searchLabel;
}

function buildIdleStatus() {
  return getCurrentMode().label + " ready";
}

function loadFavorites() {
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function persistFavorites() {
  localStorage.setItem(
    FAVORITES_KEY,
    JSON.stringify(Array.from(appState.favorites))
  );
}

function enhanceCafeForMode(cafe) {
  const text = (cafe.name + " " + cafe.address).toLowerCase();
  const keywordHits = getKeywordHits(text, getCurrentMode().keywords);
  const score = getModeScore(appState.mode, cafe.distanceKm, keywordHits);

  return Object.assign({}, cafe, {
    saved: appState.favorites.has(cafe.id),
    modeScore: score,
    modeFit: getModeFitLabel(appState.mode, score, cafe.distanceKm, keywordHits),
    cardNote: getCurrentMode().cardNote
  });
}

function getKeywordHits(text, keywords) {
  return keywords.reduce(function (count, keyword) {
    return count + Number(text.includes(keyword));
  }, 0);
}

function getModeScore(modeKey, distanceKm, keywordHits) {
  const distanceScore = getDistanceScore(modeKey, distanceKm);
  return distanceScore + keywordHits * 2;
}

function getDistanceScore(modeKey, distanceKm) {
  if (modeKey === "morning") {
    if (distanceKm <= 0.8) return 8;
    if (distanceKm <= 1.5) return 6;
    if (distanceKm <= 3) return 3;
    if (distanceKm <= 5) return 1;
    return -2;
  }

  if (modeKey === "work") {
    if (distanceKm <= 1) return 3;
    if (distanceKm <= 3) return 8;
    if (distanceKm <= 5) return 5;
    if (distanceKm <= 8) return 2;
    return 0;
  }

  if (distanceKm <= 1.2) return 2;
  if (distanceKm <= 3) return 5;
  if (distanceKm <= 6) return 8;
  if (distanceKm <= 10) return 4;
  return 1;
}

function getModeFitLabel(modeKey, score, distanceKm, keywordHits) {
  if (modeKey === "morning") {
    if (score >= 10 || distanceKm <= 1) return "Quick grab fit";
    if (keywordHits > 0) return "Breakfast detour";
    return "Morning route";
  }

  if (modeKey === "work") {
    if (score >= 10) return "Work break fit";
    if (keywordHits > 0) return "Stay-awhile pick";
    return "Reset stop";
  }

  if (score >= 10) return "Hangout fit";
  if (keywordHits > 0) return "Aesthetic detour";
  return "Evening pick";
}

function getDefaultMode() {
  const currentHour = new Date().getHours();

  if (currentHour >= 6 && currentHour < 11) {
    return "morning";
  }

  if (currentHour >= 11 && currentHour < 18) {
    return "work";
  }

  return "night";
}

function getCurrentMode() {
  return COFFEE_MODES[appState.mode];
}

function setCoffeeMode(modeKey, source) {
  if (!COFFEE_MODES[modeKey]) return;

  appState.mode = modeKey;
  appState.modeSource = source || "manual";
  appState.rangeKm = COFFEE_MODES[modeKey].defaultRange;

  if (sortSelect.value === "distance" || sortSelect.value === "name" || sortSelect.value === "favorites") {
    // Keep the user's sort choice when they have changed it.
  } else {
    appState.sortBy = "smart";
    sortSelect.value = "smart";
  }

  applyModeUi();
  syncModeButtons();
  syncFilterButtons();
  renderCafes();
}

function applyModeUi() {
  const currentMode = getCurrentMode();

  document.body.dataset.mode = appState.mode;
  spotlightTitle.textContent = currentMode.label;
  spotlightText.textContent = currentMode.description;
  spotlightBadge.textContent =
    appState.modeSource === "auto" ? "Auto right now" : "Picked by you";
  modeSummary.textContent =
    appState.modeSource === "auto"
      ? "Auto-picked from the time of day."
      : "Manual mode is now shaping the list.";
  modeDescription.textContent = currentMode.summary;
  resultsTitle.textContent = currentMode.resultsTitle;
  resultsNote.textContent = currentMode.resultsNote;
  emptyStateMessage.textContent = currentMode.emptyState;
  updateStatus(buildIdleStatus());
}

function syncModeButtons() {
  modeButtons.forEach(function (button) {
    const isActive = button.dataset.mode === appState.mode;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function syncFilterButtons() {
  filterButtons.forEach(function (chip) {
    chip.classList.toggle("active", chip.dataset.range === appState.rangeKm);
  });
}

function updateSavedMap() {
  const count = appState.favorites.size;
  savedMapCount.textContent = String(count);

  if (!count) {
    savedMapText.textContent =
      "No saved cafes yet. Start building your personal coffee map.";
    return;
  }

  if (count === 1) {
    savedMapText.textContent =
      "1 cafe saved. Your personal coffee map has officially started.";
    return;
  }

  savedMapText.textContent =
    count +
    " cafes saved. Your personal coffee map is growing nicely.";
}

function initializeApp() {
  sortSelect.value = appState.sortBy;
  syncFilterButtons();
  syncModeButtons();
  updateSavedMap();
  applyModeUi();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
