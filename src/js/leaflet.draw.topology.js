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

    for (var i = 0, len = latlngs.length; i < len; i++) {
      if (this._primary) {
        marker = this._createMarker(latlngs[i], i);
        marker.on('click', this._onMarkerClick, this);
        this._markers.push(marker);
      } else {
        if (latlngs[i]._twinLayers) {
          for (var j = 0; j < latlngs[i]._twinLayers.length; j++) {
            if (this._poly._map._layers[latlngs[i]._twinLayers[j]].editing._primary) {
              marker = this._createMarker(latlngs[i], i);
              marker.on('click', this._onMarkerClick, this);
              this._markers.push(marker);
            }
          }
        }
      }
    }
    var markerLeft, markerRight;

    for (var i = 0, j = len - 1; i < len; j = i++) {
      if (i === 0 && !(L.Polygon && (this._poly instanceof L.Polygon))) {
        continue;
      }

      markerLeft = this._markers[j];
      markerRight = this._markers[i];

      this._updatePrevNext(markerLeft, markerRight);
    }
    this._updateIndexes();
  };

  L.Edit.Poly.prototype._createMarker = function(latlng, index) {
    var marker = new L.Marker(latlng, {
      draggable: true,
      icon: this.options.icon
    });
    marker._origLatLng = latlng;
    marker._index = (index) ? index : latlng._index;
    marker._layer = latlng._layer;

    if (latlng._hasTwin) {
      marker._hasTwin = true;
      marker._twinLayers = latlng._twinLayers
    }

    if (latlng._isMiddle) {
      marker._isMiddle = true;
    }
    /*marker.on('mouseover', function(d) {
      console.log("layer ", d.target._layer, " -- ", d.target._index);
    });*/
    marker.on('drag', this._onMarkerDrag, this);
    marker.on('dragend', this._fireEdit, this);

    this._markerGroup.addLayer(marker);

    return marker;
  };

  L.Edit.Poly.prototype._onMarkerClick = function(e) {
    /* For now, just disable the ability to remove markers,
       but eventually you should be able to remove markers,
       including those that have shared vertices */
  };

  L.Edit.Poly.prototype._onMarkerDrag = function(e) {
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
  L.Handler.MarkerSnap.prototype._updateSnap = function(marker, layer, latlng) {
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
    init: function(map, layer, options, restricted, callback) {
      this._map = map;
      this._map._editStatus = {
        "layer": null,
        "editing": false
      };

      this._layers = layer;

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
      this.marker.snapediting.addGuideLayer(layer);
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
        /*layer._layers[j].on("contextmenu", function(d) {
          console.log(d.target._latlngs);
        });*/
        layer._layers[j].on("click", function(d) {
          // When a polygon is clicked, toggle editing for it and all adjacent polygons
          // If editing is already toggled, disable editing
          if (restricted) {
            if (d.target.editing._enabled) {  
              if (this._map._snapLayer) {
                var newMarker = new L.Marker(this.marker.getLatLng(), { 
                  icon: L.Edit.Poly.prototype.options.icon, 
                  draggable: true
                });
                this._map.fire('marker-created', this.marker);
              } 
            }
          } else {
            if (d.target.editing._enabled) { 
              // If editing is enabled and the guide is snapped to this layer, add a new vertex
              if (this._map._snapLayer) {
                var newMarker = new L.Marker(this.marker.getLatLng(), { 
                  icon: L.Edit.Poly.prototype.options.icon, 
                  draggable: true
                });
                this._map.fire('marker-created', this.marker);
              // If the guide is not snapped to this layer...
              } else {
                // ...and the layer being edited was clicked
                if (d.target.editing._primary) {
                  this._map.removeLayer(this.marker);
                  this.marker.snapediting.disable();
                  this._findAdjacencies("disable", d.target);
                //
                } else {
                  this.disableEditing(this._map._editStatus.layer._leaflet_id, this._map._editStatus.layer.adjacencies);
                  this._findAdjacencies("enable", d.target);
                }
              }
            // If editing is not enabled on this layer...
            } else {
              if (this._map._editStatus.editing) {
                this.disableEditing(this._map._editStatus.layer._leaflet_id, this._map._editStatus.layer.adjacencies);
                this._findAdjacencies("enable", d.target);
              } else {
                this._map.addLayer(this.marker);
                this.marker.snapediting.enable();
                this._findAdjacencies("enable", d.target);
              }
                
            }
          }
  
        }.bind(this));
      }.bind(this));

      layer.addTo(this._map);

      this._map.on('marker-created', function(vertex) {
        // Make sure marker is snapped to a polygon
        if (this._map._snapLayer) {
          var poly = this._map._snapLayer,
              toRedraw = [];
          //console.log("snapped to ", poly);
          var markerToInsert = {
            "lat": vertex._latlng.lat,
            "lng": vertex._latlng.lng
          };

          var polyCoordinates = this._map._layers[poly].editing._poly._latlngs;
          // Check if the added vertex is between each pair of latlngs in the polygon
          for (var i = 0; i < polyCoordinates.length; i++) {
            // Make sure the current index + 1 isn't greater than the length of the latlng array
            if (i + 1 <= polyCoordinates.length - 1) {
              if (this._isBetween(polyCoordinates[i], polyCoordinates[i + 1], vertex._latlng)) {
                var vertex1 = i,
                    vertex2 = i + 1;
                break;
              }
            // Otherwise, check between last vertex and first vertex
            } else {
              if (this._isBetween(polyCoordinates[i], polyCoordinates[0], vertex._latlng)) {
                var vertex1 = i,
                    vertex2 = 0;
                break;
              }
            }
          }

          /* If both vertices either side of the new vertex have a twin or twins, 
             we need to insert a vertex on that layer */
          if (polyCoordinates[vertex1]._hasTwin && polyCoordinates[vertex2]._hasTwin) {
            var otherMarker = (function() {
              // Check if each has more than one twin layer
              if (polyCoordinates[vertex1]._twinLayers.length > 1 && polyCoordinates[vertex2]._twinLayers.length > 1) {
                // ...find the intersection of their shared layers...
                //console.log("1 twin layers - ", polyCoordinates[vertex1]._twinLayers);
                //console.log("2 twin layers - ", polyCoordinates[vertex2]._twinLayers);
                var intersection = polyCoordinates[vertex1]._twinLayers.filter(function(n) {
                  return polyCoordinates[vertex2]._twinLayers.indexOf(n) != -1
                }.bind(this));
                // If there are multiple intersection layers, remove layer snapped to
                if (intersection.length > 1) {
                  intersection.splice(intersection.indexOf(poly.toString()), 1);
                  var touchingPolys = intersection;
                } else {
                  var touchingPolys = intersection;
                }

                // If there are no touching polys...
                if (touchingPolys.length === 0) {
                  // find union
                  var union = polyCoordinates[vertex1]._twinLayers.filter(function(n) {
                    return polyCoordinates[vertex2]._twinLayers.indexOf(n) > -1
                  }.bind(this));
                  if (union.length === intersection.length) {
                    union.splice(union.indexOf(poly.toString()), 1);
                    var otherPoly = union[0];
                  } else {
                    // There is only one polygon at this point
                    return;
                  }
                } else {
                  var otherPoly = touchingPolys[0];
                }

              } else if (polyCoordinates[vertex1]._twinLayers.length > 1 && polyCoordinates[vertex2]._twinLayers.length === 1) {
                var otherPoly = polyCoordinates[vertex2]._twinLayers[0];
              } else if (polyCoordinates[vertex1]._twinLayers.length === 1 && polyCoordinates[vertex2]._twinLayers.length > 1) {
                var otherPoly = polyCoordinates[vertex1]._twinLayers[0];
              } else if (polyCoordinates[vertex1]._twinLayers.length === 1 && polyCoordinates[vertex2]._twinLayers.length === 1) {
                return;
              } 

              var otherPolyCoordinates = this._map._layers[otherPoly].editing._poly._latlngs;

              // Check if the added vertex is between each pair of latlngs in the other polygon
              for (var i = 0; i < otherPolyCoordinates.length; i++) {
                // Make sure the current index + 1 isn't greater than the length of the latlng array
                if (i + 1 <= otherPolyCoordinates.length - 1) {
                  if (this._isBetween(otherPolyCoordinates[i], otherPolyCoordinates[i + 1], vertex._latlng)) {
                    var otherVertex1 = i,
                        otherVertex2 = i + 1;
                    break;
                  }
                // Otherwise, check between last vertex and first vertex
                } else {
                  if (this._isBetween(otherPolyCoordinates[i], otherPolyCoordinates[0], vertex._latlng)) {
                    var otherVertex1 = i,
                        otherVertex2 = 0;
                    break;
                  }
                }
              }

              var otherMarkerToInsert = {
                "lat": vertex._latlng.lat,
                "lng": vertex._latlng.lng,
                "_hasTwin": true,
                "_twin": {
                  "layer": poly
                },
                "_twinLayers": [poly.toString(), otherPoly]
              };

              return {
                "otherPoly": otherPoly, 
                "otherPolyCoordinates": otherPolyCoordinates, 
                "otherMarkerToInsert": otherMarkerToInsert, 
                "otherVertex2": otherVertex2
              };

            }).bind(this)();
          }

          if (otherMarker) {
            if (!this._map._layers[otherMarker.otherPoly].editing._primary && !this._map._layers[poly].editing._primary) {
              return;
            }
            markerToInsert._hasTwin = true;
            markerToInsert._twinLayers = [poly.toString(), otherMarker.otherPoly];

            otherMarker.otherPolyCoordinates.splice(otherMarker.otherVertex2, 0, otherMarker.otherMarkerToInsert);
            toRedraw.push(otherMarker.otherPoly);

            // Splice the new latlng into the polygon the new marker snapped to
            polyCoordinates.splice(vertex2, 0, markerToInsert);

            // Add the snapped polygon to the redraw queue
            toRedraw.push(poly);

            // Find all overlapping vertexes
            this.match(toRedraw);

            // Redraw all affected polygons
            this.redrawPolys(toRedraw);
          } else if (!map._layers[poly].editing._primary) {
            return;
          } else {
            // No other layer to add a vertex to
            // Splice the new latlng into the polygon the new marker snapped to
            polyCoordinates.splice(vertex2, 0, markerToInsert);

            // Add the snapped polygon to the redraw queue
            toRedraw.push(poly);

            // Find all overlapping vertexes
            this.match(toRedraw);

            // Redraw all affected polygons
            this.redrawPolys(toRedraw);
          }

        } // end if (this._map.snapLayer)

      }.bind(this));

      setTimeout(function() {
        Object.keys(this._map._layers).forEach(function(d, i) {
          if (this._map._layers[d]._latlngs) {
            this._map._layers[d].adjacencies = [];
          }
        }.bind(this));
        this.missingVertices(callback);
      }.bind(this), 200);
    },

    _findAdjacencies: function(type, target) {
      var layers = [];
      target.adjacencies.forEach(function(e) {
        if (e !== target._leaflet_id && layers.indexOf(e.toString()) < 0) {
          layers.push(e.toString());
        }
      }.bind(this));

      // Enable or disable
      if (type === "enable") {
        this.enableEditing(target._leaflet_id, layers);
      } else {
        this.disableEditing(target._leaflet_id, layers);
      }
    },

    enableEditing: function(target, layers) {
      this._map._editStatus = {
        "layer": this._map._layers[target],
        "editing": true
      };

      this._map._layers[target].editing._enabled = true;
      this._map._layers[target].editing._primary = true;
      this._map._layers[target].editing.addHooks();
      this._map._layers[target].setStyle({
        fillColor: '#eee',
        color: '#666',
        opacity: 0.5
      });

      layers.forEach(function(d) {
        if (d !== target.toString()) {
          this._map._layers[d].editing._enabled = true;
          this._map._layers[d].editing._neighbor = true;
          this._map._layers[d].editing.addHooks();
          this._map._layers[d].setStyle({
            fillColor: '#777',
            color: '#666',
            opacity: 0.8
          });
        }
          
      }.bind(this));
    },

    destroy: function() {
      delete this.marker;
      this._map.off('mousemove');

      this._map.off('snap');

      this._map.off('unsnap');
      this._map.off('marker-created');
    },

    disableEditing: function(target, layers) {
      this._map._editStatus = {
        "layer": null,
        "editing": false
      };

      this._map._layers[target].editing._enabled = false;
      this._map._layers[target].editing._primary = false;
      this._map._layers[target].editing.removeHooks();
      this._map._layers[target].setStyle({
        fillColor: '#000',
        color: '#444',
        opacity: 0.8
      });

      layers.forEach(function(d) {
        this._map._layers[d].editing._enabled = false;
        this._map._layers[d].editing._neighbor = false;
        this._map._layers[d].editing.removeHooks();
      }.bind(this));

      this._layers.setStyle({
        fillColor: '#000',
        color: '#444',
        opacity: 0.95
      });
    },

    /* Largely borrowed from the excellent Turf.js 
       https://github.com/Turfjs/turf-distance/blob/master/index.js */
    _distance: function(a, b) {
      function toRadians(degree) {
        return degree * Math.PI / 180;
      }

      //var R = 57.2957795,
      var R = 1,
          dLat = toRadians(b.lat - a.lat),
          dLon = toRadians(b.lng - a.lng);

      var x = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat));

      var c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));

      // Return distance in degrees
      return (R * c)/2;
    },

    // Is c beween a and b?
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

    redrawPolys: function(polys) {
      // polys is an array of _leaflet_ids
      polys.forEach(function(d) {
        if (this._map._layers[d].editing.enabled) {
          this._map._layers[d].editing.removeHooks();
          this._map._layers[d].editing.addHooks();
        }
      }.bind(this));
    },

    reset: function(callback) {
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

                    if (this._map._layers[d].adjacencies.indexOf(x.toString()) < 0) {
                      this._map._layers[d].adjacencies.push(x.toString());
                    }
                    if (this._map._layers[x].adjacencies.indexOf(d.toString()) < 0) {
                      this._map._layers[x].adjacencies.push(d.toString());
                    }
                  }
                }
              }.bind(this));
            }.bind(this));
          }
        }.bind(this));
      }.bind(this));
      if (callback) {
        callback();
      }
    },

    match: function(layers) {
      for (var i = 0; i < layers.length; i++) {
        layers[i] = layers[i].toString();
      }
      layers.forEach(function(d, i) {
        layers.forEach(function(x, y) {
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

                  if (this._map._layers[d].adjacencies.indexOf(x.toString()) < 0) {
                    this._map._layers[d].adjacencies.push(x.toString());
                  }
                  if (this._map._layers[x].adjacencies.indexOf(d.toString()) < 0) {
                    this._map._layers[x].adjacencies.push(d.toString());
                  }
                }
              }
            }.bind(this));
          }.bind(this));
        }.bind(this));
      }.bind(this));
    },

    // (layerA, layerB, layerA-latlng, layerA-latlng-index, layerB-latlng)
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

    missingVertices: function(callback) {
      Object.keys(this._map._layers).forEach(function(d) {
        Object.keys(this._map._layers).forEach(function(x) {
          /* Make sure the layer is indeed a polygon (_latlngs) and that 
             we are not comparing a given layer to itself (d != x) */
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
      this.reset(callback);
    },

    editLayer: function(layer) {
      this._map.addLayer(this.marker);
      this.marker.snapediting.enable();
      this._findAdjacencies("enable", layer);
    }

  }; // End L.Edit.Topology

} else {
  throw "Error: leaflet.draw.topology requires Leaflet.Draw and Leaflet.Snap";
}
