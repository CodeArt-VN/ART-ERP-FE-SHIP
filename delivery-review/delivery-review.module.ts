import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { DeliveryReviewPageRoutingModule } from './delivery-review-routing.module';
import { DeliveryReviewPage } from './delivery-review.page';
import { ShareModule } from 'src/app/share.module';

@NgModule({
	imports: [CommonModule, FormsModule, ShareModule, IonicModule, DeliveryReviewPageRoutingModule],
	declarations: [DeliveryReviewPage],
})
export class DeliveryReviewPageModule {}
