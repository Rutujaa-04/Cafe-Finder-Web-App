const locationBtn = document.getElementById("location-btn");
const searchBtn = document.getElementById("search-btn");
const cityInput = document.getElementById("city-input");
const cardsContainer = document.getElementById("cards-container");
const loading = document.getElementById("loading");
const errorMessage = document.getElementById("error-message");
const emptyState = document.getElementById("empty-state");
const resultsStatus = document.getElementById("results-status");
const sortSelect = document.getElementById("sort-select");
const filterButtons = document.querySelectorAll(".filter-chip");
const viewButtons = document.querySelectorAll(".view-btn");
const quickCityButtons = document.querySelectorAll(".chip[data-city]");
const scrollButtons = document.querySelectorAll("[data-scroll-target]");

const FAVORITES_KEY = "cafe-finder-favorites";

// This will store YOUR real GPS location for accurate distance calculation
let userRealLat = null;
let userRealLon = null;

const appState = {
  cafes: [],
  searchLabel: "",
  sortBy: "distance",
  rangeKm: "all",
  view: "grid",
  favorites: new Set(loadFavorites())
};

// Silently grab user's real GPS location in background on page load
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    function (position) {
      userRealLat = position.coords.latitude;
      userRealLon = position.coords.longitude;
    },
    function () {
      // If user denies location, distances will calculate from searched city center
      userRealLat = null;
      userRealLon = null;
    }
  );
}

locationBtn.addEventListener("click", handleLocationSearch);
searchBtn.addEventListener("click", () => runCitySearch(cityInput.value.trim()));
cityInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    runCitySearch(cityInput.value.trim());
  }
});

sortSelect.addEventListener("change", (event) => {
  appState.sortBy = event.target.value;
  renderCafes();
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    appState.rangeKm = button.dataset.range;
    filterButtons.forEach((chip) => chip.classList.toggle("active", chip === button));
    renderCafes();
  });
});

viewButtons.forEach((button) => {
  button.addEventListener("click", () => {
    appState.view = button.dataset.view;
    viewButtons.forEach((item) => item.classList.toggle("active", item === button));
    renderCafes();
  });
});

quickCityButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const city = button.dataset.city;
    cityInput.value = city;
    runCitySearch(city);
  });
});

scrollButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const target = document.querySelector(button.dataset.scrollTarget);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
});

cardsContainer.addEventListener("click", (event) => {
  const favoriteButton = event.target.closest("[data-favorite-id]");
  if (!favoriteButton) {
    return;
  }

  const favoriteId = favoriteButton.dataset.favoriteId;
  if (appState.favorites.has(favoriteId)) {
    appState.favorites.delete(favoriteId);
  } else {
    appState.favorites.add(favoriteId);
  }

  persistFavorites();
  renderCafes();
});

function handleLocationSearch() {
  if (!navigator.geolocation) {
    showError("Your browser does not support location detection.");
    return;
  }

  showLoading("Finding cafes around your current location...");
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      appState.searchLabel = "Your live location";
      searchCafesByCoords(latitude, longitude, appState.searchLabel);
    },
    () => {
      showError("Could not get your location. Try a city search instead.");
    }
  );
}

function runCitySearch(city) {
  if (!city) {
    showError("Type a city name to start the search.");
    return;
  }

  showLoading(`Looking up ${city} and nearby cafes...`);
  getCityCoords(city);
}

function getCityCoords(city) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`;

  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      if (!data.length) {
        showError("That city was not found. Try another spelling or a larger nearby city.");
        return;
      }

      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);
      appState.searchLabel = city;
      searchCafesByCoords(lat, lon, city);
    })
    .catch(() => {
      showError("The city lookup failed. Check your internet connection and try again.");
    });
}

function searchCafesByCoords(lat, lon, label) {
  const delta = 0.05;
  const url = `https://nominatim.openstreetmap.org/search?q=cafe&format=json&limit=12&bounded=1&viewbox=${lon - delta},${lat + delta},${lon + delta},${lat - delta}`;

  setTimeout(function () {
  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      hideLoading();

      if (!data.length) {
        showError("No cafes showed up there. Try a larger search area or a different city.");
        return;
      }

      appState.cafes = data.map((cafe) => normalizeCafe(cafe, lat, lon));
      updateStatus(`${appState.cafes.length} cafes found around ${label}`);
      renderCafes();
      document.getElementById("results-section").scrollIntoView({ behavior: "smooth", block: "start" });
    })
    .catch(() => {
      showError("Cafe search failed. Please try again in a moment.");
    });
    }, 1000);
}

