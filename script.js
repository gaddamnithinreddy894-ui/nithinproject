/***************** GLOBAL VARIABLES ******************/
let map, marker, tileLayer;
let currentTempC = null;
let isCelsius = true;
let mapType = "normal";
let currentWeatherData = null;
let userLang = "en-US";
let isSpeaking = false;
let currentUtterance = null;

let destinationMarker = null;
let routeLine = null;


/***************** INIT MAP ******************/
function initMap(lat = 20.59, lon = 78.96, zoom = 6) {
    if (!map) {
        map = L.map("map").setView([lat, lon], zoom);
        setMapTheme();
        marker = L.marker([lat, lon]).addTo(map);
    } else {
        map.flyTo([lat, lon], zoom, { animate: true, duration: 2 });
        marker.setLatLng([lat, lon]);
    }
}


/***************** MAP THEMES ******************/
function setMapTheme() {
    if (tileLayer) map.removeLayer(tileLayer);

    tileLayer = L.tileLayer(
        mapType === "satellite"
            ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    );
    tileLayer.addTo(map);
}

function setSatellite() {
    mapType = mapType === "satellite" ? "normal" : "satellite";
    setMapTheme();
}


/***************** SETTINGS MENU ******************/
function toggleSettings() {
    let menu = document.getElementById("settingsMenu");
    menu.style.display = menu.style.display === "block" ? "none" : "block";
}

function toggleLanguageMenu() {
    let langMenu = document.getElementById("languageMenu");
    langMenu.style.display = langMenu.style.display === "block" ? "none" : "block";
}

function setLang(langCode) {
    userLang = langCode;
    alert("Language changed: " + langCode);
    document.getElementById("languageMenu").style.display = "none";
}



/***************** GET WEATHER BY CITY ******************/
function getWeather() {
    const city = document.getElementById("city").value;
    if (!city) return alert("Enter city name");

    document.getElementById("loading").style.display = "block";

    const apiKey = "f60533b3b5da3bb7d125cc078f05fa78";

    fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`)
        .then(res => res.json())
        .then(data => {

            document.getElementById("loading").style.display = "none";

            if (data.cod === "404") {
                document.getElementById("result").innerHTML = "❌ City not found";
                return;
            }

            currentWeatherData = data;
            currentTempC = data.main.temp;

            initMap(data.coord.lat, data.coord.lon, 13);
            updateWeatherUI();
        });
}



/***************** GET WEATHER BY GPS ******************/
function getLocationWeather() {

    navigator.geolocation.getCurrentPosition(
        pos => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;

            initMap(lat, lon, 15);
            getWeatherByCoordinates(lat, lon);
        },
        () => alert("Location permission denied"),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
}

function getWeatherByCoordinates(lat, lon) {

    const apiKey = "f60533b3b5da3bb7d125cc078f05fa78";

    fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`)
        .then(res => res.json())
        .then(data => {
            currentWeatherData = data;
            currentTempC = data.main.temp;
            updateWeatherUI();
        });
}



/***************** UPDATE UI FOR WEATHER ******************/
function updateWeatherUI() {
    const d = currentWeatherData;

    document.getElementById("result").innerHTML = `
        <h3>${d.name}</h3>
        <p>🌡️ Temp: <span id="temp">${d.main.temp}</span> °C</p>
        <p>💧 Humidity: ${d.main.humidity}%</p>
        <p>🌬️ Wind: ${d.wind.speed} m/s</p>
        <p>☁️ Weather: ${d.weather[0].description}</p>
    `;
}



/***************** SPEAK WEATHER ******************/
function speakWeather() {

    if (!currentWeatherData) return alert("Get weather first");

    if (isSpeaking) {
        speechSynthesis.cancel();
        isSpeaking = false;
        return;
    }

    const d = currentWeatherData;

    let text = "";

    // LANGUAGE OUTPUT
    switch (userLang) {
        case "te-IN":
            text = `${d.name} వాతావరణం. ఉష్ణోగ్రత ${d.main.temp} డిగ్రీలు. ఆర్ద్రత ${d.main.humidity} శాతం.`;
            break;

        case "hi-IN":
            text = `${d.name} का मौसम। तापमान ${d.main.temp} डिग्री। आर्द्रता ${d.main.humidity} प्रतिशत।`;
            break;

        default:
            text = `Weather for ${d.name}. Temperature ${d.main.temp} degree Celsius.`;
    }

    currentUtterance = new SpeechSynthesisUtterance(text);
    currentUtterance.lang = userLang;
    speechSynthesis.speak(currentUtterance);

    isSpeaking = true;
    currentUtterance.onend = () => isSpeaking = false;
}



/***************** TEMPERATURE UNIT TOGGLE ******************/
function toggleUnit() {

    if (!currentTempC) return;

    const tempSpan = document.getElementById("temp");

    if (isCelsius) {
        const F = (currentTempC * 9/5) + 32;
        tempSpan.innerText = F.toFixed(2);
    } else {
        tempSpan.innerText = currentTempC;
    }

    isCelsius = !isCelsius;
}



/***************** DISTANCE CALCULATION ******************/
function getDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI/180;
    const dLon = (lon2 - lon1) * Math.PI/180;

    const a = Math.sin(dLat/2)**2 +
        Math.cos(lat1*Math.PI/180) *
        Math.cos(lat2*Math.PI/180) *
        Math.sin(dLon/2)**2;

    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function drawBlueRoute(lat1, lon1, lat2, lon2) {
    if (routeLine) map.removeLayer(routeLine);

    routeLine = L.polyline(
        [[lat1, lon1], [lat2, lon2]],
        { color: "blue", weight: 6 }
    ).addTo(map);

    map.fitBounds(routeLine.getBounds(), { padding: [30, 30] });
}

function calculateDistance() {

    const src = document.getElementById("source").value;
    const dest = document.getElementById("destination").value;
    
    if (!src || !dest) return alert("Enter both places");

    const apiKey = "f60533b3b5da3bb7d125cc078f05fa78";

    fetch(`https://api.openweathermap.org/data/2.5/weather?q=${src}&appid=${apiKey}`)
        .then(r => r.json())
        .then(s => {

            fetch(`https://api.openweathermap.org/data/2.5/weather?q=${dest}&appid=${apiKey}`)
                .then(r => r.json())
                .then(d => {

                    const km = getDistanceKm(s.coord.lat, s.coord.lon, d.coord.lat, d.coord.lon);

                    document.getElementById("distanceResult").innerText =
                        `📏 Distance: ${km.toFixed(2)} km`;

                    drawBlueRoute(s.coord.lat, s.coord.lon, d.coord.lat, d.coord.lon);
                });
        });
}



/***************** DATE TIME ******************/
setInterval(() => {
    document.getElementById("datetime").innerText =
        new Date().toLocaleString("en-IN");
}, 1000);

function toggleDarkMode() {
    document.body.classList.toggle("dark");

    if (document.body.classList.contains("dark")) {
        localStorage.setItem("mode", "dark");
    } else {
        localStorage.setItem("mode", "light");
    }
}

// on page load
window.onload = () => {
    if (localStorage.getItem("mode") === "dark") {
        document.body.classList.add("dark");
    }

    initMap();
    getLocationWeather();
};
