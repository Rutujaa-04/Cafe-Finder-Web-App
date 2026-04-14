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

// Always store user's real GPS location
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
    filterButtons.forEach(function (chip) {
      chip.classList.toggle("active", chip === button);
    });
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
  renderCafes();
});

// PRIMARY: Location based search
function handleLocationSearch() {
  if (!navigator.geolocation) {
    showError("Your browser does not support location detection.");
    return;
  }

  showLoading("Finding cafes around your current location...");

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
  showLoading("Looking up " + city + " and pulling more map-listed cafes...");
  getCityCoords(city);
}

function getCityCoords(city) {
  const url = "https://nominatim.openstreetmap.org/search?q=" + encodeURIComponent(city) + "&format=json&limit=1";

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
      fetchCafesByCoords(lat, lon, 10000, 50);
    })
    .catch(function () {
      showError("City lookup failed. Please try again.");
    });
}

function fetchCafesByCoords(lat, lon, radiusMeters, limit) {
  const delta = (radiusMeters / 111320);
  const url = "https://nominatim.openstreetmap.org/search?q=cafe&format=json&limit=" + limit + "&bounded=1&viewbox=" + (lon - delta) + "," + (lat + delta) + "," + (lon + delta) + "," + (lat - delta);

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

  if (!appState.cafes.length) {
    cardsContainer.innerHTML = "";
    emptyState.classList.remove("hidden");
    return;
  }

  const filteredCafes = getVisibleCafes();
  cardsContainer.className = appState.view === "list" ? "cards-list" : "cards-grid";

  if (!filteredCafes.length) {
    cardsContainer.innerHTML = "";
    emptyState.textContent = "No cafes match this distance filter. Try widening the range.";
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  updateStatus(buildResultsStatus(filteredCafes.length));
  cardsContainer.innerHTML = filteredCafes.map(function (cafe) {
    return createCafeCard(cafe);
  }).join("");
}

function getVisibleCafes() {
  const cafes = appState.cafes
    .map(function (cafe) {
      return Object.assign({}, cafe, { saved: appState.favorites.has(cafe.id) });
    })
    .filter(function (cafe) {
      if (appState.rangeKm === "all") return true;
      return cafe.distanceKm <= Number(appState.rangeKm);
    });

  return cafes.sort(function (a, b) {
    if (appState.sortBy === "name") return a.name.localeCompare(b.name);
    if (appState.sortBy === "favorites") return Number(b.saved) - Number(a.saved) || a.distanceKm - b.distanceKm;
    return a.distanceKm - b.distanceKm;
  });
}

function createCafeCard(cafe) {
  const distanceText = cafe.distanceKm < 1
    ? Math.round(cafe.distanceKm * 1000) + " m away"
    : cafe.distanceKm.toFixed(1) + " km away";

  const mapLink = "https://www.openstreetmap.org/?mlat=" + cafe.lat + "&mlon=" + cafe.lon + "#map=17/" + cafe.lat + "/" + cafe.lon;
  const directionsLink = "https://www.google.com/maps/search/?api=1&query=" + cafe.lat + "," + cafe.lon;
  const reviewsLink = "https://www.google.com/maps/search/" + encodeURIComponent(cafe.name) + "/@" + cafe.lat + "," + cafe.lon + ",17z";
  const saveLabel = cafe.saved ? "Saved to favorites" : "Add to favorites";
  const saveAriaLabel = cafe.saved
    ? "Remove " + cafe.name + " from favorites"
    : "Add " + cafe.name + " to favorites";

  return `
    <article class="card">
      <div class="card-main">
        <div class="card-topline">
          <span class="card-tag">Map-listed cafe</span>
          <span class="favorite-pill">${cafe.vibe}</span>
        </div>
        <h3>${escapeHtml(cafe.name)}</h3>
        <p class="card-address">${escapeHtml(cafe.address)}</p>
        <div class="card-meta">
          <span class="distance-pill">${distanceText}</span>
          <span class="distance-pill">${getDistanceBand(cafe.distanceKm)}</span>
        </div>
      </div>
      <div class="card-side">
        <p class="card-note">Open Google Maps for live reviews, directions, and a closer look at this spot.</p>
        <div class="card-actions">
          <a class="action-btn action-btn-primary" href="${directionsLink}" target="_blank" rel="noopener noreferrer">Directions</a>
          <a class="action-btn" href="${reviewsLink}" target="_blank" rel="noopener noreferrer">Reviews</a>
          <a class="action-btn action-btn-wide" href="${mapLink}" target="_blank" rel="noopener noreferrer">Open Map</a>
        </div>
        <button type="button" class="save-btn ${cafe.saved ? "saved" : ""}" data-favorite-id="${cafe.id}" aria-pressed="${cafe.saved ? "true" : "false"}" aria-label="${escapeHtml(saveAriaLabel)}">
          <span class="save-btn-mark">${cafe.saved ? "Saved" : "+"}</span>
          <span>${saveLabel}</span>
        </button>
      </div>
    </article>
  `;
}

function showLoading(message) {
  appState.cafes = [];
  cardsContainer.innerHTML = "";
  emptyState.innerHTML = "<p>Tap into live location for nearby cafes now, or use city search when you want to scout another place.</p>";
  emptyState.classList.add("hidden");
  hideMessage();
  loading.querySelector("p").textContent = message;
  loading.classList.remove("hidden");
  updateStatus("Scanning live map cafes...");
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
  if (!appState.searchLabel) {
    return count + " cafes ready";
  }

  if (userRealLat !== null && userRealLon !== null && appState.searchLabel !== "your live location") {
    return count + " cafes around " + appState.searchLabel + " with distance from your live location";
  }

  return count + " cafes around " + appState.searchLabel;
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
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
