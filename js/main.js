// Global variables
var dataStats = {};           // Stats for currently active dataset
var propSymbolsLayer;         // Global pointer to the active GeoJSON layer
var activeAttributes;         // Array of attribute names for the active dataset

// Global variables for each dataset's layer, attributes, and raw data
var usLayer, worldLayer;
var usAttributes, worldAttributes;
var usDataGlobal, worldDataGlobal;

// Initialize the map
var map = L.map('map', { center: [39.8283, -98.5795], zoom: 4 });

// Define basemaps
var osmBasemap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
});
osmBasemap.addTo(map);

// --- CLASS & HELPER FUNCTIONS ---

// ProportionalSymbol class
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
  static calcPropRadius(attValue) {
    let minRadius = 5, scaleFactor = 1;
    let area = attValue * scaleFactor;
    let radius = Math.sqrt(area / Math.PI);
    return radius < minRadius ? minRadius : radius;
  }
  createLayer() {
    let options = {
      fillColor: "#2ca25f",
      color: "#000",
      weight: 1,
      opacity: 1,
      fillOpacity: 0.6,
      radius: this.radius
    };
    let layer = L.circleMarker(this.latlng, options);
    layer.bindPopup(createPopupContent(this.properties, this.attribute));
    layer.on('mouseover', function () { this.openPopup(); });
    layer.on('mouseout', function () { this.closePopup(); });
    return layer;
  }
}

// Create popup content (with guard)
function createPopupContent(properties, attribute) {
  if (!attribute) return "<p>No attribute data available</p>";
  let parts = attribute.split("_");
  let year = parts.length >= 3 ? parts[2] : "N/A";
  return `<p><b>City:</b> ${properties.City}</p>
          <p><b>Green Space Per Capita in ${year}:</b> ${properties[attribute]} sq m</p>`;
}

// Process data to extract attributes (case-insensitive)
function processData(data) {
  let attributes = [];
  let properties = data.features[0].properties;
  for (let attribute in properties) {
    if (attribute.toLowerCase().indexOf("green_percapita") > -1) {
      attributes.push(attribute);
    }
  }
  if (attributes.length === 0) {
    console.error("No 'green_percapita' attributes found. Using default 'green_percapita_1990'.");
    attributes.push("green_percapita_1990");
  }
  // Sort attributes by year (assuming naming like "green_percapita_1990")
  let years = ["1990", "2000", "2010", "2020"];
  attributes.sort(function (a, b) {
    let yearA = a.split("_")[2], yearB = b.split("_")[2];
    return years.indexOf(yearA) - years.indexOf(yearB);
  });
  return attributes;
}

// Calculate overall statistics for a dataset and store in dataStats
function calcStats(data) {
  let allValues = [];
  data.features.forEach(function (feature) {
    for (let attribute in feature.properties) {
      if (attribute.toLowerCase().indexOf("green_percapita") > -1) {
        let value = Number(feature.properties[attribute]);
        if (!isNaN(value)) allValues.push(value);
      }
    }
  });
  if (allValues.length > 0) {
    dataStats.min = Math.min(...allValues);
    dataStats.max = Math.max(...allValues);
    let sum = allValues.reduce((a, b) => a + b, 0);
    dataStats.mean = sum / allValues.length;
  } else {
    dataStats.min = dataStats.max = dataStats.mean = 0;
  }
}

// Create a GeoJSON layer for a dataset
function createPropSymbols(data, attributes) {
  return L.geoJson(data, {
    filter: function(feature) {
      return feature.geometry &&
             feature.geometry.type === "Point" &&
             Array.isArray(feature.geometry.coordinates) &&
             feature.geometry.coordinates.length >= 2;
    },
    pointToLayer: (feature, latlng) =>
      new ProportionalSymbol(feature, latlng, attributes[0]).layer
  });
}

