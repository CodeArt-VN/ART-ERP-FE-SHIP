import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShipmentPage } from './shipment.page';
import { ShareModule } from 'src/app/share.module';
import { MapCompsModule } from 'src/app/components/map-comps/map-comps.module';
import { ReviewVRPComponent } from './components/review-vrp/review-vrp.component';
import { GoogleMapsModule } from '@angular/google-maps';

@NgModule({
	imports: [IonicModule, CommonModule, FormsModule, ShareModule, MapCompsModule, GoogleMapsModule, RouterModule.forChild([{ path: '', component: ShipmentPage }])],
	declarations: [ShipmentPage, ReviewVRPComponent],
})
export class ShipmentPageModule {}
