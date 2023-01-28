import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { mergeMap, Observable, of } from 'rxjs';
import {} from '@turf/turf';
declare const L:any;

@Component({
  selector: 'map-viewer',
  templateUrl: './map-viewer.component.html',
  styleUrls: ['./map-viewer.component.scss']
})
export class MapViewerComponent implements OnInit {
  leafletTestText = 'MapViewerComponent Prototype';
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
   
  constructor(private httpClient: HttpClient) {
  }

  ngOnInit() {
    let map = L.map('map', {
      center: [39.73, -104.99],
      zoom: 5,
      layers: [this.osm]
    });

    // var layerGroup = new L.LayerGroup();
    // layerGroup.addTo(map);

    map.on('click', (e) => { 
      let popup = L.popup();
      popup
        .setLatLng(e.latlng)
        .setContent("You clicked the map at " + e.latlng.toString())
        .openOn(map);
    });

    const layerControl = L.control.layers(this.baseMaps).addTo(map);

    this.geoJsonAssets.forEach(item => {
      this.getJSON(item).subscribe(result => {
        const options = {
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
          style: (feature) => result.style,
        };
        const geoJsonLayer = L.geoJSON(result.data, options).addTo(map);
        //layerGroup.addLayer(geoJsonLayer);
        layerControl.addOverlay(geoJsonLayer, result.group);
      });
    });
  }

  public getJSON(geoJsonAsset: any): Observable<any> {
    return this.httpClient.get(geoJsonAsset.path).pipe(
      mergeMap(data => { return of({ group: geoJsonAsset.friendlyName, data: data, style: geoJsonAsset.style })})
    );
  }
}
