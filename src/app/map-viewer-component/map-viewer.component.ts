import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { geoJson } from 'leaflet';
import { mergeMap, Observable, of } from 'rxjs';
declare const L:any;

@Component({
  selector: 'map-viewer',
  templateUrl: './map-viewer.component.html',
  styleUrls: ['./map-viewer.component.scss']
})
export class MapViewerComponent implements OnInit {
  leafletTestText = 'Leaflet Map Viewer Prototype';

  private osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  });

  private baseMaps = {
    "OpenStreetMap": this.osm,
  };

  private geoJsonAssets: any[] = [
    { friendlyName: 'States', path: 'assets/cb_2017_us_state_500k_0.json', style: { fillColor: "#0000FF", weight: 2, fillOpacity: 0.15 } },
    { friendlyName: 'West Region', path: 'assets/cb_2017_us_state_500k_west_1.json', style: { fillColor: "#780000", weight: 2, fillOpacity: 0.65 } },
    { friendlyName: 'East Region', path: 'assets/cb_2017_us_state_500k_east_2.json', style: { fillColor: "#008080", weight: 2, fillOpacity: 0.65 } },
    { friendlyName: 'Midwest Region', path: 'assets/cb_2017_us_state_500k_midwest_3.json', style: { fillColor: "#FFC300", weight: 3, fillOpacity: 0.65 } },
    { friendlyName: 'Counties', path: 'assets/cb_2017_us_county_5m_4.json', style: { fillColor: "#0000FF", weight: 2, fillOpacity: 0.15 } },
    { friendlyName: 'Salave Yards', path: 'assets/SalvageYardsRegions_5.json', style: { fillColor: "#0000FF", weight: 2, fillOpacity: 0.15 } }, 
  ];
   
  constructor(private httpClient: HttpClient) {
  }

  ngOnInit() {
    let map = L.map('map', {
      center: [39.73, -104.99],
      zoom: 10,
      layers: [this.osm]
    });

    var layerGroup = new L.LayerGroup();
    layerGroup.addTo(map);

    const layerControl = L.control.layers(this.baseMaps).addTo(map);

    // L.marker([51.5, -0.09])
    //   .addTo(map)
    //   .bindPopup('A pretty CSS3 popup.<br> Easily customizable.')
    //   .openPopup();
    
    this.geoJsonAssets.forEach(item => {
      this.getJSON(item).subscribe(result => {
        const geoJsonLayer = L.geoJSON().addTo(map);
        geoJsonLayer.addData(result.data);
        geoJsonLayer.setStyle(item.style);
        layerGroup.addLayer(geoJsonLayer);
        layerControl.addOverlay(geoJsonLayer, result.group);
      });
    });
  }

  public getJSON(geoJsonAsset: any): Observable<any> {
    return this.httpClient.get(geoJsonAsset.path).pipe(
      mergeMap(data => { return of({ group: geoJsonAsset.friendlyName, data: data })})
    );
  }
}
