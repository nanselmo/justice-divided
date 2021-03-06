// define map
var districtMap = L.map('district-map').setView([41.835, -87.7], 10);
districtMap.scrollWheelZoom.disable();

base_map_style = [
  {
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#f5f5f5"
      }
    ]
  },
  {
    "elementType": "labels.icon",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#616161"
      }
    ]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#f5f5f5"
      }
    ]
  },
  {
    "featureType": "administrative.land_parcel",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#bdbdbd"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#eeeeee"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#e5e5e5"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9e9e9e"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#ffffff"
      }
    ]
  },
  {
    "featureType": "road.arterial",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#dadada"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#616161"
      }
    ]
  },
  {
    "featureType": "road.local",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9e9e9e"
      }
    ]
  },
  {
    "featureType": "transit.line",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#e5e5e5"
      }
    ]
  },
  {
    "featureType": "transit.station",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#eeeeee"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#c9c9c9"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9e9e9e"
      }
    ]
  }
]

function sumProperty(boundaries, property) {
  nByDistrict = boundaries.features.map(function(feature) { 
    return parseInt(feature.properties[property]);
  });
  return nByDistrict.reduce(function(a, b) {
    return a + b;
  }, 0);
}

function makeRatios(boundaries) {
  var ratios = {};

  boundaries.features.map(function(feature) {
    num_arrests_black = parseInt(feature.properties.num_arrests_black);
    num_youth_black = parseInt(feature.properties.num_youth_black);
    pBlackArrests = num_arrests_black / num_youth_black;
    ratios[feature.properties.dist_num] = pBlackArrests / pAllArrests;
  })

  return ratios;
}

var googleLayer = new L.Google('ROADMAP', {mapOptions: {styles: base_map_style}});
districtMap.addLayer(googleLayer);

// load district shapes
$.getJSON('data/output/police_district_profiles.geojson', function(districtBoundaries) {

  // determine citywide odds of arrest
  totalArrests = sumProperty(districtBoundaries, 'num_arrests');
  totalYouth = sumProperty(districtBoundaries, 'num_youth');
  pAllArrests = totalArrests / totalYouth;

  // determine of arrest for black youth & divide by citywide odds to make odds ratios
  districtOddsRatios = makeRatios(districtBoundaries);
  buckets = [1.5, 2.25, 3, 3.75, 4.5];

  // define conditional styling
  function getColor(d) {
    return d > buckets[3] ? '#bd0026' :
           d > buckets[2] ? '#f03b20' :
           d > buckets[1] ? '#fd8d3c' :
           d > buckets[0] ? '#fecc5c' :
                            '#ffffb2';
  }

  function getStyle(feature) {
    return {
        weight: 2,
        color: '#fff',
        fillColor: getColor(districtOddsRatios[feature.properties.dist_num]),
        fillOpacity: 0.75
    };
  }

  // add districts
  districtLayer = L.geoJson(districtBoundaries, {
    style: getStyle, 
    onEachFeature: enableHighlight
  }).addTo(districtMap);

  // add legend
  var legend = L.control({position: 'topright'});

  legend.onAdd = function (map) {

      var div = L.DomUtil.create('div', 'info legend');

      div.innerHTML = '<strong>Multiplier</strong><br />'

      for (var i = 0; i < buckets.length; i++) {
        if ( !i ) { // first
          label = '< ' + buckets[i].toFixed(1) + '<br />'; 
        } else if ( i == buckets.length - 1 ) { // last
          label = '> ' + buckets[i - 1].toFixed(1);
        } else { // in-between
          label = buckets[i - 1].toFixed(1) + '+<br />';
        }
        div.innerHTML +=
          '<i style="background:' + getColor(buckets[i]) + '"></i> ' + label
      }

      return div;
  };

  legend.addTo(districtMap);

  fillInstructions();

});

// interactivity
function enableHighlight(feature, layer) {
  layer.on({
    click: highlightFeature,
    mouseover: highlightFeature,
    mouseout: resetHighlight
  });
}

function highlightFeature(e) {
  var layer = e.target;

  layer.setStyle( {color: '#333', weight: 7} );

  if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
    layer.bringToFront();
  }

  fillSidebar(layer);
}

function resetHighlight(e) {
  districtLayer.resetStyle(e.target);
}

// search
var geocoder = new google.maps.Geocoder;

autocomplete = new google.maps.places.Autocomplete(document.getElementById("address"));

// do search on 
autocomplete.addListener('place_changed', function() {
  address = $('#address').val();
  locateAddress(geocoder, address);
})

$('#address').keypress(function(e) {
  if ( e.which == 13) {
    address = $('#address').val();
    locateAddress(geocoder, address);
  }
})

$('#search-district').click(function() {
  address = $('#address').val();
  locateAddress(geocoder, address);
});

function locateAddress(geocoder, address) {
  geocoder.geocode({'address': address}, function(results, status) {
    if (status === 'OK') {

      coord = results[0].geometry.location;
      lat = coord.lat();
      lng = coord.lng();
    	district = leafletPip.pointInLayer(
      	[lng, lat], districtLayer, first=true
      )[0]
      updateMap(district);
      fillSidebar(district);
      
    } else { // invalid address

    	fillInstructions();
      $('#map-search').after('<span id="error"><i class="fa fa-fw fa-exclamation-triangle" aria-hidden="true"></i> Oops! We couldn\'t find that address.</span><br />');

    }
  });
}

function updateMap(district) {
  if ( district ) {

    districtNumber = district.feature.properties.dist_num;
    districtLayer.eachLayer(function(layer) {
      if ( layer.feature.properties.dist_num ==  districtNumber) {    
        highlightFeature({'target': layer}); 
      } else {
        resetHighlight({'target': layer});
      }
    })

  } else {

    districtLayer.eachLayer(function(layer) {
      resetHighlight({'target': layer})
    });

  }
}

// sidebar

function generateData(district) {
  return [[
    parseFloat(district.feature.properties.pct_youth_black) * 100, 
    parseFloat(district.feature.properties.pct_arrests_black) * 100
  ], [
    parseFloat(district.feature.properties.pct_youth_hispanic) * 100, 
    parseFloat(district.feature.properties.pct_arrests_hispanic) * 100
  ], [ 
    parseFloat(district.feature.properties.pct_youth_white) * 100, 
    parseFloat(district.feature.properties.pct_arrests_white) * 100
  ]];
}

function fillInstructions() {
	template = $('#instructions').html();
	content = ejs.render(template);
  $('#district-found').html(content);
	ChartHelper.make_detail_chart([
    [41.93, 79],
    [43.18, 17],
    [14.88, 3]
  ], city = true);
};

function fillSidebar(dataObj) {

    try { // fill district info

      distNum = dataObj.feature.properties.dist_num;
      color = dataObj._options.style(dataObj.feature).fillColor;
      data = generateData(dataObj);

      dataObj.feature.properties['odds_ratio'] = districtOddsRatios[distNum];
      result = dataObj.feature.properties;
      template = $('#statistics-template').html();
      content = ejs.render(template, {result: result});
      $('#district-found').html(content);

      ChartHelper.make_detail_chart(data);
      $('.highlight').css({'color': color});
      $('#reset').click(function() {
        updateMap();
        fillInstructions();
      });

    } catch (err) { // address isn't in our map

      fillInstructions();
      $('#map-search').after('<span id="error"><i class="fa fa-fw fa-exclamation-triangle" aria-hidden="true"></i> Oops! We couldn\'t find that address.</span><br />');

    }

}