import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DeliveryDetailPage } from './delivery-detail.page';

describe('DeliveryDetailPage', () => {
	let component: DeliveryDetailPage;
	let fixture: ComponentFixture<DeliveryDetailPage>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [DeliveryDetailPage],
			schemas: [CUSTOM_ELEMENTS_SCHEMA],
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(DeliveryDetailPage);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
