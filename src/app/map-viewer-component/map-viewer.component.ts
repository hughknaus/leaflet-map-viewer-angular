import { HttpClient } from '@angular/common/http';
import { AfterViewInit, Component, OnInit } from '@angular/core';
import { filter, mergeMap, Observable, of } from 'rxjs';
import * as turf from '@turf/turf';
import { Units, Feature, FeatureCollection, Point, point } from '@turf/turf';
declare const L:any;

@Component({
  selector: 'map-viewer',
  templateUrl: './map-viewer.component.html',
  styleUrls: ['./map-viewer.component.scss']
})
export class MapViewerComponent implements OnInit, AfterViewInit {
  public leafletTestText = 'MapViewerComponent Prototype';
  public map: any;
  public geoJsonRadiusLayer: any;
  public layerControl: any;
  public salvageYardsGroup: any = new L.LayerGroup();
  public nearbySalvateYardsGroup: any = new L.LayerGroup();
  public layerGroup: any = new L.LayerGroup();
  private salvageYardsLayerData: any;
  private osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  });

  private baseMaps = {
    "OpenStreetMap": this.osm,
  };

  private overlayMaps = {
    "Salvage Yards": this.salvageYardsGroup,
    "Nearby": this.nearbySalvateYardsGroup,
  };

  private salvageYardsLayerAssets: any[] = [
    { friendlyName: 'Salvage Yards', path: 'assets/SalvageYardsRegions_5.json', style: { fillColor: "yellow", weight: 2, fillOpacity: 0.85 } }
  ];

  private otherLayerAssets: any[] = [ 
    { friendlyName: 'Counties', path: 'assets/cb_2017_us_county_5m_4.json', style: { fillColor: "#0000FF", weight: 2, fillOpacity: 0.15 } },
    { friendlyName: 'Midwest Region', path: 'assets/cb_2017_us_state_500k_midwest_3.json', style: { fillColor: "#FFC300", weight: 3, fillOpacity: 0.25 } },
    { friendlyName: 'East Region', path: 'assets/cb_2017_us_state_500k_east_2.json', style: { fillColor: "#008080", weight: 2, fillOpacity: 0.25 } },
    { friendlyName: 'West Region', path: 'assets/cb_2017_us_state_500k_west_1.json', style: { fillColor: "#780000", weight: 2, fillOpacity: 0.25 } },
    { friendlyName: 'States', path: 'assets/cb_2017_us_state_500k_0.json', style: { fillColor: "#0000FF", weight: 2, fillOpacity: 0.15 } },
  ];

  private displayRadius = (e: any) => {
    if (this.geoJsonRadiusLayer) {
      // remove previous circle
      this.map.removeLayer(this.geoJsonRadiusLayer);
    }

    let center = [e.latlng.lng, e.latlng.lat];
    let radius = 50; // miles
    let options = {steps: 25, units: 'miles' as Units, properties: {foo: 'bar'}};
    let circle = turf.circle(center, radius, options);
    let circleJson = L.geoJson(circle);
    this.geoJsonRadiusLayer = circleJson.addTo(this.map);
    
    var data = this.salvageYardsLayerData.toGeoJSON();
    var pts: turf.Position[] = turf.coordAll(data);
    var turfPoints = turf.points(pts);

    var ptsWithin = turf.pointsWithinPolygon(turfPoints, circle);
    console.log(`${ptsWithin.features?.length} points in this poly`);
    console.log(`results`, ptsWithin);
    
    var myLayer = this.salvageYardsGroup.getLayers()[0];
    var subLayers = myLayer.getLayers();
    var matchingLayers = subLayers.filter((layer) => 
      ptsWithin.features.some((feature) => 
        feature.geometry.coordinates[0] === layer.feature.geometry.coordinates[0] &&
        feature.geometry.coordinates[1] === layer.feature.geometry.coordinates[1]
      )
    );

    this.nearbySalvateYardsGroup = new L.LayerGroup();
    matchingLayers.forEach((layer) => layer.options.fillColor = 'red'); 
    matchingLayers.addTo(this.nearbySalvateYardsGroup)
  }

  constructor(private httpClient: HttpClient) {
  }

  ngOnInit() {
    this.map = L.map('map', {
      center: [39.73, -104.99],
      zoom: 5,
      layers: [this.osm]
    })
    .on('click', this.displayRadius);

    this.layerGroup.addTo(this.map);
    this.layerControl = L.control.layers(this.baseMaps, this.overlayMaps).addTo(this.map);

    this.salvageYardsLayerAssets.forEach(item => {
      this.getJSON(item).subscribe(results => {
        this.salvageYardsLayerData = L.geoJSON(null, {
          pointToLayer: (feature, latLng) => { 

            if (feature.geometry.type === 'Point') {
              let iconOptions = {
                radius: 7,
                color: 'goldenrod',
                weight: 2,
                opacity: 1.0,
                fill: true,
                fillColor: 'yellow',
                fillOpacity: 0.8,
                fillRule: 'evenodd',
                renderer: L.svg(),
                interactive: true
              };

              return L.circleMarker(latLng, iconOptions)
                .bindPopup(`<div>
                  <b>${feature.properties["Salvage Yard"]}</b><br />
                  ${feature.properties["Address"]}<br />
                  ${feature.properties["City"]}, 
                  ${feature.properties["State"]} 
                  ${feature.properties["Zip"]}
                  </div>`)
                .openPopup();
            }
          },
          style: (feature) => results.style,
        });

        results.data.features.forEach((item) => {
          var feature = {
              "type": "Feature",
              "geometry": {
                  "type": "Point",
                  "coordinates": [item.geometry.coordinates[0], item.geometry.coordinates[1]]
              },                
              "properties": item.properties
          };
          this.salvageYardsLayerData.addData(feature);
        });

        this.salvageYardsLayerData.addTo(this.salvageYardsGroup);
      });
    });

    this.otherLayerAssets.forEach(item => {
      this.getJSON(item).subscribe(results => {
          const geoJSONLayer = L.geoJSON(results.data, { style: (feature) => results.style }).addTo(this.map);
          this.layerControl.addOverlay(geoJSONLayer, results.group);
      });
    });
  }

  public ngAfterViewInit() {
  }

  private getJSON(geoJsonAsset: any): Observable<any> {
    return this.httpClient.get(geoJsonAsset.path).pipe(
      mergeMap(data => { return of({ group: geoJsonAsset.friendlyName, data: data, style: geoJsonAsset.style })})
    );
  }
}
