import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ShareModule } from 'src/app/share.module';
import { ShipmentDetailPage } from './shipment-detail.page';
import { FileUploadModule } from 'ng2-file-upload';
import { ShipmentModalPage } from '../shipment-modal/shipment-modal.page';
import { ShipmentDebtPickerModalPage } from '../shipment-debt-picker-modal/shipment-debt-picker-modal.page';

const routes: Routes = [
  {
    path: '',
    component: ShipmentDetailPage
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ReactiveFormsModule,
    FileUploadModule,
    ShareModule,
    RouterModule.forChild(routes)
  ],
  declarations: [ShipmentDetailPage, ShipmentModalPage, ShipmentDebtPickerModalPage]
})
export class ShipmentDetailPageModule { }
