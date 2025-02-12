// Initialize the map
var map = L.map('map').setView([37.8, -96], 4);

// Add base layers
var baseLayers = {
    "Street Map": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012'
    }),
    "Topographic Map": L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap'
    }),
    "Satellite": L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors, Humanitarian OpenStreetMap Team'
    })
};

// Add the default base layer
baseLayers["Street Map"].addTo(map);

// Add basemap control
L.control.layers(baseLayers).addTo(map);

// Fetch and process GeoJSON data
function getData(map){
    fetch('data/green.geojson')
        .then(response => response.json())
        .then(json => {
            var attributes = processData(json);
            createPropSymbols(json, attributes);
            createSequenceControls(attributes);
        });
}

// Process data to extract attributes
function processData(data){
    var attributes = [];
    var properties = data.features[0].properties;

    for (var attribute in properties){
        if (attribute.indexOf("Green_percapita") > -1){
            attributes.push(attribute);
        }
    }
    
    // Sort attributes to ensure chronological order explicitly
    var yearOrder = ["1990", "2000", "2010", "2020"];
    attributes.sort((a, b) => {
        var yearA = a.split('_')[2];
        var yearB = b.split('_')[2];
        return yearOrder.indexOf(yearA) - yearOrder.indexOf(yearB);
    });

    console.log(attributes);
    return attributes;
}

// Function to get color based on Green_percapita value
function getColor(greenPerCapita) {
    return greenPerCapita > 300 ? '#006400' :    // Dark Green for > 300
           greenPerCapita > 200 ? '#32CD32' :   // Lime Green for 201-300
                                  '#ADFF2F';     // Light Green for 0-200
}

// Create proportional symbols
function createPropSymbols(data, attributes){
    L.geoJson(data, {
        pointToLayer: function(feature, latlng){
            return pointToLayer(feature, latlng, attributes);
        }
    }).addTo(map);
}

// Convert markers to circle markers
function pointToLayer(feature, latlng, attributes){
    var attribute = attributes[0];  // Get initial attribute (e.g., Green_percapita_1990)
    var year = attribute.split("_")[2];  // Extract year from attribute name
    var greenPerCapita = feature.properties[attribute] || 0;  // Ensure a valid number
    
    var options = {
        fillColor: getColor(greenPerCapita),
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    };

    var attValue = Number(feature.properties[attribute]);
    options.radius = calcPropRadius(attValue);

    var layer = L.circleMarker(latlng, options);

    var popupContent = `<p><b>City:</b> ${feature.properties.City}</p>
                        <p><b>Green Per Capita in ${year}:</b> ${feature.properties[attribute]} sq m</p>`;
    
    layer.bindPopup(popupContent);
    return layer;
}

// Calculate proportional radius
function calcPropRadius(attValue) {
    var minRadius = 7;  // Minimum size of the smallest symbol
    var scaleFactor = 2;  // Adjusted scale factor for better symbol scaling
    var area = attValue * scaleFactor;
    var radius = Math.sqrt(area / Math.PI);
    return radius < minRadius ? minRadius : radius;
}

// Create sequence controls with year display and standard buttons
function createSequenceControls(attributes){
    // Add slider and control buttons
    var controlsHTML = `
        <div class="sequence-controls">
            <button class="step" id="reverse">⏪</button>
            <input class='range-slider' type='range'>
            <button class="step" id="forward">⏩</button>
             <span id="year-display">${attributes[0].split("_")[2]}</span>
        </div>
    `;
    document.querySelector("#panel").insertAdjacentHTML('beforeend', controlsHTML);

    // Slider configuration
    var slider = document.querySelector(".range-slider");
    slider.max = attributes.length - 1;
    slider.min = 0;
    slider.value = 0;
    slider.step = 1;

    // Event listeners for buttons
    document.querySelectorAll('.step').forEach(function(step){
        step.addEventListener("click", function(){
            var index = parseInt(slider.value);

            if (step.id == 'forward'){
                index = (index + 1) % attributes.length;
            } else if (step.id == 'reverse'){
                index = (index - 1 + attributes.length) % attributes.length;
            }

            slider.value = index;
            updatePropSymbols(attributes[index]);
        });
    });

    // Event listener for slider input
    slider.addEventListener('input', function(){
        var index = this.value;
        updatePropSymbols(attributes[index]);
    });
}

// Update proportional symbols and year display
function updatePropSymbols(attribute) {
    var year = attribute.split("_")[2];
    document.querySelector('#year-display').textContent = year;

    map.eachLayer(function(layer) {
        if (layer.feature && layer.feature.properties[attribute]) {
            var props = layer.feature.properties;
            var radius = calcPropRadius(Number(props[attribute]));
            var fillColor = getColor(Number(props[attribute]));  // Get new color

            layer.setRadius(radius);
            layer.setStyle({ fillColor: fillColor });  // Update the color

            var popupContent = `<p><b>City:</b> ${props.City}</p>
                                <p><b>Green Per Capita in ${year}:</b> ${props[attribute]} sq m</p>`;
            layer.bindPopup(popupContent);
        }
    });
}

function createLegend(map) {
    var legend = L.control({ position: "bottomleft" });

    legend.onAdd = function(map) {
        var div = L.DomUtil.create("div", "legend");
        div.innerHTML += "<h4>Green Space Per Capita</h4>";
        div.innerHTML += '<i style="background: #006400"></i> > 300 m<sup>2<br>';
        div.innerHTML += '<i style="background: #32CD32"></i> 201 - 300 m<sup>2<br>';
        div.innerHTML += '<i style="background: #ADFF2F"></i> 0 - 200 m<sup>2<br>';

        return div;
    };

    legend.addTo(map);
}


// Initialize the map with data
getData(map);
createLegend(map);
