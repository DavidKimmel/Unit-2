// Global variable to store overall dataset statistics (calculated once)
var dataStats = {};

// Initialize the map with base maps and layer control
var map = L.map('map', { center: [37.8, -96], zoom: 4 });

// Define basemaps
var lightBasemap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri, HERE, Garmin, NGA, USGS'
});
var darkBasemap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri, HERE, Garmin, NGA, USGS'
});
lightBasemap.addTo(map);
var baseMaps = { "Light Gray": lightBasemap, "Dark Gray": darkBasemap };
L.control.layers(baseMaps).addTo(map);

// Class for handling proportional symbols on the map
class ProportionalSymbol {
    constructor(feature, latlng, attribute) {
        this.feature = feature;
        this.latlng = latlng;
        this.attribute = attribute;
        this.properties = feature.properties;
        this.value = Number(this.properties[this.attribute]);
        this.radius = ProportionalSymbol.calcPropRadius(this.value);
        this.layer = this.createLayer();
    }
    // Calculate radius (same logic as for the map symbols)
    static calcPropRadius(attValue) {
        let minRadius = 5;
        let scaleFactor = 1;
        let area = attValue * scaleFactor;
        let radius = Math.sqrt(area / Math.PI);
        return radius < minRadius ? minRadius : radius;
    }
    createLayer() {
        let options = {
            fillColor: "#2ca25f",  // Uniform green color
            color: "#000",
            weight: 1,
            opacity: 1,
            fillOpacity: 0.6,
            radius: this.radius
        };
        let layer = L.circleMarker(this.latlng, options);
        layer.bindPopup(createPopupContent(this.properties, this.attribute));
        // Open popup on mouseover, close on mouseout
        layer.on('mouseover', function () { this.openPopup(); });
        layer.on('mouseout', function () { this.closePopup(); });
        return layer;
    }
}

// Create popup content for each marker
function createPopupContent(properties, attribute) {
    let year = attribute.split("_")[2];
    return `<p><b>City:</b> ${properties.City}</p>
            <p><b>Green Space Per Capita in ${year}:</b> ${properties[attribute]} sq m</p>`;
}

// Process GeoJSON to extract "Green_percapita" attributes
function processData(data) {
    let attributes = [];
    let properties = data.features[0].properties;
    let allValues = [];
    for (let attribute in properties) {
        if (attribute.indexOf("Green_percapita") > -1) {
            attributes.push(attribute);
        }
    }
    data.features.forEach(function (feature) {
        attributes.forEach(function (attribute) {
            let value = Number(feature.properties[attribute]);
            if (!isNaN(value)) {
                allValues.push(value);
            }
        });
    });
    map.minValue = Math.min(...allValues);
    map.maxValue = Math.max(...allValues);
    // Sort attributes by year (e.g., "Green_percapita_1990", etc.)
    let years = ["1990", "2000", "2010", "2020"];
    attributes.sort(function (a, b) {
        let yearA = a.split("_")[2];
        let yearB = b.split("_")[2];
        return years.indexOf(yearA) - years.indexOf(yearB);
    });
    return attributes;
}

// Calculate overall (global) statistics for the green space values
function calcStats(data) {
    let allValues = [];
    data.features.forEach(function (feature) {
        for (let attribute in feature.properties) {
            if (attribute.indexOf("Green_percapita") > -1) {
                let value = Number(feature.properties[attribute]);
                if (!isNaN(value)) {
                    allValues.push(value);
                }
            }
        }
    });
    dataStats.min = Math.min(...allValues);
    dataStats.max = Math.max(...allValues);
    let sum = allValues.reduce((a, b) => a + b, 0);
    dataStats.mean = sum / allValues.length;
}

// Create proportional symbols on the map
function createPropSymbols(data, attributes) {
    L.geoJson(data, {
        pointToLayer: (feature, latlng) => new ProportionalSymbol(feature, latlng, attributes[0]).layer
    }).addTo(map);
}

