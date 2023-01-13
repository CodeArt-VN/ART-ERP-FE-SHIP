import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ShipmentModalPage } from './shipment-modal.page';

describe('ShipmentModalPage', () => {
  let component: ShipmentModalPage;
  let fixture: ComponentFixture<ShipmentModalPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ShipmentModalPage ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ShipmentModalPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
