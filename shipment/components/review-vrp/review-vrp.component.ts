import { ChangeDetectorRef, Component, Input, OnInit, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay, take } from 'rxjs/operators';
import { EnvService } from 'src/app/services/core/env.service';
import { lib } from 'src/app/services/static/global-functions';

@Component({
	selector: 'app-review-vrp',
	templateUrl: './review-vrp.component.html',
	styleUrls: ['./review-vrp.component.scss'],
	standalone: false,
})
export class ReviewVRPComponent implements OnInit, OnChanges, AfterViewInit {
	private static mapsLoader$: Observable<boolean>;
	@Input() vrpData: any;
	@Input() vehicleList: any[] = [];
	@Input() selectedSOList: any[] = [];
	@Input() selectedDebtList: any[] = [];

	@Input() selectedWarehouse: any;

	mapLoaded: Observable<boolean>;
	markers: google.maps.Marker[] = []; // Update the type of markers to store google.maps.Marker instances
	bounds: google.maps.LatLngBounds;
	options: google.maps.MapOptions = {
		scrollwheel: true,
		disableDoubleClickZoom: true,
		streetViewControl: false,
		mapTypeControl: false,
		zoom: 14,
	};
	selected: any;

	shipments: any[] = [];
	polylines: google.maps.Polyline[] = [];
	uniqueVehicles: any = [];
	infoPosition: google.maps.LatLngLiteral | null = null;
	selectedVehicle: number;
	selectedTrip: number;
	currentShipmentIndex: number;
	currentPointIndex: number;

	// Add a new property to store the map instance
	private map: google.maps.Map | null = null;

	// Add a property to store the infoWindow instance
	private infoWindow: google.maps.InfoWindow | null = null;

	// Add properties to manage unassigned orders summary visibility
	showUnassignedOrders: boolean = false;
	isAnyUnassignedOrders: boolean = false;

	constructor(
		public env: EnvService,
		public httpClient: HttpClient,
		private cdr: ChangeDetectorRef
	) {
		COLORS.forEach((color: any) => {
			color.border = lib.colorLightenDarken(color.background, -30);
		});
		const key = 'AIzaSyAtyM-Th784YwQUTquYa0WlFIj8C6RB2uM';
		if (!ReviewVRPComponent.mapsLoader$) {
			ReviewVRPComponent.mapsLoader$ = this.httpClient.jsonp(`https://maps.googleapis.com/maps/api/js?key=${key}`, 'callback').pipe(
				map(() => true),
				catchError(() => of(false)),
				shareReplay(1)
			);
		}
		this.mapLoaded = ReviewVRPComponent.mapsLoader$;
	}

	ngOnInit(): void {
		this.mapLoaded.pipe(take(1)).subscribe((ready) => {
			if (ready && this.vrpData) {
				this.loadMarkers(); // Ensure markers are loaded when both map and vrpData are ready
			}
		});
	}

	ngOnChanges(changes: SimpleChanges) {
		if (changes.vrpData && !changes.vrpData.firstChange) {
			// when input changes and map loaded, reload markers
			this.mapLoaded.pipe(take(1)).subscribe((ready) => {
				if (ready) this.loadMarkers();
			});
		}
	}

	ngAfterViewInit(): void {
		this.mapLoaded.pipe(take(1)).subscribe((ready) => {
			if (ready) {
				this.initMap();
				if (this.vrpData) {
					this.loadMarkers(); // Ensure markers are loaded after map initialization
				}
			}
		});
	}

	initMap() {
		const mapContainer = document.getElementById('map-container');
		if (!mapContainer) return;

		this.map = new google.maps.Map(mapContainer, {
			center: { lat: 0, lng: 0 },
			zoom: 14,
			scrollwheel: true,
			disableDoubleClickZoom: true,
			streetViewControl: false,
			mapTypeControl: false,
			mapTypeId: google.maps.MapTypeId.ROADMAP, // Set map type to ROADMAP
			styles: [
				{
					featureType: 'all',
					elementType: 'labels',
					stylers: [
						{ visibility: 'off' }, // Hide all labels
					],
				},
				{
					featureType: 'road',
					elementType: 'labels',
					stylers: [
						{ visibility: 'on' }, // Show road labels only
					],
				},
			],
		});

		this.bounds = new google.maps.LatLngBounds();

		// Initialize the infoWindow instance
		this.infoWindow = new google.maps.InfoWindow();
	}

