import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShipmentPage } from './shipment.page';
import { ShareModule } from 'src/app/share.module';
import { NgOptionHighlightModule } from '@ng-select/ng-option-highlight';
import { NgSelectModule } from '@ng-select/ng-select';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    NgSelectModule,
    NgOptionHighlightModule,
    ShareModule,
    RouterModule.forChild([{ path: '', component: ShipmentPage }])
  ],
  declarations: [ShipmentPage]
})
export class ShipmentPageModule {}
