let userCoords = null;
let placesData = [];
let favorites = JSON.parse(localStorage.getItem("favorites") || "[]");

const cardsContainer = document.getElementById("cards");
const detailsContainer = document.getElementById("details");
const weatherBlock = document.getElementById("weather");
const statusBlock = document.getElementById("status");

async function init() {
    updateOnlineStatus();

    await detectLocation();
    await loadWeather();
    await loadPlaces();

    renderCards();

    window.onpopstate = handlePopState;
}

window.addEventListener("online", updateOnlineStatus);
window.addEventListener("offline", updateOnlineStatus);

init();

function detectLocation() {
    return new Promise(resolve => {
        if (!navigator.geolocation) {
            statusBlock.textContent = "Геолокация не поддерживается.";
            return resolve();
        }

        navigator.geolocation.getCurrentPosition(
            pos => {
                userCoords = {
                    lat: pos.coords.latitude,
                    lon: pos.coords.longitude
                };
                resolve();
            },
            err => {
                statusBlock.textContent = "Геолокация недоступна.";
                resolve();
            }
        );
    });
}

async function loadWeather() {
    if (!userCoords) {
        weatherBlock.textContent = "Погода недоступна (нет геолокации)";
        return;
    }

    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${userCoords.lat}&longitude=${userCoords.lon}&current_weather=true`;
        const res = await fetch(url);
        const data = await res.json();
        const t = data.current_weather.temperature;

        weatherBlock.textContent = `Погода: ${t}°C`;
    } catch (e) {
        weatherBlock.textContent = "Ошибка загрузки погоды";
    }
}

async function loadPlaces() {
    try {
        const res = await fetch("pl.json");
        placesData = await res.json();

        if (userCoords) {
            placesData = placesData.map(p => ({
                ...p,
                distance: calcDistance(
                    userCoords.lat, userCoords.lon,
                    p.coordinates.lat, p.coordinates.lon
                )
            }));
        }
    } catch (e) {
        statusBlock.textContent = "Ошибка загрузки списка мест.";
    }
}

function calcDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI/180;
    const dLon = (lon2 - lon1) * Math.PI/180;

    const a = Math.sin(dLat/2)**2 +
              Math.cos(lat1*Math.PI/180) *
              Math.cos(lat2*Math.PI/180) *
              Math.sin(dLon/2)**2;

    return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1);
}

function renderCards() {
    cardsContainer.innerHTML = "";
    detailsContainer.classList.add("hidden");

    placesData.forEach(place => {
        const card = document.createElement("div");
        card.className = "card";

        card.innerHTML = `
            <img src="${place.image}" alt="${place.name}">
            <div class="card-content">
                <div class="card-title">${place.name}</div>
                <div class="card-desc">${place.description}</div>
                ${
                    userCoords
                    ? `<div class="card-distance">${place.distance} км от вас</div>`
                    : ""
                }
            </div>
            <div class="btn-row">
                <button class="fav-btn">⭐</button>
                <button class="details-btn">Подробнее</button>
            </div>
        `;

        card.querySelector(".fav-btn").onclick = () => toggleFavorite(place.id);
        card.querySelector(".details-btn").onclick = () => openDetails(place.id);

        cardsContainer.appendChild(card);
    });
}

function toggleFavorite(id) {
    if (favorites.includes(id)) {
        favorites = favorites.filter(f => f !== id);
    } else {
        favorites.push(id);
    }
    localStorage.setItem("favorites", JSON.stringify(favorites));
    alert("Избранное обновлено");
}

function openDetails(id) {
    const place = placesData.find(p => p.id === id);
    if (!place) return;

    history.pushState({ page: "details", id }, "", `#place-${id}`);

    cardsContainer.innerHTML = "";
    detailsContainer.classList.remove("hidden");

    detailsContainer.innerHTML = `
        <div class="details">
            <h2>${place.name}</h2>
            <img src="${place.image}" style="width:100%;max-height:300px;object-fit:cover;border-radius:10px;">
            <p>${place.description}</p>
            ${place.distance ? `<p><b>Расстояние:</b> ${place.distance} км</p>` : ""}
            <button onclick="history.back()">← Назад</button>
        </div>
    `;
}

function handlePopState(e) {
    if (e.state && e.state.page === "details") {
        openDetails(e.state.id);
    } else {
        renderCards();
    }
}

function updateOnlineStatus() {
    statusBlock.textContent = navigator.onLine
        ? "Онлайн"
        : "Оффлайн — данные могут быть устаревшими";
}
