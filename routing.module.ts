import { Routes } from '@angular/router';
import { AuthGuard } from 'src/app/guards/app.guard';

export const SHIPRoutes: Routes = [
    
    { path: 'delivery', loadChildren: () => import('./delivery/delivery.module').then(m => m.DeliveryPageModule), canActivate: [AuthGuard] },
    { path: 'delivery/:id', loadChildren: () => import('./delivery-detail/delivery-detail.module').then(m => m.DeliveryDetailPageModule), canActivate: [AuthGuard] },
  
    { path: 'delivery-note', loadChildren: () => import('./delivery-note/delivery-note.module').then(m => m.DeliveryNotePageModule), canActivate: [AuthGuard] },
    { path: 'delivery-note/:id', loadChildren: () => import('./delivery-note/delivery-note.module').then(m => m.DeliveryNotePageModule), canActivate: [AuthGuard] },
  
    { path: 'delivery-review', loadChildren: () => import('./delivery-review/delivery-review.module').then(m => m.DeliveryReviewPageModule), canActivate: [AuthGuard] },
    { path: 'delivery-review/:id', loadChildren: () => import('./delivery-review-detail/delivery-review-detail.module').then(m => m.DeliveryReviewDetailPageModule), canActivate: [AuthGuard] },
  
    { path: 'vehicle', loadChildren: () => import('./vehicle/vehicle.module').then(m => m.VehiclePageModule), canActivate: [AuthGuard] },
    { path: 'vehicle/:id', loadChildren: () => import('./vehicle-detail/vehicle-detail.module').then(m => m.VehicleDetailPageModule), canActivate: [AuthGuard] },
  
    { path: 'shipment', loadChildren: () => import('./shipment/shipment.module').then(m => m.ShipmentPageModule), canActivate: [AuthGuard] },
    { path: 'shipment/:id', loadChildren: () => import('./shipment-detail/shipment-detail.module').then(m => m.ShipmentDetailPageModule), canActivate: [AuthGuard] },
  
    { path: 'shipping-route', loadChildren: () => import('./shipping-route/shipping-route.module').then(m => m.ShippingRoutePageModule), canActivate: [AuthGuard] },
    { path: 'shipping-route/:id', loadChildren: () => import('./shipping-route-detail/shipping-route-detail.module').then(m => m.ShippingRouteDetailPageModule), canActivate: [AuthGuard] },
  
];