	loadMarkers() {
		// Check if there are any unassigned orders
		this.isAnyUnassignedOrders = this.vrpData?.UnassignedOrders?.length > 0;

		if (!this.vrpData || !this.map) return; // Ensure map is initialized

		// update shipments on change
		this.shipments = this.vrpData.Shipments || [];
		// Update the loadMarkers method to assign _color using modulo operation
		this.uniqueVehicles = [...new Set(this.shipments.map((s) => s.IDVehicle))].map(
			(vehicleId) => {
				const vehicle = this.vehicleList?.find((v) => v.Id === vehicleId) || { Id: vehicleId, Name: `Id ${vehicleId}` };
				vehicle._color = (vehicleId % 98) + 2; // Assign _color using modulo operation
				return vehicle;
			}
		);

		this.renderRoutes();
	}

	renderRoutes() {
		// clear old display
		this.polylines.forEach((pl) => pl.setMap(null));
		this.polylines = [];
		this.markers.forEach((marker) => marker.setMap(null)); // Clear old markers
		this.markers = [];
		this.bounds = new google.maps.LatLngBounds();

		// Add warehouse marker
		if (this.vrpData.Warehouse) {
			const warehouseLat = parseFloat(this.vrpData.Warehouse.Lat);
			const warehouseLng = parseFloat(this.vrpData.Warehouse.Long);
			const warehouseColor = COLORS[1]; // Use the second color for the warehouse

			const warehouseMarker = new google.maps.Marker({
				position: { lat: warehouseLat, lng: warehouseLng },
				label: { text: 'W', color: warehouseColor.foreground, fontSize: '14px', fontWeight: 'bold' },
				icon: {
					path: google.maps.SymbolPath.CIRCLE,
					scale: 14,
					fillColor: warehouseColor.background,
					fillOpacity: 1,
					strokeColor: warehouseColor.border || '#000',
					strokeWeight: 3,
				},
				map: this.map!,
			});

			// Add click event listener to toggle lines
			warehouseMarker.addListener('click', () => {
				this.polylines.forEach((polyline) => {
					const path = polyline.getPath().getArray();
					if (
						path.length === 2 &&
						((path[0].lat() === warehouseLat && path[0].lng() === warehouseLng) ||
							(path[1].lat() === warehouseLat && path[1].lng() === warehouseLng))
					) {
						const isVisible = polyline.getVisible();
						polyline.setVisible(!isVisible);
					}
				});
			});

			this.markers.push(warehouseMarker);
			this.bounds.extend({ lat: warehouseLat, lng: warehouseLng });
		}

		// draw each shipment route
		this.shipments.forEach((shipment, si) => {
			const vehicle = this.uniqueVehicles.find((v) => v.Id === shipment.IDVehicle);
			const color = COLORS[vehicle._color] || COLORS[0];
			const path = shipment.Route.map((pt) => ({ lat: pt.Latitude, lng: pt.Longitude }));
			const polyline = new google.maps.Polyline({ path, geodesic: true, strokeColor: color.border, strokeOpacity: 1.0, strokeWeight: 2 });
			polyline.setMap(this.map!);
			this.polylines.push(polyline);

			// markers
			shipment.Route.forEach((pt, pi) => {
				const lat = pt.Latitude,
					lng = pt.Longitude;
				this.bounds.extend({ lat, lng });
				const marker = new google.maps.Marker({
					position: { lat, lng },
					label: { text: (pi + 1).toString(), color: color.foreground, fontSize: '14px', fontWeight: 'bold' },
					icon: {
						path: google.maps.SymbolPath.CIRCLE,
						scale: 14,
						fillColor: color.background,
						fillOpacity: 1,
						strokeColor: color.border,
						strokeWeight: 3,
					},
					map: this.map!,
				});

				// Add click event listener to open info window
				marker.addListener('click', () => {
					this.openInfo(marker, { data: { shipmentIndex: si, pointIndex: pi, pt } });
				});

				this.markers.push(marker); // Store marker instance
			});

			// Connect first and last points to warehouse
			if (this.vrpData.Warehouse) {
				const warehouseLat = parseFloat(this.vrpData.Warehouse.Lat);
				const warehouseLng = parseFloat(this.vrpData.Warehouse.Long);

				const firstPoint = shipment.Route[0];
				const lastPoint = shipment.Route[shipment.Route.length - 1];

				const firstLine = new google.maps.Polyline({
					path: [
						{ lat: warehouseLat, lng: warehouseLng },
						{ lat: firstPoint.Latitude, lng: firstPoint.Longitude },
					],
					geodesic: true,
					strokeColor: color.border,
					strokeOpacity: 0.5,
					strokeWeight: 2,
					visible: false,
				});
				firstLine.setMap(this.map!);
				this.polylines.push(firstLine);

				const lastLine = new google.maps.Polyline({
					path: [
						{ lat: warehouseLat, lng: warehouseLng },
						{ lat: lastPoint.Latitude, lng: lastPoint.Longitude },
					],
					geodesic: true,
					strokeColor: color.border,
					strokeOpacity: 0.5,
					strokeWeight: 2,
					visible: false,
				});
				lastLine.setMap(this.map!);
				this.polylines.push(lastLine);
			}
		});

		// Add markers for unassigned orders
		this.vrpData.UnassignedOrders?.forEach((order) => {
			if (order.Latitude && order.Longitude) {
				const marker = new google.maps.Marker({
					position: { lat: order.Latitude, lng: order.Longitude },
					label: { text: 'U', color: COLORS[0].foreground },
					icon: {
						path: google.maps.SymbolPath.CIRCLE,
						scale: 14,
						fillColor: COLORS[0].background,
						fillOpacity: 1,
						strokeColor: COLORS[0].border || '#000',
						strokeWeight: 1,
					},
					map: this.map!,
				});
				// Add click event listener to open info window
				marker.addListener('click', () => {
					this.openInfo(marker, { data: { shipmentIndex: -1, pointIndex: -1, pt: order } });
				});
				this.markers.push(marker);
			}
		});

		// fit bounds
		setTimeout(() => this.map!.fitBounds(this.bounds), 100);
		this.cdr.detectChanges();

		// Generate and display the legend after the map is initialized
		this.generateLegend();
	}
	
