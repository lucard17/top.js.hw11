const searchBlock = document.getElementById("searchBlock");
const city = document.getElementById('city');
const date = document.getElementById('date');
const currentDescription = document.getElementById('currentDescription');
const currentIcon = document.getElementById('currentIcon');
const currentTemp = document.getElementById('currentTemp');
const currentMinTemp = document.getElementById('currentMinTemp');
const currentMaxTemp = document.getElementById('currentMaxTemp');
const currentWind = document.getElementById('currentWind');
const forecastDayName = document.getElementById('forecastDayName');
const tempPrecision = 1;



class LocationSearchElement {
    #timeoutMs = 1000;
    #lastCallMs;
    #timer;
    #input;
    #inputTips;
    #searchResults = [];

    constructor(element) {
        this.#input = element.querySelector('input');
        this.#inputTips = element.querySelector('.inputTipsWrapper');
        this.#input.addEventListener("input", () => this.#searchLocationNameDebounce(this.#input.value));
        this.#inputTips.addEventListener("click", (e) => this.#handleLocationSelect(e));

    }

    #searchLocationNameDebounce(locationNameInput) {
        const callTimeMs = Date.now()
        if (this.#lastCallMs !== undefined && (callTimeMs - this.#lastCallMs) < this.#timeoutMs) {
            clearTimeout(this.#timer);
        }
        this.#lastCallMs = callTimeMs;
        this.#timer = setTimeout(() => {
            geoCoding.searchPosition(locationNameInput).then((result) => this.#updateElement(result));
        }, this.#timeoutMs);

    }

    #handleLocationSelect(e) {
        const index = e.target.getAttribute('data-id');
        this.#input.value = this.#searchResults[index].address;
        this.#inputTips.innerHTML = '';
        update(this.#searchResults[index].position)
        console.log(index);

    }

    #updateElement(searchResults) {
        this.#searchResults = searchResults;
        this.#inputTips.innerHTML = '';
        console.log(searchResults);
        if (searchResults.length === 0) {
            this.#input.classList.add('invalid')
        } else {
            this.#input.classList.remove('invalid')
            this.#searchResults.forEach((item, index) => {
                const newTip = document.createElement("button");
                newTip.innerText = item.address;
                newTip.className = "inputTip";
                newTip.setAttribute('data-id', index);
                this.#inputTips.appendChild(newTip);
            });
        }
    }
}

const geoCoding = (function () {
    function _getLocation({lat, lon}) {
        return fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14`)
            .then(response => {
                if (response.ok) {
                    return response.json();
                }
                return [];
            }).then((address) => convertAddress(address));
    }

    function _searchPosition(searchString, limit = 2) {
        return fetch(`https://nominatim.openstreetmap.org/search?q=${searchString}&format=json&limit=${limit}&addressdetails=1`)
            .then(response => {
                if (response.ok) {
                    return response.json();
                }
                return [];
            }).then((addresses) => {
                console.log(addresses);
                if (addresses.length !== 0) {
                    return addresses.map(item => convertAddress(item));
                } else {
                    return []
                }
            });
    }

    function convertAddress(addressItem) {
        return {
            address: getSubject(addressItem.address) + ", " + addressItem.address.state + ", " + addressItem.address.country,
            position: {lat: addressItem.lat, lon: addressItem.lon}
        }
    }

    function getSubject(address) {
        if ("hamlet" in address) {
            return address.hamlet;
        } else if ("village" in address) {
            return address.village;
        } else if ("town" in address) {
            return address.town;
        } else if ("city" in address) {
            return address.city;
        } else if ("state" in address) {
            return address.state;
        } else if ("region" in address) {
            return address.region;
        } else {
            return false;
        }
    }

    return {getLocation: _getLocation, searchPosition: _searchPosition};
})();

const locationSearch = new LocationSearchElement(searchBlock)
if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(function (position) {
        update({lat: position.coords.latitude, lon: position.coords.longitude});
    });
} else {
    update({lat: 55.7504461, lon: 37.6174943});
}


function update(position) {
    getWeather(position, false, updateWeather);
    getWeather(position, true, updateForecast);

}

function updateWeather(weather) {
    geoCoding.getLocation({lat: weather.coord.lat, lon: weather.coord.lon}).then(address => {
        city.innerHTML = address.address
    })
    date.innerHTML = getFormattedDateDDMMHHHH(new Date(weather.dt * 1000));
    currentDescription.innerHTML = weather.weather[0].main;
    currentIcon.src = `http://openweathermap.org/img/wn/${weather.weather[0].icon}@4x.png`;
    currentTemp.innerHTML =
        round(weather.main.temp) + "&deg;С";
    currentMinTemp.innerHTML =
        round(weather.main.temp_min) + "&deg;С";
    currentMaxTemp.innerHTML =
        round(weather.main.temp_max) + "&deg;С";
    currentWind.innerHTML = round(weather.wind.speed);
}

function updateForecast(weather) {

    forecastDayName.innerHTML = getWeekDayName(new Date(weather.list[0].dt * 1000).getDay());
    const hourNodes = document.getElementById("hourWeather").querySelectorAll(".hour");
    const weatherList=weather.list;
    hourNodes.forEach(function (node, index) {
        node.querySelector(".time").innerHTML = getFormattedTimeHH00(new Date(weatherList[index].dt * 1000));
        node.querySelector("img").src = `http://openweathermap.org/img/wn/${weatherList[index].weather[0].icon}@2x.png`;
        node.querySelector(".description").innerHTML = weatherList[index].weather[0].main;
        node.querySelector(".temp").innerHTML = weatherList[index].main.temp + "&deg;C";
        node.querySelector(".wind").innerHTML = weatherList[index].wind.speed;
    });
    console.log(weather)
}

function getWeather(position = "", forecast = false, callback) {
    const request = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
    const requestURL =
        "https://api.openweathermap.org/data/2.5/" +
        (forecast ? "forecast" : "weather") +
        "?lat=" + position.lat +
        "&lon=" + position.lon +
        "&units=metric&APPID=b03a2cfad336d11bd9140ffd92074504";
    request.open("GET", requestURL, false);

    request.onload = function () {
        if (request.status === 200) {
            callback(JSON.parse(request.response));
        }

    };
    request.send();
}


function round(value, precision = tempPrecision) {
    value = parseFloat(value);
    return Math.round(value * Math.pow(10, precision)) / Math.pow(10, precision);
}

function getWeekDayName(dayNumber) {
    const dayNames = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
    ]
    return dayNames[dayNumber];
}
function getFormattedDateDDMMHHHH(date) {
    return `${(date.getDate() + "").padStart(2, "0")}.${(
        date.getMonth() +
        1 +
        ""
    ).padStart(2, "0")}.${date.getFullYear()}`;
}
function getFormattedTimeHH00(date){
    return (date.getHours().toString()).padStart(2, "0") + ":00";
}
function debounce(callback, timeoutMs) {
    let lastCallMs;
    let timer;
    return function (...args) {
        const callTimeMs = Date.now()
        if (lastCallMs !== undefined && (callTimeMs - lastCallMs) < timeoutMs) {
            clearTimeout(timer);
        }
        lastCallMs = callTimeMs;
        timer = setTimeout(() => callback(...args), timeoutMs);
    }
}