// Update symbols and temporal legend for the active layer
function updatePropSymbols(attribute) {
  propSymbolsLayer.eachLayer(function (layer) {
    if (layer.feature && layer.feature.properties.hasOwnProperty(attribute)) {
      let attValue = Number(layer.feature.properties[attribute]);
      if (!isNaN(attValue)) {
        let newRadius = ProportionalSymbol.calcPropRadius(attValue);
        layer.setRadius(newRadius);
        let popupContent = createPopupContent(layer.feature.properties, attribute);
        let popup = layer.getPopup();
        popup.setContent(popupContent).update();
      }
    }
  });
  let parts = attribute.split("_");
  let year = parts.length >= 3 ? parts[2] : "N/A";
  document.querySelector("span.year").innerHTML = year;
  updateLegend(attribute);
}

// Calculate current statistics for the active attribute from the active layer
function calcCurrentStats(attribute) {
  let values = [];
  propSymbolsLayer.eachLayer(function (layer) {
    if (layer.feature && layer.feature.properties.hasOwnProperty(attribute)) {
      let val = Number(layer.feature.properties[attribute]);
      if (!isNaN(val)) { values.push(val); }
    }
  });
  if (values.length === 0) {
    return { min: dataStats.min, max: dataStats.max, mean: dataStats.mean };
  }
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    mean: values.reduce((a, b) => a + b, 0) / values.length
  };
}

// Update the SVG attribute legend using current statistics.
// We use a separate legendScaleFactor and enforce a minimum and maximum legend radius.
// The circles will be nested (their bottom edges align at a fixed baseline),
// and the text labels are positioned at fixed x values for clear separation.
function updateLegend(attribute) {
  let currStats = calcCurrentStats(attribute);
  let circles = ["max", "mean", "min"];

  let legendScaleFactor = 5;
  let minLegendRadius = 3;
  let maxLegendRadius = 30;

  let largestValue = currStats.max;
  let largestArea = largestValue * legendScaleFactor;
  let rawLargestRadius = Math.sqrt(largestArea / Math.PI);
  if (rawLargestRadius > maxLegendRadius) {
    legendScaleFactor *= maxLegendRadius / rawLargestRadius;
  }

  function calcLegendRadius(value) {
    let area = value * legendScaleFactor;
    let rawRadius = Math.sqrt(area / Math.PI);
    return rawRadius < minLegendRadius ? minLegendRadius : rawRadius;
  }

  let baseline = 80; // New baseline for nesting circles
  // Fixed text positions (x remains same in both functions; here we adjust vertical positions)
  let textPositions = { max: 30, mean: 50, min: 70 };

  circles.forEach(function (circle) {
    let radius = calcLegendRadius(currStats[circle]);
    let cy = baseline - radius;
    let circleElem = document.getElementById(circle);
    if (circleElem) {
      circleElem.setAttribute("r", radius);
      circleElem.setAttribute("cy", cy);
    }
    let textElem = document.getElementById(circle + "-text");
    if (textElem) {
      textElem.setAttribute("y", textPositions[circle]);
      textElem.textContent = Math.round(currStats[circle] * 100) / 100 + " m\u00B2";
    }
  });
}

// Create custom sequence control (slider and buttons)
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
    updatePropSymbols(activeAttributes[this.value]);
  });
  document.getElementById('reverse').addEventListener('click', function () {
    let index = parseInt(slider.value);
    index = (index - 1 + activeAttributes.length) % activeAttributes.length;
    slider.value = index;
    updatePropSymbols(activeAttributes[index]);
  });
  document.getElementById('forward').addEventListener('click', function () {
    let index = parseInt(slider.value);
    index = (index + 1) % activeAttributes.length;
    slider.value = index;
    updatePropSymbols(activeAttributes[index]);
  });
}