	openInfo(marker: google.maps.Marker, m: any) {
		const { shipmentIndex, pointIndex, pt } = m.data;
		let order:any = this.selectedSOList.find((o) => o.Id === pt.IDOrder);
		if (!order) {
			order = this.selectedDebtList.find((o) => o.Id === pt.IDOrder);
			if (order) order._isDebt = true; // Mark as debt order
		}

		this.infoPosition = marker.getPosition()!.toJSON();

		// Handle case where shipmentIndex is -1
		const shp = shipmentIndex >= 0 ? this.shipments[shipmentIndex] : null;
		this.selectedVehicle = shp?.IDVehicle || null;
		this.selectedTrip = shp?.Trip || null;
		this.currentShipmentIndex = shipmentIndex;
		this.currentPointIndex = pointIndex;

		// Generate dropdown options for Vehicle-Trip combinations
		const vehicleTripOptions = this.shipments.map((s) => {
			const vehicle = this.uniqueVehicles.find((v) => v.Id === s.IDVehicle);
			return {
				value: `${s.IDVehicle}-${s.Trip}`,
				label: `Xe ${vehicle?.Name || s.IDVehicle} - Chuyến ${s.Trip}`,
			};
		});

		// Generate dropdown options for sequences in the selected trip
		const sequenceOptions =
			shp?.Route.map((r, index) => {
				return { value: index + 1, label: `Sequence ${index + 1}`, selected: index === this.currentPointIndex };
			}) || [];

		// Set content and open the infoWindow
		const content = `
		<div class="ion-padding">
			<h5 style="color: var(--ion-color-primary);">ĐIỂM GIAO NHẬN</h5>

			${order ? `<div class="c-control">
			<h6>
				${order.CustomerName || ''} 
				<small>${order.PhoneNumber ? 'Phone: ' +order.PhoneNumber : ''}</small>
				${order._isDebt ? '<span style="color: var(--ion-color-danger);"> (thu nợ ' + order.DebtText + ')</span>' : ''}
			</h6>
			<span>${
				order.AddressLine1 
				+ (order.AddressLine2 ? ', ' + order.AddressLine2 : '') 
				+ (order.Ward ? ', ' + order.Ward : '') 
				+ (order.District ? ', ' + order.District : '')
				+ (order.Province ? ', ' + order.Province : '')
			}</span>
			</div>` 
			: ''}

			<div class="c-control">
				<label class="c-label" for="vehicle-trip-select">
					Shipment
				</label>
				<select class="c-input c-dropdown" id="vehicle-trip-select">
					${vehicleTripOptions.map((opt) => `<option value="${opt.value}" ${opt.value === `${this.selectedVehicle}-${this.selectedTrip}` ? 'selected' : ''}>${opt.label}</option>`).join('')}
				</select>
			</div>

			<div class="c-control">
				<label class="c-label" for="sequence-select">
					Sequence
				</label>
				<select class="c-input c-dropdown" id="sequence-select">
					${sequenceOptions.map((opt) => `<option value="${opt.value}" ${opt.selected ? 'selected' : ''}>${opt.label}</option>`).join('')}
				</select>
			</div>
			<div class="text-right">
				<button id="remove-button" class="ion-activatable ion-focusable button button-solid ion-activated" style="background: var(--ion-color-danger); color: var(--ion-color-light); border-radius: 4px; padding: 8px 16px; border: none;">
					<span class="button-inner">Remove</span>
					<span class="ripple-parent"></span>
				</button>

				<button id="save-button" class="ion-activatable ion-focusable button button-solid ion-activated" style="background: var(--ion-color-primary); color: var(--ion-color-light); border-radius: 4px; padding: 8px 16px; border: none;">
					<span class="button-inner">Save</span>
					<span class="ripple-parent"></span>
				</button>
			</div>
		</div>`;

		this.infoWindow!.setContent(content);
		this.infoWindow!.open(this.map, marker);

		// Add event listener for the Save button
		google.maps.event.addListenerOnce(this.infoWindow, 'domready', () => {
			const vehicleTripSelect = document.getElementById('vehicle-trip-select') as HTMLSelectElement;
			const sequenceSelect = document.getElementById('sequence-select') as HTMLSelectElement;

			// Update sequence dropdown when Vehicle-Trip changes
			vehicleTripSelect.addEventListener('change', () => {
				const [newVehicle, newTrip] = vehicleTripSelect.value.split('-').map(Number);
				const newSequenceOptions =
					this.shipments
						.filter((s) => s.IDVehicle === newVehicle && s.Trip === newTrip)[0]
						?.Route.map((r, index) => {
							return { value: index + 1, label: `Sequence ${index + 1}` };
						}) || [];

				sequenceSelect.innerHTML = newSequenceOptions.map((opt) => `<option value="${opt.value}">${opt.label}</option>`).join('');
			});

			document.getElementById('save-button')?.addEventListener('click', () => {
				const [newVehicle, newTrip] = vehicleTripSelect.value.split('-').map(Number);
				const newSequence = parseInt(sequenceSelect.value, 10);
				this.updateRoute(newVehicle, newTrip, newSequence);

				// Close the info window after saving
				this.infoWindow?.close();

				// Trigger change detection to ensure UI updates
				this.cdr.detectChanges();
			});

			document.getElementById('remove-button')?.addEventListener('click', () => {
				this.removePointFromRoute();

				// Close the info window after removing
				this.infoWindow?.close();

				// Trigger change detection to ensure UI updates
				this.cdr.detectChanges();
			});
		});
	}

