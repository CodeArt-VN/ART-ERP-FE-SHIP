import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ShareModule } from 'src/app/share.module';
import { DeliveryDetailPage } from './delivery-detail.page';
import { FileUploadModule } from 'ng2-file-upload';


const routes: Routes = [
  {
    path: '',
    component: DeliveryDetailPage
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
  declarations: [DeliveryDetailPage]
})
export class DeliveryDetailPageModule { }
