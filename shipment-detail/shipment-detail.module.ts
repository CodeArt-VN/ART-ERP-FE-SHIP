import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ShareModule } from 'src/app/share.module';
import { ShipmentDetailPage } from './shipment-detail.page';
import { ShipmentModalPage } from '../shipment-modal/shipment-modal.page';
import { ShipmentDebtPickerModalPage } from '../shipment-debt-picker-modal/shipment-debt-picker-modal.page';
import { MapCompsModule } from 'src/app/components/map-comps/map-comps.module';

const routes: Routes = [
	{
		path: '',
		component: ShipmentDetailPage,
	},
];

@NgModule({
	imports: [CommonModule, FormsModule, MapCompsModule, IonicModule, ReactiveFormsModule, ShareModule, RouterModule.forChild(routes)],
	declarations: [ShipmentDetailPage, ShipmentModalPage, ShipmentDebtPickerModalPage],
})
export class ShipmentDetailPageModule {}
