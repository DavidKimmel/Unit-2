/* Map of GeoJSON data from MegaCities.geojson */
//declare map var in global scope
var map;
//function to instantiate the Leaflet map
function createMap(){
    //create the map
    map = L.map('map', {
        center: [34, -94],
        zoom: 4
    });

    //add OSM base tilelayer
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012'
    }).addTo(map);

    //call getData function
    getData();
    map.on('click', function(e) {
        // Create a popup at the clicked location
        L.popup()
            .setLatLng(e.latlng) // Set the popup position to where the user clicked
            .setContent("Latitude: " + e.latlng.lat.toFixed(5) + "<br>Longitude: " + e.latlng.lng.toFixed(5)) // Display lat/lng
            .openOn(map); // Open the popup on the map
    });
};
//added at Example 2.3 line 20...function to attach popups to each mapped feature
function onEachFeature(feature, layer) {
    var popupContent = "";
    if (feature.properties) {
        for (var property in feature.properties) {
            if (property.toLowerCase() === "city") { 
                popupContent += "<p><strong>" + property + ": " + feature.properties[property] + "</strong></p>"; //Make the city name BOLD
            } else {
                popupContent += "<p>" + property + ": " + feature.properties[property] + "</p>";
            }
        }
        layer.bindPopup(popupContent);
        
    };
};


//function to retrieve the data and place it on the map
function getData(){
    //load the data
    fetch("data/green.geojson")
        .then(function(response){
            return response.json();
        })
        .then(function(json){
            // Create marker options for circle markers
            var geojsonMarkerOptions = {
                radius: 8,
                fillColor: "#ff7800",
                color: "#000",
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            };
            // Create a Leaflet GeoJSON layer with pointToLayer and onEachFeature
            L.geoJson(json, {
                pointToLayer: function(feature, latlng) {
                    return L.circleMarker(latlng, geojsonMarkerOptions);
                },
                onEachFeature: onEachFeature
            }).addTo(map);
            
        })  
};


document.addEventListener('DOMContentLoaded',createMap)// Add all scripts to the JS folder