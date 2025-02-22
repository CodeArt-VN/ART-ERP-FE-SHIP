import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DeliveryReviewPage } from './delivery-review.page';

const routes: Routes = [
	{
		path: '',
		component: DeliveryReviewPage,
	},
];

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule],
})
export class DeliveryReviewPageRoutingModule {}
