import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { DeliveryNotePage } from './delivery-note.page';

describe('DeliveryNotePage', () => {
	let component: DeliveryNotePage;
	let fixture: ComponentFixture<DeliveryNotePage>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [DeliveryNotePage],
			imports: [IonicModule.forRoot()],
		}).compileComponents();

		fixture = TestBed.createComponent(DeliveryNotePage);
		component = fixture.componentInstance;
		fixture.detectChanges();
	}));

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
