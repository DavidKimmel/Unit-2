// Initialize the map and set its view to the coordinates and zoom level
var map = L.map('map').setView([51.505, -0.09], 13);

// Add a tile layer (the base map) using OpenStreetMap tiles
// The URL structure defines how the tiles are loaded dynamically based on zoom and location
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, // Sets the maximum zoom level allowed on the map
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>' // Adds attribution text
}).addTo(map); // Adds the tile layer to the map

// Add a marker to the map at the specified coordinates
var marker = L.marker([51.5, -0.09]).addTo(map);

// Add a circle overlay to the map at the specified coordinates
var circle = L.circle([51.508, -0.11], {
    color: 'red', // Sets the border color of the circle
    fillColor: '#f03', // Sets the fill color inside the circle
    fillOpacity: 0.5, // Controls the opacity of the fill color
    radius: 500 // Defines the radius of the circle in meters
}).addTo(map);

// Add a polygon (a shape with multiple points) to the map
var polygon = L.polygon([
    [51.509, -0.08],
    [51.503, -0.06],
    [51.51, -0.047]
]).addTo(map);

// Bind a popup to the marker that appears when the marker is clicked
marker.bindPopup("<b>Hello world!</b><br>I am a popup.").openPopup(); // Opens the popup immediately

// Bind popups to the circle and polygon
circle.bindPopup("I am a circle.");
polygon.bindPopup("I am a polygon.");

// Create a standalone popup and display it on the map at the given coordinates
var popup = L.popup()
    .setLatLng([51.513, -0.09]) // Sets the popup’s latitude and longitude
    .setContent("I am a standalone popup.") // Defines the text content of the popup
    .openOn(map); // Adds the popup to the map and closes any other open popups

// Create an empty popup object
var popup = L.popup();

// Define a function that displays a popup showing the coordinates where the user clicked on the map
function onMapClick(e) {
    popup
        .setLatLng(e.latlng) // Sets the popup location to the clicked position
        .setContent("You clicked the map at " + e.latlng.toString()) // Sets popup content with the clicked coordinates
        .openOn(map); // Adds the popup to the map
}

// Attach an event listener to the map that triggers the onMapClick function when the map is clicked
map.on('click', onMapClick);