function normalizeCafe(cafe, originLat, originLon) {
  const lat = parseFloat(cafe.lat);
  const lon = parseFloat(cafe.lon);

  // Always use real GPS location for distance if available
  // Otherwise fall back to searched city center
  const fromLat = userRealLat !== null ? userRealLat : originLat;
  const fromLon = userRealLon !== null ? userRealLon : originLon;

  const distanceKm = getDistanceKm(fromLat, fromLon, lat, lon);
  const name = cafe.display_name.split(",")[0];

  return {
    id: `${name}-${lat}-${lon}`,
    name,
    address: cafe.display_name,
    lat,
    lon,
    distanceKm,
    vibe: getVibeLabel(distanceKm),
    saved: appState.favorites.has(`${name}-${lat}-${lon}`)
  };
}

function renderCafes() {
  hideMessage();

  if (!appState.cafes.length) {
    cardsContainer.innerHTML = "";
    emptyState.classList.remove("hidden");
    return;
  }

  const filteredCafes = getVisibleCafes();
  cardsContainer.className = appState.view === "list" ? "cards-list" : "cards-grid";

  if (!filteredCafes.length) {
    cardsContainer.innerHTML = "";
    emptyState.textContent = "No cafes match the current distance filter. Try widening the range.";
    emptyState.classList.remove("hidden");
    updateStatus(`No cafes inside ${appState.rangeKm} km for ${appState.searchLabel}`);
    return;
  }

  emptyState.classList.add("hidden");
  updateStatus(`${filteredCafes.length} cafes ready to explore in ${appState.searchLabel}`);

  cardsContainer.innerHTML = filteredCafes.map((cafe) => createCafeCard(cafe)).join("");
}

function getVisibleCafes() {
  const cafes = appState.cafes
    .map((cafe) => ({
      ...cafe,
      saved: appState.favorites.has(cafe.id)
    }))
    .filter((cafe) => {
      if (appState.rangeKm === "all") {
        return true;
      }

      return cafe.distanceKm <= Number(appState.rangeKm);
    });

  return cafes.sort((left, right) => {
    if (appState.sortBy === "name") {
      return left.name.localeCompare(right.name);
    }

    if (appState.sortBy === "favorites") {
      return Number(right.saved) - Number(left.saved) || left.distanceKm - right.distanceKm;
    }

    return left.distanceKm - right.distanceKm;
  });
}

function createCafeCard(cafe) {
  const distanceText = cafe.distanceKm < 1
    ? `${Math.round(cafe.distanceKm * 1000)} m away`
    : `${cafe.distanceKm.toFixed(1)} km away`;

  const mapLink = `https://www.openstreetmap.org/?mlat=${cafe.lat}&mlon=${cafe.lon}#map=17/${cafe.lat}/${cafe.lon}`;
  const directionsLink = `https://www.google.com/maps/search/?api=1&query=${cafe.lat},${cafe.lon}`;
  const saveLabel = cafe.saved ? "Saved" : "Save";

  return `
    <article class="card">
      <div class="card-topline">
        <span class="card-tag">Cafe pick</span>
        <span class="favorite-pill">${cafe.vibe}</span>
      </div>
      <h3>${escapeHtml(cafe.name)}</h3>
      <p class="card-address">${escapeHtml(cafe.address)}</p>
      <div class="card-meta">
        <span class="distance-pill">${distanceText}</span>
        <span class="distance-pill">${getDistanceBand(cafe.distanceKm)}</span>
      </div>
      <div class="card-footer">
        <div class="card-actions">
          <a class="action-btn" href="${mapLink}" target="_blank" rel="noopener noreferrer">Open Map</a>
          <a class="action-btn" href="${directionsLink}" target="_blank" rel="noopener noreferrer">Directions</a>
        </div>
        <button class="icon-btn ${cafe.saved ? "saved" : ""}" data-favorite-id="${cafe.id}" aria-label="${saveLabel} ${escapeHtml(cafe.name)}">
          ${cafe.saved ? "♥" : "+"}
        </button>
      </div>
    </article>
  `;
}

function showLoading(message) {
  appState.cafes = [];
  cardsContainer.innerHTML = "";
  emptyState.innerHTML = "<p>Search a city or use your location to generate an interactive cafe board.</p>";
  emptyState.classList.add("hidden");
  hideMessage();
  loading.querySelector("p").textContent = message;
  loading.classList.remove("hidden");
  updateStatus("Searching live map data...");
}

function hideLoading() {
  loading.classList.add("hidden");
}

function showError(message) {
  hideLoading();
  cardsContainer.innerHTML = "";
  if (!appState.cafes.length) {
    emptyState.classList.add("hidden");
  }
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
  const radius = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return radius * c;
}

function getVibeLabel(distanceKm) {
  if (distanceKm < 0.8) {
    return "Walk now";
  }

  if (distanceKm < 2) {
    return "Quick detour";
  }

  return "Worth the trip";
}

function getDistanceBand(distanceKm) {
  if (distanceKm < 1) {
    return "Ultra nearby";
  }

  if (distanceKm < 3) {
    return "Easy reach";
  }

  return "City range";
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
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(appState.favorites)));
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
