import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ShipmentMapPage } from './shipment-map.page';
import { ShareModule } from 'src/app/share.module';
import { MapCompsModule } from 'src/app/components/map-comps/map-comps.module';

@NgModule({
	imports: [IonicModule, CommonModule, FormsModule, ReactiveFormsModule, MapCompsModule, ShareModule, RouterModule.forChild([{ path: '', component: ShipmentMapPage }])],
	declarations: [ShipmentMapPage],
})
export class ShipmentMapPageModule {}
