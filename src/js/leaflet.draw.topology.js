if (L.Edit.Poly && L.Handler.MarkerSnap) {
  
  L.Edit.Poly.prototype.addHooks = function () {
    if (this._poly._map) {
      if (!this._markerGroup) {
        this._initMarkers();
      }
      this._poly._map.addLayer(this._markerGroup);
      this._findTwins();
    }
  };

  L.Edit.Poly.prototype._findTwins = function() {
    Object.keys(this._poly._map._layers).forEach(function(d, i) {
      Object.keys(this._poly._map._layers).forEach(function(x, y) {
        if (this._poly._map._layers[d]._origLatLng && this._poly._map._layers[x]._origLatLng && this._poly._map._layers[d]._origLatLng.lat === this._poly._map._layers[x]._origLatLng.lat && this._poly._map._layers[d]._origLatLng.lng === this._poly._map._layers[x]._origLatLng.lng) {
          if (this._poly._map._layers[d]._leaflet_id !== this._poly._map._layers[x]._leaflet_id) {
            if (!this._poly._map._layers[d]._twinMarkers) {
              this._poly._map._layers[d]._twinMarkers = [];
            }
            if (this._poly._map._layers[d]._twinMarkers.indexOf(this._poly._map._layers[x]) < 0) {
              this._poly._map._layers[d]._twinMarkers.push(this._poly._map._layers[x]);
            }

            if (!this._poly._map._layers[x]._twinMarkers) {
              this._poly._map._layers[x]._twinMarkers = [];
            }
            if (this._poly._map._layers[x]._twinMarkers.indexOf(this._poly._map._layers[d]) < 0) {
              this._poly._map._layers[x]._twinMarkers.push(this._poly._map._layers[d]);
            }
          }
        }
      }.bind(this));
    }.bind(this));
  };

  L.Edit.Poly.prototype._initMarkers = function() {
    if (!this._markerGroup) {
      this._markerGroup = new L.LayerGroup();
    }
    this._markers = [];

    var latlngs = this._poly._latlngs,
      i, j, len, marker;

    for (i = 0, len = latlngs.length; i < len; i++) {
      marker = this._createMarker(latlngs[i], i);
      marker.on('click', this._onMarkerClick, this);
      this._markers.push(marker);
    }
    var markerLeft, markerRight;

    for (i = 0, j = len - 1; i < len; j = i++) {
      if (i === 0 && !(L.Polygon && (this._poly instanceof L.Polygon))) {
        continue;
      }

      markerLeft = this._markers[j];
      markerRight = this._markers[i];

      this._updatePrevNext(markerLeft, markerRight);
    }
    this._updateIndexes();
  };

  L.Edit.Poly.prototype._createMarker = function (latlng, index) {
    var marker = new L.Marker(latlng, {
      draggable: true,
      icon: this.options.icon
    });
    marker._origLatLng = latlng;
    marker._index = (index) ? index : latlng._index;
    marker._layer = latlng._layer;

    if (latlng._hasTwin) {
      marker._hasTwin = true;
      marker._twinLayers = latlng._twinLayers;
    }

    if (latlng._isMiddle) {
      marker._isMiddle = true;
    }

    marker.on('drag', this._onMarkerDrag, this);
    marker.on('dragend', this._fireEdit, this);

    this._markerGroup.addLayer(marker);

    return marker;
  };

  L.Edit.Poly.prototype._onMarkerDrag = function (e) {
    var marker = e.target;
    var origLatLng = marker._origLatLng;
    var toRedraw = [];

    L.extend(marker._origLatLng, marker._latlng);

    if (marker._middleLeft) {
      marker._middleLeft.setLatLng(this._getMiddleLatLng(marker._prev, marker));
    }
    if (marker._middleRight) {
      marker._middleRight.setLatLng(this._getMiddleLatLng(marker, marker._next));
    }

    toRedraw.push(marker._layer);

    if (marker._hasTwin) {
      marker._twinMarkers.forEach(function(d) {
        d.setLatLng(marker._latlng);
        d.update();

        this._poly._map._layers[d._layer]._latlngs.forEach(function(q) {
          if (q.lat === marker._origLatLng.lat && q.lng === marker._origLatLng.lng) {
            q.lat = marker._latlng.lat;
            q.lng = marker._latlng.lng;
          }
        });

        L.extend(d._origLatLng, marker._latlng);

        toRedraw.push(d._layer);

      }.bind(this));
    }

    toRedraw.forEach(function(d) {
      this._poly._map._layers[d].editing._poly.redraw();
    }.bind(this));
  };

  // Update Leaflet.snap to fire a snap/unsnap on the map
  L.Handler.MarkerSnap.prototype._updateSnap = function (marker, layer, latlng) {
    // Layer is guide layer being snapped to
    if (layer && latlng) {
      marker._latlng = L.latLng(latlng);
      marker.update();
      if (marker.snap != layer) {
        // marker.snap is guide layer being snapped to
        marker.snap = layer;
        if (marker._icon) L.DomUtil.addClass(marker._icon, 'marker-snapped');
        this._map.fire('snap', {"marker_id": marker._leaflet_id, "layer_id": layer._leaflet_id, "marker": marker});
        marker.fire('snap', {layer:layer, latlng: latlng});
      }
    }
    else {
      if (marker.snap) {
        if (marker._icon) L.DomUtil.removeClass(marker._icon, 'marker-snapped');
        this._map.fire('unsnap', {"marker_id": marker._leaflet_id, "marker": marker});
        marker.fire('unsnap', {layer:marker.snap});
      }
      delete marker['snap'];
    }
  };

  L.Edit.Topology = {
    init: function(map, layer, options) {
      this._map = map;
      var icon = (options && options.icon) ? options.icon : 
          new L.DivIcon({
            iconSize: new L.Point(10, 10),
            className: "leaflet-div-icon leaflet-editing-icon"
          });
      icon.options.className = icon.options.className + " propagateDrag";

      this.marker = new L.Marker(this._map.getCenter(), {
        icon: icon,
        repeatMode: false,
        zIndexOffset: 2000
      }).addTo(this._map);

      this._map.on('mousemove', function(e) {
        this.marker.setLatLng(e.latlng);
      }.bind(this));

      this.marker.snapediting = new L.Handler.MarkerSnap(this._map, this.marker);
      this.marker.snapediting.addGuideLayer(drawnItems);
      this.marker.snapediting.enable();

      this._map.removeLayer(this.marker);
      this.marker.snapediting.disable();

      this._map.on('snap', function(e) {
        L.DomUtil.removeClass(e.marker._icon, 'hidden');
        this._map._snapLayer = e.layer_id;
      }.bind(this));

      this._map.on('unsnap', function(e) {
        L.DomUtil.addClass(e.marker._icon, 'hidden');
        this._map._snapLayer = "";
      }.bind(this));

      Object.keys(layer._layers).forEach(function(j) {
        layer._layers[j].on("click", function(d) {
          // When a polygon is clicked, toggle editing for it and all adjacent polygons
          // If editing is already toggled, disable editing
          if (d.target.editing._enabled) {
            if (this._map._snapLayer) {
              var newMarker = new L.Marker(this.marker.getLatLng(), { 
                icon: L.Edit.Poly.prototype.options.icon, 
                draggable: true
              });
              this._map.fire('marker-created', this.marker);
            } else {
              this._map.removeLayer(this.marker);
              this.marker.snapediting.disable();
              this._findAdjacencies("disable", d.target);
            }
          } else {
            this._map.addLayer(this.marker);
            this.marker.snapediting.enable();
            this._findAdjacencies("enable", d.target);
          }
        }.bind(this));
      }.bind(this));

      layer.addTo(this._map);

      this._map.on('marker-created', function(vertex) {
        // Make sure marker is snapped to a polygon
        if (this._map._snapLayer) {
          var poly = this._map._snapLayer,
              hash = this.sortPolygon(this._map._snapLayer, vertex);

          var markerToInsert = {
            "lat": vertex._latlng.lat,
            "lng": vertex._latlng.lng,
            "layer": poly
          };
          markerToInsert.layer = poly;
          /* Figure out if it belongs before or after the nearest vertex.
             Here we check if the added vertex is between the closest vertex
             and the next vertex. If it is not between the closest and next 
             vertex, we can assume it's between the closest and the previous vertex;
          */
          if (hash[0]._index === this._map._layers[poly].editing._poly._latlngs.length - 1) {
            var beforeOrAfter = (this._isBetween(this._map._layers[poly].editing._poly._latlngs[hash[0]._index], this._map._layers[poly].editing._poly._latlngs[0], vertex._latlng)) ? 1 : 0;
          } else {
            var beforeOrAfter = (this._isBetween(this._map._layers[poly].editing._poly._latlngs[hash[0]._index], this._map._layers[poly].editing._poly._latlngs[hash[0]._index + 1], vertex._latlng)) ? 1 : 0;
          }

          var insertIndex = hash[0]._index + beforeOrAfter,
              toRedraw = [];

          // Check if the closest marker has a twin
          if (hash[0]._hasTwin) {
            var otherVertex = (beforeOrAfter === 1) ? 1 : -1;
            if (hash[0]._index === 0 && otherVertex === -1) {
              otherVertex = this._map._layers[poly].editing._poly._latlngs.length - 1;
            } else if (hash[0]._index === this._map._layers[poly].editing._poly._latlngs.length - 1 && beforeOrAfter === 1) {
              otherVertex = 0
            } else if (hash[0]._index === this._map._layers[poly].editing._poly._latlngs.length - 1) {
              otherVertex = hash[0]._index - 1;
            } else {
              otherVertex = hash[0]._index + otherVertex;
            }
            var otherVertexHasTwin = map._layers[poly].editing._poly._latlngs[otherVertex]._hasTwin;
            /* If the vertex on the other side of the vertex to be inserted also has a twin, 
               add an identical marker to the shared polygon */
            if (otherVertexHasTwin) {
              (function() {
                var otherPoly;
                /* It is possible that both the vertices on either side of the vertex to be 
                  inserted have more than 1 shared layer */
                
                // If both vertices have more than one shared layer...
                if (hash[0]._twinLayers.length > 1 && this._map._layers[poly].editing._poly._latlngs[otherVertex]._twinLayers.length > 1) {

                  // ...find the intersection of their shared layers...
                  var touchingPolys = hash[0]._twinLayers.filter(function(n) {
                    return this._map._layers[poly].editing._poly._latlngs[otherVertex]._twinLayers.indexOf(n) != -1
                  }.bind(this));

                  if (touchingPolys.length > 1) {
                    touchingPolys = touchingPolys.filter(function(n) {
                      return hash[0]._twinLayers.indexOf(n) === -1;
                    });
                  }
                  if (touchingPolys.length === 0) {
                    return;
                  }
                  
                  otherPoly = touchingPolys[0];

                // If the closest vertex has > 1 shared layer, but the other vertex does not, use the other vertex's shared layer
                } else if (hash[0]._twinLayers.length > 1 && this._map._layers[poly].editing._poly._latlngs[otherVertex]._twinLayers.length === 1) {
                  otherPoly = this._map._layers[poly].editing._poly._latlngs[otherVertex]._twinLayers[0];
                // Under more conditions, this will be true. Simply use the shared layer of the closest marker
                } else if (hash[0]._twinLayers.length === 1 && this._map._layers[poly].editing._poly._latlngs[otherVertex]._twinLayers.length === 1) {
                  return;
                } else if (hash[0]._twinLayers.length === 1) {
                  otherPoly = hash[0]._twinLayers[0];
                } else {
                  console.log("Something went wrong....");
                }
                //var otherPoly = hash[0]._twinLayer;
                var otherHash = this.sortPolygon(otherPoly, vertex);

                var otherMarkerToInsert = {
                  "lat": vertex._latlng.lat,
                  "lng": vertex._latlng.lng,
                  "layer": otherPoly,
                  "_hasTwin": true,
                  "_twin": {
                    "layer": poly
                  },
                  "_twinLayers": otherHash[0]._twinLayers
                };

                if (otherHash[0]._index === this._map._layers[otherPoly].editing._poly._latlngs.length - 1) {
                  var otherBeforeOrAfter = (this._isBetween(this._map._layers[otherPoly].editing._poly._latlngs[otherHash[0]._index], this._map._layers[otherPoly].editing._poly._latlngs[otherHash[0]._index - 1], vertex._latlng)) ? 0 : 1;
                } else {
                  var otherBeforeOrAfter = (this._isBetween(this._map._layers[otherPoly].editing._poly._latlngs[otherHash[0]._index], this._map._layers[otherPoly].editing._poly._latlngs[otherHash[0]._index + 1], vertex._latlng)) ? 1 : 0;
                }

                var otherInsertIndex = otherHash[0]._index + otherBeforeOrAfter;

                markerToInsert._hasTwin = true;
                markerToInsert._twinLayers = hash[0]._twinLayers;

                this._map._layers[otherPoly].editing._poly._latlngs.splice(otherInsertIndex, 0, otherMarkerToInsert);
                toRedraw.push(otherPoly);

              }).bind(this)();
            }

          } 
          this._map._layers[poly].editing._poly._latlngs.splice(insertIndex, 0, markerToInsert);
          toRedraw.push(poly);

          // Find all overlapping vertexes
          this.reset();
          this.redrawPolys(toRedraw);

        }

      }.bind(this));

      setTimeout(function() {
        Object.keys(this._map._layers).forEach(function(d, i) {
          if (this._map._layers[d]._latlngs) {
            this._map._layers[d].adjacencies = [];
          }
        }.bind(this));
        this.missingVertices();
      }.bind(this), 500);
    },

    _findAdjacencies: function(type, target) {
      var layers = [];
      target.adjacencies.forEach(function(e) {
        if (layers.indexOf(e.toString()) < 0) {
          layers.push(e.toString());
        }
        // Recursively disable layers
        this._map._layers[e].adjacencies.forEach(function(j) {
          if (layers.indexOf(j.toString()) < 0) {
            layers.push(j.toString());
          }
        });
      }.bind(this));
      if (layers.indexOf(target._leaflet_id.toString()) < 0) {
        layers.push(target._leaflet_id.toString());
      }

      // Enable or disable
      if (type === "enable") {
        this.enableEditing(layers);
      } else {
        this.disableEditing(layers);
      }
    },

    enableEditing: function(layers) {
      layers.forEach(function(d) {
        this._map._layers[d].editing.addHooks();
        this._map._layers[d].editing._enabled = true;
        this._map._layers[d].setStyle({
          fillColor: '#fff',
          color: '#666',
          opacity: 0.5
        });
      }.bind(this));
    },

    disableEditing: function(layers) {
      layers.forEach(function(d) {
        this._map._layers[d].editing.removeHooks();
        this._map._layers[d].editing._enabled = false;
        this._map._layers[d].setStyle({
          fillColor: '#777',
          color: '#444',
          opacity: 0.8
        });
      }.bind(this));
    },

    _distance: function(a, b) {
      function toRadians(degree) {
        return degree * Math.PI / 180;
      }

      var dLat = toRadians(b.lat - a.lat),
          dLon = toRadians(b.lng - a.lng);

      var x = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat));

      var c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));

      // Return distance in radians
      return c;
    },

    _isBetween: function(a, b, c) {
      var epsilon = this._distance(a, b);

      var crossProduct = (c.lat - a.lat) * (b.lng - a.lng) - (c.lng - a.lng) * (b.lat - a.lat);
      if (Math.abs(crossProduct) > epsilon) {
        return false;
      }

      var dotProduct = (c.lng - a.lng) * (b.lng - a.lng) + (c.lat - a.lat) * (b.lat - a.lat);
      if (dotProduct < 0) {
        return false;
      }

      var squaredLengthBA = (b.lng - a.lng) * (b.lng - a.lng) + (b.lat - a.lat) * (b.lat - a.lat);
      if (dotProduct > squaredLengthBA) {
        return false;
      }

      return true;
    },

    sortPolygon: function(poly, vertex) {
      var hash = [];
      // Find the distance between the added point and all existing vertices
      this._map._layers[poly].editing._poly._latlngs.forEach(function(d) {
        var item = {
          "_index": d._index,
          "_hasTwin": d._hasTwin,
          "dist": this._distance(d, vertex._latlng)
        };
        // If the vertex has a twin, record which layer it belongs to
        if (d._hasTwin) {
          item["_twinLayers"] = d._twinLayers;
        }

        hash.push(item);
      }.bind(this));

      // Sort by distance
      hash = hash.sort(function(a, b) {
        return a.dist - b.dist;
      });

      return hash;
    },

    redrawPolys: function(polys) {
      // polys is an array of _leaflet_ids
      polys.forEach(function(d) {
        if (this._map._layers[d].editing.enabled) {
          this._map._layers[d].editing.removeHooks();
          this._map._layers[d].editing.addHooks();
        }
      }.bind(this));
    },

    reset: function() {
      Object.keys(this._map._layers).forEach(function(d, i) {
        Object.keys(this._map._layers).forEach(function(x, y) {
          if (this._map._layers[d]._latlngs && this._map._layers[x]._latlngs) {
            this._map._layers[d]._latlngs.forEach(function(a, b) {
              a._layer = d;
              a._index = b;
              this._map._layers[x]._latlngs.forEach(function(c, e) {
                if (a.lat === c.lat && a.lng === c.lng) {
                  if (d !== x) {
                    a._hasTwin = true;
                    if (!a._twinLayers) {
                      a._twinLayers = [];
                    }
                    if (a._twinLayers.indexOf(x) < 0) {
                      a._twinLayers.push(x);
                    }

                    c._hasTwin = true;
                    if (!c._twinLayers) {
                      c._twinLayers = [];
                    }
                    if (c._twinLayers.indexOf(d) < 0) {
                      c._twinLayers.push(d);
                    }

                    if (this._map._layers[d].adjacencies.indexOf(x) < 0) {
                      this._map._layers[d].adjacencies.push(x);
                    }
                    if (this._map._layers[x].adjacencies.indexOf(d) < 0) {
                      this._map._layers[x].adjacencies.push(d);
                    }
                  }
                }
              }.bind(this));
            }.bind(this));
          }
        }.bind(this));
      }.bind(this));
    },

    addMissingVertex: function(layerA, layerB, a, b, c) {
      if (this._isBetween(a, this._map._layers[layerA]._latlngs[b + 1], c)) {
        var A = [a.lat, a.lng],
            B = [this._map._layers[layerA]._latlngs[b + 1].lat, this._map._layers[layerA]._latlngs[b + 1].lng],
            C = [c.lat, c.lng];

        var intAC = A.filter(function(n) {
          return C.indexOf(n) != -1;
        });

        var intBC = B.filter(function(n) {
          return C.indexOf(n) != -1;
        });

        if (intAC.length === 1 && intBC.length === 1) {
          var toAdd = {
            "lat": c.lat,
            "lng": c.lng,
            "layer": layerA,
            "_twinLayers": [layerA, layerB],
            "_hasTwin": true
          }
          this._map._layers[layerA]._latlngs.splice(b + 1, 0, toAdd);
        }
      }
    },

    missingVertices: function() {
      Object.keys(this._map._layers).forEach(function(d) {
        Object.keys(this._map._layers).forEach(function(x) {
          if (this._map._layers[d]._latlngs && this._map._layers[x]._latlngs && d != x) {

            this._map._layers[d]._latlngs.forEach(function(a, b) {
              this._map._layers[x]._latlngs.forEach(function(c, e) {

                if (b + 1 <= this._map._layers[d]._latlngs.length - 1 && b < this._map._layers[d]._latlngs.length - 1) {
                  this.addMissingVertex(d, x, a, b, c);

                } else if (b === this._map._layers[d]._latlngs.length - 1) {
                  this.addMissingVertex(d, x, a, -1, c)
                } 
              }.bind(this));
            }.bind(this));

          }
        }.bind(this));
      }.bind(this));
      this.reset();
    }

  }; // End L.Edit.Topology

} else {
  throw "Error: leaflet.draw.topology requires Leaflet.Draw and Leaflet.Snap";
}
