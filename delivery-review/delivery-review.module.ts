import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { DeliveryReviewPageRoutingModule } from './delivery-review-routing.module';
import { DeliveryReviewPage } from './delivery-review.page';
import { ShareModule } from 'src/app/share.module';
import { ShareChartsModule } from 'src/app/components/charts/share-charts.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ShareModule,
    IonicModule,
    DeliveryReviewPageRoutingModule,
    ShareChartsModule
  ],
  declarations: [DeliveryReviewPage]
})
export class DeliveryReviewPageModule {}
