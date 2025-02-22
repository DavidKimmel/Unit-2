// Global variable to store data statistics (calculated once)
var dataStats = {};

// Global variable to store the proportional symbols layer
var propSymbolsLayer;

// Initialize the map
var map = L.map('map', {
    center: [37.8, -96],
    zoom: 4
});

// Define basemaps
var osmBasemap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  });
  
  var cartoPositron = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap contributors, © CARTO'
  });
  
  // Add a default basemap
  osmBasemap.addTo(map);
  
  // Add these to your layer control
  var baseMaps = {
    "OpenStreetMap": osmBasemap,
    "CartoDB Positron": cartoPositron
  };
  L.control.layers(baseMaps).addTo(map);

// Class for handling proportional symbols
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

    // Calculate the circle radius
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

        // Create the popup
        layer.bindPopup(createPopupContent(this.properties, this.attribute));

        // Show popup on mouseover; hide on mouseout
        layer.on('mouseover', function () {
            this.openPopup();
        });
        layer.on('mouseout', function () {
            this.closePopup();
        });

        return layer;
    }
}

// Create popup content for each marker
function createPopupContent(properties, attribute) {
    let year = attribute.split("_")[2];
    return `<p><b>City:</b> ${properties.City}</p>
            <p><b>Green Space Per Capita in ${year}:</b> ${properties[attribute]} sq m</p>`;
}

// Process GeoJSON data to extract "Green_percapita" attributes
function processData(data) {
    let attributes = [];
    let properties = data.features[0].properties;
    let allValues = [];

    // Find attributes that contain "Green_percapita"
    for (let attribute in properties) {
        if (attribute.indexOf("Green_percapita") > -1) {
            attributes.push(attribute);
        }
    }

    // Gather all numeric values for min/max
    data.features.forEach(function (feature) {
        attributes.forEach(function (attribute) {
            let value = Number(feature.properties[attribute]);
            if (!isNaN(value)) {
                allValues.push(value);
            }
        });
    });

    // Save global min and max for reference
    map.minValue = Math.min(...allValues);
    map.maxValue = Math.max(...allValues);

    // Sort attributes by year (assuming "Green_percapita_1990", etc.)
    let years = ["1990", "2000", "2010", "2020"];
    attributes.sort(function (a, b) {
        let yearA = a.split("_")[2];
        let yearB = b.split("_")[2];
        return years.indexOf(yearA) - years.indexOf(yearB);
    });

    return attributes;
}

// Calculate overall statistics from the dataset (once after data load)
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

// Create proportional symbols on the map and store in a global layer
function createPropSymbols(data, attributes) {
    propSymbolsLayer = L.geoJson(data, {
        pointToLayer: (feature, latlng) =>
            new ProportionalSymbol(feature, latlng, attributes[0]).layer
    }).addTo(map);
}

// Update symbols and the temporal legend when the attribute changes
function updatePropSymbols(attribute) {
    console.log("Updating to attribute:", attribute); // Debug log

    // Iterate only over our propSymbolsLayer
    propSymbolsLayer.eachLayer(function (layer) {
        if (layer.feature && layer.feature.properties.hasOwnProperty(attribute)) {
            let attValue = Number(layer.feature.properties[attribute]);
            // If the value is numeric, update radius and popup
            if (!isNaN(attValue)) {
                let newRadius = ProportionalSymbol.calcPropRadius(attValue);
                layer.setRadius(newRadius);
                let popupContent = createPopupContent(layer.feature.properties, attribute);
                let popup = layer.getPopup();
                popup.setContent(popupContent).update();
            }
        }
    });

    // Update the temporal legend title
    let year = attribute.split("_")[2];
    document.querySelector("span.year").innerHTML = year;

    // Update the attribute legend circles
    updateLegend(attribute);
}

// Calculate current stats (min, mean, max) for the selected attribute by iterating only over propSymbolsLayer
function calcCurrentStats(attribute) {
    let values = [];

    // Gather valid numeric values for this attribute
    propSymbolsLayer.eachLayer(function (layer) {
        if (
            layer.feature &&
            layer.feature.properties.hasOwnProperty(attribute)
        ) {
            let val = Number(layer.feature.properties[attribute]);
            if (!isNaN(val)) {
                values.push(val);
            }
        }
    });

    // Log how many valid values were found
    console.log(`Found ${values.length} values for ${attribute}`, values);

    // If no values were found, fallback to the overall stats
    if (values.length === 0) {
        console.warn("No valid values found for " + attribute + ", using global stats.");
        return {
            min: dataStats.min,
            max: dataStats.max,
            mean: dataStats.mean
        };
    }

    // Compute local min, mean, max
    let minVal = Math.min(...values);
    let maxVal = Math.max(...values);
    let sum = values.reduce((a, b) => a + b, 0);
    let meanVal = sum / values.length;

    console.log(`Stats for ${attribute}:`, { minVal, meanVal, maxVal });
    return { min: minVal, max: maxVal, mean: meanVal };
}

