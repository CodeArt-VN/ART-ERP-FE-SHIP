import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ShipmentDebtPickerModalPage } from './shipment-debt-picker-modal.page';

describe('ShipmentDebtPickerModalPage', () => {
	let component: ShipmentDebtPickerModalPage;
	let fixture: ComponentFixture<ShipmentDebtPickerModalPage>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [ShipmentDebtPickerModalPage],
			schemas: [CUSTOM_ELEMENTS_SCHEMA],
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(ShipmentDebtPickerModalPage);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
