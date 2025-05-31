import { Injectable } from '@angular/core';
import { SHIP_ShipmentProvider } from 'src/app/services/static/services.service';

@Injectable({ providedIn: 'root' })
export class SHIP_ShipmentService extends SHIP_ShipmentProvider {
	reopenOrder(item: any) {
		return this.commonService.connect('POST', 'SHIP/Shipment/ReopenOrder/', item).toPromise();
	}


}
