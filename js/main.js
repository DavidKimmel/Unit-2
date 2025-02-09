// Initialize the map
var map = L.map('map').setView([37.8, -96], 4);

// Add tile layer to the map
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012'
}).addTo(map);

// Fetch and process GeoJSON data
function getData(map){
    fetch('data/green.geojson')
        .then(function(response){
            return response.json();
        })
        .then(function(json){
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
    attributes.sort(function(a, b) {
        var yearA = a.split('_')[2];
        var yearB = b.split('_')[2];
        return yearOrder.indexOf(yearA) - yearOrder.indexOf(yearB);
    });

    console.log(attributes);
    return attributes;
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
    var attribute = attributes[0];
    var options = {
        fillColor: "#4CAF50",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    };

    var attValue = Number(feature.properties[attribute]);
    options.radius = calcPropRadius(attValue);

    var layer = L.circleMarker(latlng, options);
    var popupContent = "<p><b>City:</b> " + feature.properties.City + "</p><p><b>Green Per Capita in " + attribute.split("_")[2] + ":</b> " + feature.properties[attribute] + " sq m</p>";
    layer.bindPopup(popupContent);

    return layer;
}

// Calculate proportional radius
function calcPropRadius(attValue) {
    var minRadius = 5;  // Minimum size of the smallest symbol
    var scaleFactor = 1;  // Adjusted scale factor for better symbol scaling
    var area = attValue * scaleFactor;
    var radius = Math.sqrt(area / Math.PI);
    return radius < minRadius ? minRadius : radius;
}

// Create sequence controls
function createSequenceControls(attributes){
    var slider = "<input class='range-slider' type='range'></input>";
    document.querySelector("#panel").insertAdjacentHTML('beforeend', slider);

    document.querySelector(".range-slider").max = attributes.length - 1;
    document.querySelector(".range-slider").min = 0;
    document.querySelector(".range-slider").value = 0;
    document.querySelector(".range-slider").step = 1;

    document.querySelector('#panel').insertAdjacentHTML('beforeend','<button class="step" id="reverse">Reverse</button>');
    document.querySelector('#panel').insertAdjacentHTML('beforeend','<button class="step" id="forward">Forward</button>');

    document.querySelector('#reverse').insertAdjacentHTML('beforeend',"<img src='img/reverse.png'>");
    document.querySelector('#forward').insertAdjacentHTML('beforeend',"<img src='img/forward.png'>");

    // Event listeners
    document.querySelectorAll('.step').forEach(function(step){
        step.addEventListener("click", function(){
            var index = parseInt(document.querySelector('.range-slider').value);

            if (step.id == 'forward'){
                index++;
                index = index > attributes.length - 1 ? 0 : index;
            } else if (step.id == 'reverse'){
                index--;
                index = index < 0 ? attributes.length - 1 : index;
            }

            document.querySelector('.range-slider').value = index;
            updatePropSymbols(attributes[index]);
        });
    });

    document.querySelector('.range-slider').addEventListener('input', function(){
        var index = this.value;
        updatePropSymbols(attributes[index]);
    });
}

// Update proportional symbols
function updatePropSymbols(attribute){
    map.eachLayer(function(layer){
        if (layer.feature && layer.feature.properties[attribute]){
            var props = layer.feature.properties;
            var radius = calcPropRadius(Number(props[attribute]));
            layer.setRadius(radius);

            var popupContent = "<p><b>City:</b> " + props.City + "</p><p><b>Green Per Capita in " + attribute.split("_")[2] + ":</b> " + props[attribute] + " sq m</p>";
            layer.bindPopup(popupContent);
        }
    });
}

// Initialize the map with data
getData(map);