	removePointFromRoute() {
		const oldShipment = this.shipments[this.currentShipmentIndex!];
		const removedPoint = oldShipment.Route.splice(this.currentPointIndex!, 1)[0];

		// Add the removed point to UnassignedOrders with a reason
		this.vrpData.UnassignedOrders = this.vrpData.UnassignedOrders || [];
		this.vrpData.UnassignedOrders.push({
			IDAddress: removedPoint.IDAddress,
			IDOrder: removedPoint.IDOrder,
			Latitude: removedPoint.Latitude,
			Longitude: removedPoint.Longitude,
			Reason: 'User remove from shipment',
		});

		// Recalculate sequences for the old route
		oldShipment.Route.forEach((r, index) => {
			r.Sequence = index + 1;
		});

		// Update vrpData with the modified shipments
		this.vrpData.Shipments = this.shipments;

		// Re-render markers
		this.renderRoutes();
	}

	updateRoute(newVehicle: number, newTrip: number, newSequence: number) {
		const oldShipment = this.currentShipmentIndex >= 0 ? this.shipments[this.currentShipmentIndex!] : null;
		const point = oldShipment ? oldShipment.Route.splice(this.currentPointIndex!, 1)[0] : this.vrpData.UnassignedOrders.splice(this.currentPointIndex!, 1)[0];

		// Recalculate sequences for the old route if applicable
		if (oldShipment) {
			oldShipment.Route.forEach((r, index) => {
				r.Sequence = index + 1;
			});
		}

		// Find or create the new shipment
		let newShipment = this.shipments.find((s) => s.IDVehicle === newVehicle && s.Trip === newTrip);
		if (!newShipment) {
			newShipment = { IDVehicle: newVehicle, Trip: newTrip, Route: [] };
			this.shipments.push(newShipment);
		}

		// Insert the point into the new route at the specified sequence
		newShipment.Route.splice(newSequence - 1, 0, point);

		// Recalculate sequences for the new route
		newShipment.Route.forEach((r, index) => {
			r.Sequence = index + 1;
		});

		console.log('Old Shipment:', this.vrpData);

		// Update vrpData with the modified shipments
		this.vrpData.Shipments = this.shipments;
		console.log('Updated Shipment:', this.vrpData);

		// Re-render the map
		this.renderRoutes();
	}