// Update the SVG attribute legend using the current stats for the selected attribute
function updateLegend(attribute) {
    let currStats = calcCurrentStats(attribute);

    // If currStats.min is NaN, skip
    if (isNaN(currStats.min)) {
        console.warn("Skipping legend update: stats are invalid for", attribute);
        return;
    }

    // The legend circles have ids "max", "mean", "min"
    let circles = ["max", "mean", "min"];
    circles.forEach(function (circle) {
        let radius = ProportionalSymbol.calcPropRadius(currStats[circle]);
        let circleElem = document.getElementById(circle);
        if (circleElem) {
            circleElem.setAttribute("r", radius);
            // Align circle bottoms at y=59
            circleElem.setAttribute("cy", 59 - radius);
        }
        let textElem = document.getElementById(circle + "-text");
        if (textElem) {
            textElem.textContent =
                Math.round(currStats[circle] * 100) / 100 + " sq m";
        }
    });
}

// Create a custom sequence control (slider and buttons)
function createSequenceControls(attributes) {
    var SequenceControl = L.Control.extend({
        options: { position: 'bottomleft' },
        onAdd: function () {
            var container = L.DomUtil.create('div', 'sequence-control-container');
            container.insertAdjacentHTML(
                'beforeend',
                '<button class="step" id="reverse" title="Reverse"><img src="img/back.png" alt="Back Arrow"></button>'
            );
            container.insertAdjacentHTML(
                'beforeend',
                '<input class="range-slider" type="range" min="0" max="' +
                    (attributes.length - 1) +
                    '" value="0" step="1">'
            );
            container.insertAdjacentHTML(
                'beforeend',
                '<button class="step" id="forward" title="Forward"><img src="img/up.png" alt="Forward Arrow"></button>'
            );
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

// Create a custom legend control that displays both a temporal legend and an SVG attribute legend
function createLegend(attributes) {
    var LegendControl = L.Control.extend({
        options: { position: 'bottomright' },
        onAdd: function () {
            var container = L.DomUtil.create('div', 'legend-control-container');
            // Insert tree icon at the beginning and break the title into two centered lines
            container.innerHTML =
                '<p class="temporalLegend">' +
                    '<img src="img/tree.svg" alt="Tree Icon" class="legend-icon-inline" />' +
                    'Green Space Per Capita<br/><strong><span class="year">' +
                    attributes[0].split("_")[2] +
                    '</span>' +
                '</p>';

            // Build the SVG element for the attribute legend
            var svg = '<svg id="attribute-legend" width="160px" height="60px">';
            var circles = ["max", "mean", "min"];
            for (var i = 0; i < circles.length; i++) {
                let radius = ProportionalSymbol.calcPropRadius(dataStats[circles[i]]);
                let cy = 59 - radius;
                svg +=
                    '<circle class="legend-circle" id="' +
                    circles[i] +
                    '" r="' + radius +
                    '" cy="' + cy +
                    '" fill="#2ca25f" fill-opacity="0.6" stroke="#000000" cx="30"/>';
                let textY = i * 20 + 20;
                svg +=
                    '<text id="' +
                    circles[i] +
                    '-text" x="65" y="' +
                    textY +
                    '">' +
                    Math.round(dataStats[circles[i]] * 100) / 100 +
                    " m\u00B2</text>";
            }
            svg += "</svg>";
            container.insertAdjacentHTML('beforeend', svg);
            return container;
        }
    });
    map.addControl(new LegendControl());
}



// Load GeoJSON data and initialize the map features and controls
function getData(map) {
    fetch('data/green.geojson')
        .then(response => response.json())
        .then(function (json) {
            var attributes = processData(json);
            calcStats(json);
            createPropSymbols(json, attributes);
            createSequenceControls(attributes);
            createLegend(attributes);
        });
}

getData(map);
