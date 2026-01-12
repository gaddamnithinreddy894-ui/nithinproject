// ================= GLOBALS =================
let map, marker, tileLayer;
let currentTempC = null;
let isCelsius = true;
let mapType = "normal";
let currentWeatherData = null;
let userLang = "en-US";
let isSpeaking = false;
let currentUtterance = null;

let sourceMarker = null;
let destinationMarker = null;
let routeLine = null;


// ================= MAP INIT =================
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


// ================= MAP THEME =================
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


// ================= SETTINGS BUTTON =================
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
    alert("Language changed!");
    document.getElementById("languageMenu").style.display = "none";
}


// ================= WEATHER BY CITY =================
function getWeather() {

    const city = document.getElementById("city").value;
    if (!city) return alert("Enter city name");

    const apiKey = "f60533b3b5da3bb7d125cc078f05fa78";

    fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`)
        .then(r => r.json())
        .then(data => {

            if (data.cod === "404") {
                document.getElementById("result").innerHTML = "❌ City not found";
                return;
            }

            currentWeatherData = data;

            let lat = data.coord.lat;
            let lon = data.coord.lon;

            initMap(lat, lon, 13);

            currentTempC = data.main.temp;
            isCelsius = true;

            updateWeatherText();
        });
}


// ================= WEATHER BY COORDINATES =================
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
        .then(r => r.json())
        .then(data => {

            currentWeatherData = data;
            currentTempC = data.main.temp;
            isCelsius = true;

            updateWeatherText();
        });
}


// ================= UPDATE TEXT UI =================
function updateWeatherText() {

    const d = currentWeatherData;

    document.getElementById("result").innerHTML = `
        <h3>${d.name}</h3>
        🌡️ Temp: <span id="temp">${d.main.temp}</span> °C <br>
        💧 Humidity: ${d.main.humidity}% <br>
        🌬️ Wind: ${d.wind.speed} m/s <br>
        ☁️ Weather: ${d.weather[0].description}
    `;
}


// ================= SPEAK WEATHER =================
function speakWeather() {

    if (!currentWeatherData) {
        alert("Get weather first");
        return;
    }

    if (isSpeaking) {
        speechSynthesis.cancel();
        isSpeaking = false;
        return;
    }

    const d = currentWeatherData;

    let text = "";

    switch (userLang) {
        case "te-IN":
            text = `${d.name} వాతావరణం. ఉష్ణోగ్రత ${d.main.temp} డిగ్రీలు. ఆర్ద్రత ${d.main.humidity} శాతం. గాలి వేగం ${d.wind.speed} మీటర్లు.`; 
            break;
        case "hi-IN":
            text = `${d.name} का मौसम। तापमान ${d.main.temp} डिग्री। आर्द्रता ${d.main.humidity} प्रतिशत। हवा की गति ${d.wind.speed} मीटर प्रति सेकंड।`;
            break;
        default:
            text = `Weather for ${d.name}. Temperature is ${d.main.temp} degree Celsius. Humidity is ${d.main.humidity} percent. Wind ${d.wind.speed} m/s.`;
    }

    currentUtterance = new SpeechSynthesisUtterance(text);
    currentUtterance.lang = userLang;

    speechSynthesis.speak(currentUtterance);

    isSpeaking = true;
    currentUtterance.onend = () => isSpeaking = false;
}


// ================= TEMP TOGGLE =================
function toggleUnit() {

    if (currentTempC === null) return;

    let tempSpan = document.getElementById("temp");

    if (isCelsius) {
        let f = (currentTempC * 9/5) + 32;
        tempSpan.innerText = f.toFixed(2);
        tempSpan.parentElement.innerHTML = `🌡️ Temp: <span id="temp">${f.toFixed(2)}</span> °F`;
    } else {
        tempSpan.parentElement.innerHTML = `🌡️ Temp: <span id="temp">${currentTempC}</span> °C`;
    }

    isCelsius = !isCelsius;
}


// ================= DISTANCE CALCULATION =================
function getDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2-lat1) * Math.PI/180;
    const dLon = (lon2-lon1) * Math.PI/180;

    const a =
        Math.sin(dLat/2)**2 +
        Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180) *
        Math.sin(dLon/2)**2;

    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}


// ================= ROUTE LINE =================
function drawBlueRoute(lat1, lon1, lat2, lon2) {

    if (routeLine) map.removeLayer(routeLine);

    routeLine = L.polyline(
        [[lat1, lon1], [lat2, lon2]],
        { color: "blue", weight: 6 }
    ).addTo(map);

    map.fitBounds(routeLine.getBounds(), { padding: [30, 30] });
}


// ================= SOURCE MARKER (GREEN) =================
function setSourceMarker(lat, lon) {

    if (sourceMarker) map.removeLayer(sourceMarker);

    sourceMarker = L.marker([lat, lon], {
        icon: L.icon({
            iconUrl: "https://maps.gstatic.com/mapfiles/ms2/micons/green-dot.png",
            iconSize: [32, 32],
            iconAnchor: [16, 32]
        })
    }).addTo(map);
}


// ================= DESTINATION MARKER (RED) =================
function setDestinationMarker(lat, lon) {

    if (destinationMarker) map.removeLayer(destinationMarker);

    destinationMarker = L.marker([lat, lon], {
        icon: L.icon({
            iconUrl: "https://maps.gstatic.com/mapfiles/ms2/micons/red-dot.png",
            iconSize: [32, 32],
            iconAnchor: [16, 32]
        })
    }).addTo(map);
}


// ================= FINAL DISTANCE FUNCTION =================
function calculateDistance() {

    const src = document.getElementById("source").value;
    const dest = document.getElementById("destination").value;

    if (!src || !dest) return alert("Enter both source & destination");

    const apiKey = "f60533b3b5da3bb7d125cc078f05fa78";

    fetch(`https://api.openweathermap.org/data/2.5/weather?q=${src}&appid=${apiKey}`)
        .then(r => r.json())
        .then(s => {

            if (!s.coord) return alert("Source not found");

            let sLat = s.coord.lat;
            let sLon = s.coord.lon;

            setSourceMarker(sLat, sLon);

            fetch(`https://api.openweathermap.org/data/2.5/weather?q=${dest}&appid=${apiKey}`)
                .then(r => r.json())
                .then(d => {

                    if (!d.coord) return alert("Destination not found");

                    let dLat = d.coord.lat;
                    let dLon = d.coord.lon;

                    setDestinationMarker(dLat, dLon);

                    let km = getDistanceKm(sLat, sLon, dLat, dLon);

                    document.getElementById("distanceResult").innerText =
                        `📏 Distance: ${km.toFixed(2)} km`;

                    drawBlueRoute(sLat, sLon, dLat, dLon);
                });
        });
}


// ================= DATE & TIME =================
function updateDateTime() {
    document.getElementById("datetime").innerText =
        new Date().toLocaleString("en-IN");
}
setInterval(updateDateTime, 1000);


// ================= PAGE LOAD =================
window.onload = () => {
    initMap();
    updateDateTime();
    if (navigator.geolocation) getLocationWeather();
};