	// Add a method to generate a legend for vehicles and their corresponding colors
	generateLegend() {
		const legendContainer = document.getElementById('legend-container');
		if (!legendContainer) return;

		// Clear existing legend content
		legendContainer.innerHTML = '';

		// Add legend for warehouse
		const warehouseColor = COLORS[1];
		const warehouseLegendItem = document.createElement('div');
		warehouseLegendItem.style.display = 'flex';
		warehouseLegendItem.style.alignItems = 'center';
		warehouseLegendItem.style.marginBottom = '5px';

		const warehouseColorBox = document.createElement('div');
		warehouseColorBox.textContent = 'W';
		warehouseColorBox.style.color = warehouseColor.foreground;
		warehouseColorBox.style.width = '20px';
		warehouseColorBox.style.height = '20px';
		warehouseColorBox.style.backgroundColor = warehouseColor.background;
		warehouseColorBox.style.border = '2px solid ' + (warehouseColor.border || '#000');
		warehouseColorBox.style.marginRight = '5px';
		warehouseColorBox.style.borderRadius = '50%';

		const warehouseLabel = document.createElement('span');
		warehouseLabel.textContent = 'Warehouse';

		warehouseLegendItem.appendChild(warehouseColorBox);
		warehouseLegendItem.appendChild(warehouseLabel);
		legendContainer.appendChild(warehouseLegendItem);

		// Add legend for unassigned orders
		const unassignedCount = this.vrpData?.UnassignedOrders?.length || 0;
		const unassignedLegendItem = document.createElement('div');
		unassignedLegendItem.style.display = 'flex';
		unassignedLegendItem.style.alignItems = 'center';
		unassignedLegendItem.style.marginBottom = '5px';

		const unassignedColorBox = document.createElement('div');
		unassignedColorBox.style.width = '20px';
		unassignedColorBox.style.height = '20px';
		unassignedColorBox.style.backgroundColor = COLORS[0].background;
		unassignedColorBox.style.border = '2px solid ' + (COLORS[0].border || '#000');
		unassignedColorBox.style.marginRight = '5px';
		unassignedColorBox.style.borderRadius = '50%';
		unassignedColorBox.textContent = unassignedCount.toString();
		unassignedColorBox.style.display = 'flex';
		unassignedColorBox.style.justifyContent = 'center';
		unassignedColorBox.style.alignItems = 'center';
		unassignedColorBox.style.color = COLORS[0].foreground;
		unassignedColorBox.style.fontSize = '12px';

		const unassignedLabel = document.createElement('span');
		unassignedLabel.textContent = 'Unassigned orders';

		unassignedLegendItem.appendChild(unassignedColorBox);
		unassignedLegendItem.appendChild(unassignedLabel);
		legendContainer.appendChild(unassignedLegendItem);

		// Add legend for vehicles
		this.uniqueVehicles.forEach((vehicle) => {
			const color = COLORS[vehicle._color] || COLORS[0];
			const vehicleShipment = this.shipments.filter((s) => s.IDVehicle === vehicle.Id);
			const orderCount = vehicleShipment.reduce((count, shipment) => count + shipment.Route.length, 0);

			const legendItem = document.createElement('div');
			legendItem.style.display = 'flex';
			legendItem.style.alignItems = 'center';
			legendItem.style.marginBottom = '5px';

			const colorBox = document.createElement('div');
			colorBox.style.width = '20px';
			colorBox.style.height = '20px';
			colorBox.style.backgroundColor = color.background;
			colorBox.style.border = '2px solid ' + color.border;
			colorBox.style.marginRight = '5px';
			colorBox.style.borderRadius = '50%';
			colorBox.textContent = orderCount.toString();
			colorBox.style.display = 'flex';
			colorBox.style.justifyContent = 'center';
			colorBox.style.alignItems = 'center';
			colorBox.style.color = color.foreground;
			colorBox.style.fontSize = '12px';

			const label = document.createElement('span');
			label.textContent = `Xe ${vehicle.Name}`;

			legendItem.appendChild(colorBox);
			legendItem.appendChild(label);
			legendContainer.appendChild(legendItem);
		});
	}

