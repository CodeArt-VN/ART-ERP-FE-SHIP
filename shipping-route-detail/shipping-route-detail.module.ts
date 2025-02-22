import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ShareModule } from 'src/app/share.module';
import { ShippingRouteDetailPage } from './shipping-route-detail.page';
import { MapCompsModule } from '../../../components/map-comps/map-comps.module';

const routes: Routes = [
	{
		path: '',
		component: ShippingRouteDetailPage,
	},
];

@NgModule({
	imports: [CommonModule, FormsModule, IonicModule, ReactiveFormsModule, MapCompsModule, ShareModule, RouterModule.forChild(routes)],
	declarations: [ShippingRouteDetailPage],
})
export class ShippingRouteDetailPageModule {}