// Update symbols and the temporal legend when the attribute changes
function updatePropSymbols(attribute) {
    map.eachLayer(function (layer) {
        if (layer.feature && layer.feature.properties[attribute]) {
            let props = layer.feature.properties;
            let attValue = Number(props[attribute]);
            let newRadius = ProportionalSymbol.calcPropRadius(attValue);
            layer.setRadius(newRadius);
            let popupContent = createPopupContent(props, attribute);
            let popup = layer.getPopup();
            popup.setContent(popupContent).update();
        }
    });
    // Update temporal legend title with the current year
    let year = attribute.split("_")[2];
    document.querySelector("span.year").innerHTML = year;
    // Note: The attribute legend circles remain based on overall stats (dataStats) and do not change.
}

// Create a custom sequence control (slider and buttons)
function createSequenceControls(attributes) {
    var SequenceControl = L.Control.extend({
        options: { position: 'bottomleft' },
        onAdd: function () {
            var container = L.DomUtil.create('div', 'sequence-control-container');
            // Insert reverse button, slider, then forward button (with new image names)
            container.insertAdjacentHTML('beforeend',
                '<button class="step" id="reverse" title="Reverse"><img src="img/back.png" alt="Back"></button>');
            container.insertAdjacentHTML('beforeend',
                '<input class="range-slider" type="range" min="0" max="' + (attributes.length - 1) + '" value="0" step="1">');
            container.insertAdjacentHTML('beforeend',
                '<button class="step" id="forward" title="Forward"><img src="img/up.png" alt="Forward"></button>');
            L.DomEvent.disableClickPropagation(container);
            return container;
        }
    });
    map.addControl(new SequenceControl());
    var slider = document.querySelector('.range-slider');
    slider.addEventListener('input', function () {
        updatePropSymbols(attributes[this.value]);
    });
    document.getElementById('reverse').addEventListener('click', function () {
        let index = parseInt(slider.value);
        index = (index - 1 + attributes.length) % attributes.length;
        slider.value = index;
        updatePropSymbols(attributes[index]);
    });
    document.getElementById('forward').addEventListener('click', function () {
        let index = parseInt(slider.value);
        index = (index + 1) % attributes.length;
        slider.value = index;
        updatePropSymbols(attributes[index]);
    });
}

// Create a custom legend control that displays both the temporal legend and a static SVG attribute legend
function createLegend(attributes) {
    var LegendControl = L.Control.extend({
        options: { position: 'bottomright' },
        onAdd: function () {
            var container = L.DomUtil.create('div', 'legend-control-container');
            // Temporal legend title (current year; updates with slider)
            container.innerHTML = '<p class="temporalLegend">Green Space Per Capita in <span class="year">' + attributes[0].split("_")[2];
            // Start the SVG element for the attribute legend (static, based on overall stats)
            var svg = '<svg id="attribute-legend" width="160px" height="60px">';
            // Array for circles: max, mean, and min
            var circles = ["max", "mean", "min"];
            for (var i = 0; i < circles.length; i++) {
                var radius = ProportionalSymbol.calcPropRadius(dataStats[circles[i]]);
                // Nest circles so that their bottoms align at y=59 (cx="30", cy = 59 - radius)
                var cy = 59 - radius;
                svg += '<circle class="legend-circle" id="' + circles[i] + '" r="' + radius + '" cy="' + cy +
                       '" fill="#2ca25f" fill-opacity="0.6" stroke="#000000" cx="30"/>';
                // Add text labels (x="65", y spaced evenly)
                var textY = i * 20 + 20;
                svg += '<text id="' + circles[i] + '-text" x="65" y="' + textY + '">' +
                       Math.round(dataStats[circles[i]] * 100) / 100 + ' m\u00B2' +
                       '</text>';
            }
            svg += "</svg>";
            container.insertAdjacentHTML('beforeend', svg);
            return container;
        }
    });
    map.addControl(new LegendControl());
}

// Load GeoJSON data and initialize map features and controls
function getData(map) {
    fetch('data/green.geojson')
        .then(response => response.json())
        .then(function (json) {
            var attributes = processData(json);  // Extract attributes like "Green_percapita_1990", etc.
            calcStats(json);                     // Calculate overall statistics for the attribute legend
            createPropSymbols(json, attributes);
            createSequenceControls(attributes);
            createLegend(attributes);
        });
}

getData(map);
