import { HttpClient } from '@angular/common/http';
import { AfterViewInit, Component, OnInit } from '@angular/core';
import { mergeMap, Observable, of } from 'rxjs';
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
  public geoJsonCircleLayer: any;
  public layerControl: any;
  public layerGroup: any = new L.LayerGroup();
  private osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  });

  private baseMaps = {
    "OpenStreetMap": this.osm,
  };

  private geoJsonAssets: any[] = [
    { friendlyName: 'Salvage Yards', path: 'assets/SalvageYardsRegions_5.json', style: { fillColor: "yellow", weight: 2, fillOpacity: 0.85 } }, 
    { friendlyName: 'Counties', path: 'assets/cb_2017_us_county_5m_4.json', style: { fillColor: "#0000FF", weight: 2, fillOpacity: 0.15 } },
    { friendlyName: 'Midwest Region', path: 'assets/cb_2017_us_state_500k_midwest_3.json', style: { fillColor: "#FFC300", weight: 3, fillOpacity: 0.25 } },
    { friendlyName: 'East Region', path: 'assets/cb_2017_us_state_500k_east_2.json', style: { fillColor: "#008080", weight: 2, fillOpacity: 0.25 } },
    { friendlyName: 'West Region', path: 'assets/cb_2017_us_state_500k_west_1.json', style: { fillColor: "#780000", weight: 2, fillOpacity: 0.25 } },
    { friendlyName: 'States', path: 'assets/cb_2017_us_state_500k_0.json', style: { fillColor: "#0000FF", weight: 2, fillOpacity: 0.15 } },
  ];
  
  private salvageYardsLayerData: any;

  constructor(private httpClient: HttpClient) {
  }

  ngOnInit() {
    this.map = L.map('map', {
      center: [39.73, -104.99],
      zoom: 5,
      layers: [this.osm]
    });

    this.layerGroup.addTo(this.map);
    this.layerControl = L.control.layers(this.baseMaps).addTo(this.map);

    this.geoJsonAssets.forEach(item => {
      this.getJSON(item).subscribe(results => {
        if (results.group === 'Salvage Yards') {
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
          }).addTo(this.map);

          results.data.features.forEach((item) => {
            var feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [item.geometry.coordinates[0], item.geometry.coordinates[1]]
                },                
                "properties": "junk" //item.properties
            };
            this.salvageYardsLayerData.addData(feature);
            //this.layerControl.addOverlay(this.layerData, results.group);
          });
        } else {
          const geoJSONLayer = L.geoJSON(results.data, { style: (feature) => results.style }).addTo(this.map);
          this.layerControl.addOverlay(geoJSONLayer, results.group);
        }
        
      });
    });
  }

  public ngAfterViewInit() {
    this.map.on('click', (e) => { 
      if (this.geoJsonCircleLayer) {
        // remove previous circle
        this.map.removeLayer(this.geoJsonCircleLayer);
      }

      let center = [e.latlng.lng, e.latlng.lat];
      let radius = 100;
      let options = {steps: 25, units: 'miles' as Units, properties: {foo: 'bar'}};
      let circle = turf.circle(center, radius, options);
      this.geoJsonCircleLayer = L.geoJson(circle).addTo(this.map);
        
      var ptsWithin4 = turf.within(this.salvageYardsLayerData.toGeoJSON(), this.geoJsonCircleLayer);
      console.log(`${ptsWithin4.features.length} points in this poly`);
      alert(`results ${JSON.stringify(ptsWithin4)}`);
    });
  }

  public getJSON(geoJsonAsset: any): Observable<any> {
    return this.httpClient.get(geoJsonAsset.path).pipe(
      mergeMap(data => { return of({ group: geoJsonAsset.friendlyName, data: data, style: geoJsonAsset.style })})
    );
  }
}
