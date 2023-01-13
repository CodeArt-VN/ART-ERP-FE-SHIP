import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { DeliveryReviewDetailPage } from './delivery-review-detail.page';

describe('DeliveryReviewDetailPage', () => {
  let component: DeliveryReviewDetailPage;
  let fixture: ComponentFixture<DeliveryReviewDetailPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [DeliveryReviewDetailPage],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(DeliveryReviewDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
