# Leaflet.draw.topology
Topology editing extension to [Leaflet.draw](https://github.com/Leaflet/Leaflet.draw/). Video demo can be found [on YouTube](https://www.youtube.com/watch?v=rWVRIoIG3gc).

##Getting started
The plugin can be initialized as so:

````
L.Edit.Topology.init(map, layer, options);
````

### Parameters
| Parameter | Type | Required | Description
| --- | --- |  --- | ---
| map | [L.map](http://leafletjs.com/reference.html#map-class) | true | The map being used
| layer | [LayerGroup](#http://leafletjs.com/reference.html#layergroup), [FeatureGroup](http://leafletjs.com/reference.html#featuregroup), or [GeoJson](http://leafletjs.com/reference.html#geojson) |  true | The layer for which the topological relationships should be preserved
| options | [L.icon](http://leafletjs.com/reference.html#icon) |  false | Object with one key - `icon`. Used for defining a custom drag handle for editing.

### Example map

````
// Initialize a map
var map = new L.map("map").setView([38.5, -105], 6);

// Add a tile layer
L.tileLayer('http://{s}.acetate.geoiq.com/tiles/acetate/{z}/{x}/{y}.png', {
  maxZoom: 18,
  attribution: ' ©2012 Esri & Stamen, Data from OSM and Natural Earth'
}).addTo(map);

// Load a GeoJSON file
$.getJSON("data.geojson", function(data) {

  // Create, style, and add a GeoJson layer
  var geojson = L.geoJson(data, {
    style: {
      fillColor: '#777',
      color: '#444',
      weight: 3,
      opacity: 0.8
    }
  }).addTo(map);

  // Enable topology editing on the GeoJSON layer and use a custom marker
  L.Edit.Topology.init(map, geojson, {
    "icon": new L.Icon({
      iconUrl: '../src/icons/marker_blk.svg',
      iconSize: [12, 12]
    })
  });
});
````

## Dependencies
 - [Leaflet](http://leafletjs.com)
 - [Leaflet.draw](https://github.com/Leaflet/Leaflet.draw/)
 - [Leaflet.Snap](https://github.com/makinacorpus/Leaflet.Snap)
 - [Leaflet.GeometryUtil](https://github.com/makinacorpus/Leaflet.GeometryUtil)
 
## Example
Demo can be found in the ````test```` folder.

 
## Development
````
git clone https://github.com/jczaplew/Leaflet.draw.topology.git
cd Leaflet.draw.topology
npm install
git clone https://github.com/makinacorpus/Leaflet.Snap node_modules/Leaflet.Snap
````
To validate and minify the JavaScript and CSS, run ````grunt````


## License
All code unique to this plugin uses a [CC0 1.0 Public Domain Dedication](http://creativecommons.org/publicdomain/zero/1.0/). It would be nice if you cited the author(s), but it is not necessary. [Leaflet.draw](https://github.com/Leaflet/Leaflet.draw/) and [Leaflet.Snap](https://github.com/makinacorpus/Leaflet.Snap) are used under an [MIT License](https://github.com/makinacorpus/Leaflet.Snap/blob/gh-pages/LICENSE),  and [Leaflet.GeometryUtil](https://github.com/makinacorpus/Leaflet.GeometryUtil) is used under a [BSD License](https://github.com/makinacorpus/Leaflet.GeometryUtil/blob/master/LICENSE).