	// Add a method to generate a summary of unassigned orders by reason
	generateUnassignedOrdersSummary() {
		if (!this.vrpData?.UnassignedOrders) return [];

		const summary = this.vrpData.UnassignedOrders.reduce((acc, order) => {
			acc[order.Reason] = (acc[order.Reason] || 0) + 1;
			return acc;
		}, {});

		return Object.entries(summary).map(([reason, count]) => ({ reason, count }));
	}

	// Add a method to toggle the visibility of the unassigned orders summary
	toggleUnassignedOrdersSummary(): void {
		this.showUnassignedOrders = !this.showUnassignedOrders;
	}
}

// define color lookup
const COLORS: { background: string; foreground: string; border?: string }[] = [
	{ background: '#808080', foreground: '#FFFFFF' }, // Gray for unassigned orders
	{ background: '#FF0000', foreground: '#FFFFFF' },
	{ background: '#00FF00', foreground: '#000000' },
	{ background: '#0000FF', foreground: '#FFFFFF' },
	{ background: '#FFFF00', foreground: '#000000' },
	{ background: '#FF00FF', foreground: '#FFFFFF' },
	{ background: '#00FFFF', foreground: '#000000' },
	{ background: '#800000', foreground: '#FFFFFF' },
	{ background: '#008000', foreground: '#FFFFFF' },
	{ background: '#000080', foreground: '#FFFFFF' },
	{ background: '#808000', foreground: '#000000' },
	{ background: '#800080', foreground: '#FFFFFF' },
	{ background: '#008080', foreground: '#FFFFFF' },
	{ background: '#C0C0C0', foreground: '#000000' },
	{ background: '#FFA500', foreground: '#000000' },
	{ background: '#A52A2A', foreground: '#FFFFFF' },
	{ background: '#8A2BE2', foreground: '#FFFFFF' },
	{ background: '#5F9EA0', foreground: '#FFFFFF' },
	{ background: '#D2691E', foreground: '#FFFFFF' },
	{ background: '#FF7F50', foreground: '#000000' },
	{ background: '#6495ED', foreground: '#000000' },
	{ background: '#DC143C', foreground: '#FFFFFF' },
	{ background: '#006400', foreground: '#FFFFFF' },
	{ background: '#8B008B', foreground: '#FFFFFF' },
	{ background: '#556B2F', foreground: '#FFFFFF' },
	{ background: '#FF8C00', foreground: '#000000' },
	{ background: '#9932CC', foreground: '#FFFFFF' },
	{ background: '#8B0000', foreground: '#FFFFFF' },
	{ background: '#E9967A', foreground: '#000000' },
	{ background: '#483D8B', foreground: '#FFFFFF' },
	{ background: '#2F4F4F', foreground: '#FFFFFF' },
	{ background: '#00CED1', foreground: '#000000' },
	{ background: '#9400D3', foreground: '#FFFFFF' },
	{ background: '#FF1493', foreground: '#000000' },
	{ background: '#00BFFF', foreground: '#000000' },
	{ background: '#696969', foreground: '#FFFFFF' },
	{ background: '#1E90FF', foreground: '#FFFFFF' },
	{ background: '#B22222', foreground: '#FFFFFF' },
	{ background: '#228B22', foreground: '#FFFFFF' },
	{ background: '#FF69B4', foreground: '#000000' },
	{ background: '#CD5C5C', foreground: '#FFFFFF' },
	{ background: '#4B0082', foreground: '#FFFFFF' },
	{ background: '#F08080', foreground: '#000000' },
	{ background: '#20B2AA', foreground: '#000000' },
	{ background: '#87CEFA', foreground: '#000000' },
	{ background: '#778899', foreground: '#FFFFFF' },
	{ background: '#32CD32', foreground: '#000000' },
	{ background: '#FFD700', foreground: '#000000' },
	{ background: '#B8860B', foreground: '#FFFFFF' },
	{ background: '#FF6347', foreground: '#000000' },
];
