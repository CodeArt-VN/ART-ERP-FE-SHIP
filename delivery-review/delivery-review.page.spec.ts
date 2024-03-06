import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { DeliveryReviewPage } from './delivery-review.page';

describe('DeliveryReviewPage', () => {
  let component: DeliveryReviewPage;
  let fixture: ComponentFixture<DeliveryReviewPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [DeliveryReviewPage],
      imports: [IonicModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(DeliveryReviewPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