// Create custom legend control with temporal title, tree icon, and SVG attribute legend
function createLegend(attributes) {
  var LegendControl = L.Control.extend({
    options: { position: 'bottomright' },
    onAdd: function () {
      var container = L.DomUtil.create('div', 'legend-control-container');
      container.innerHTML =
        '<p class="temporalLegend"><img src="img/tree.svg" alt="Tree Icon" class="legend-icon-inline" />' +
        'Green Space Per Capita<br/>in <span class="year">' +
        attributes[0].split("_")[2] +
        '</span></p>';
      // Increase SVG width to 220px to provide room for shifted symbols
      var svg = '<svg id="attribute-legend" width="220px" height="100px">';
      var circles = ["max", "mean", "min"];
      // Set fixed positions: move circles to the right by increasing cx and adjust text x accordingly
      let circleX = 60;           // new cx for circles
      let textX = 100;            // new x for text labels
      let baseline = 80;          // baseline for nested circles
      let textPositions = { max: 30, mean: 50, min: 70 };

      let legendScaleFactor = 5;
      let minLegendRadius = 3;
      let maxLegendRadius = 30;
      let largestValue = dataStats.max;
      let largestArea = largestValue * legendScaleFactor;
      let rawLargestRadius = Math.sqrt(largestArea / Math.PI);
      if (rawLargestRadius > maxLegendRadius) {
        legendScaleFactor *= maxLegendRadius / rawLargestRadius;
      }
      function calcLegendRadius(value) {
        let area = value * legendScaleFactor;
        let rawRadius = Math.sqrt(area / Math.PI);
        return rawRadius < minLegendRadius ? minLegendRadius : rawRadius;
      }
      
      circles.forEach(function (circle) {
        let radius = calcLegendRadius(dataStats[circle]);
        let cy = baseline - radius;
        svg += '<circle class="legend-circle" id="' + circle + '" r="' + radius +
               '" cy="' + cy +
               '" fill="#2ca25f" fill-opacity="0.6" stroke="#000000" cx="' + circleX + '"/>';
        svg += '<text id="' + circle + '-text" x="' + textX + '" y="' + textPositions[circle] + '">' +
               Math.round(dataStats[circle] * 100) / 100 +
               " m\u00B2</text>";
      });
      svg += "</svg>";
      container.insertAdjacentHTML('beforeend', svg);
      return container;
    }
  });
  map.addControl(new LegendControl());
}

// --- DATA LOADING & LAYER SWITCHING ---

Promise.all([
  fetch('data/green.geojson').then(r => r.json()),
  fetch('data/worldgreen.geojson').then(r => r.json())
]).then(function ([usData, worldData]) {
  // Store raw data globally
  usDataGlobal = usData;
  worldDataGlobal = worldData;
  
  // Process each dataset
  usAttributes = processData(usData);
  worldAttributes = processData(worldData);
  if (worldAttributes.length === 0) {
    console.warn("World dataset missing attributes, using USA attributes as fallback.");
    worldAttributes = usAttributes;
  }
  
  // Create layers for each dataset
  usLayer = createPropSymbols(usData, usAttributes);
  worldLayer = createPropSymbols(worldData, worldAttributes);
  
  // Set default to USA data (load automatically)
  propSymbolsLayer = usLayer;
  activeAttributes = usAttributes;
  calcStats(usData); // Calculate stats for USA data
  usLayer.addTo(map); // Ensure USA layer is visible by default
  
  // Create sequence control and legend based on activeAttributes (USA data)
  createSequenceControls(activeAttributes);
  createLegend(activeAttributes);
  
  // Create base layer control for switching between datasets
  var baseMaps = {
    "USA Green Space": usLayer,
    "World Green Space": worldLayer
  };
  L.control.layers(baseMaps, null, { collapsed: false }).addTo(map);
  
  // Listen for base layer changes to update active layer, attributes, stats, and view
  map.on('baselayerchange', function (e) {
    if (e.name === "USA Green Space") {
      propSymbolsLayer = usLayer;
      activeAttributes = usAttributes;
      calcStats(usData);
      // Set view for USA
      map.setView([39.8283, -98.5795], 4);
    } else if (e.name === "World Green Space") {
      propSymbolsLayer = worldLayer;
      activeAttributes = worldAttributes;
      calcStats(worldData);
      // Set view for world
      map.setView([20, 0], 2);
    }
    var slider = document.querySelector('.range-slider');
    let idx = parseInt(slider.value);
    updatePropSymbols(activeAttributes[idx]);
  });
});
