import { Component, ChangeDetectorRef, Input } from '@angular/core';
import { NavController, ModalController, NavParams, LoadingController, AlertController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import { SALE_OrderProvider } from 'src/app/services/static/services.service';
import { FormBuilder } from '@angular/forms';
import { lib } from 'src/app/services/static/global-functions';
import { ApiSetting } from 'src/app/services/static/api-setting';

@Component({
	selector: 'app-shipment-modal',
	templateUrl: './shipment-modal.page.html',
	styleUrls: ['./shipment-modal.page.scss'],
	standalone: false,
})
export class ShipmentModalPage extends PageBase {
	@Input() selectedIds: any[] = [];
	@Input() canViewAllOrders = false;
	constructor(
		public pageProvider: SALE_OrderProvider,
		public env: EnvService,
		public navCtrl: NavController,
		public route: ActivatedRoute,

		public modalController: ModalController,
		public alertCtrl: AlertController,
		public navParams: NavParams,
		public formBuilder: FormBuilder,
		public cdr: ChangeDetectorRef,
		public loadingController: LoadingController
	) {
		super();
		this.pageConfig.isDetailPage = false;
		this.id = this.route.snapshot.paramMap.get('id');
	}

	preLoadData(event) {
		// this.sort.Id = 'Id';
		this.sortToggle('Id', true);
		super.preLoadData(event);
	}

	loadData(event) {
		let OrderDateFrom = lib.dateFormat(new Date().setDate(new Date().getDate() - 14));
		let OrderDateTo = lib.dateFormat(new Date()) + ' 23:59:59';

		this.query.Take = 2000;
		this.query.OrderDateFrom = OrderDateFrom;
		this.query.OrderDateTo = OrderDateTo;
		//this.query.IgnoredBranch = true;
		this.query.Status = 'Approved';

		this.pageProvider.commonService
			.connect('GET', 'SALE/Order/ShippingList', this.query)
			.toPromise()
			.then((result: any) => {
				if (result.length == 0) {
					this.pageConfig.isEndOfData = true;
				}
				this.items = result;
				this.loadedData(null);
			});
	}

	quickSelectChange(type) {
		if (type == 'sale') {
			this.quickSelect.idRoute = -1;
			for (let x = 0; x < this.items.length; x++) {
				const i = this.items[x];
				if (this.quickSelect.idSale == i.IDSeller) {
					i.checked = true;
				}
			}
		} else {
			this.quickSelect.idSale = -1;
			for (let x = 0; x < this.items.length; x++) {
				const i = this.items[x];
				if (this.quickSelect.idRoute == i.IDRoute) {
					i.checked = true;
				}
			}
		}

		this.selectedItems = this.items.filter((d) => d.checked);
		this.changeSelection({});

		setTimeout(() => {
			this.quickSelect.idSale = -1;
			this.quickSelect.idRoute = -1;
		}, 100);
	}

	quickSelect = {
		idSale: -1,
		idRoute: -1,
	};
	routeList = [];
	sellerList = [];

	loadedData(event) {
		this.selectedItems = [];
		this.routeList = [];
		this.sellerList = [];
		this.quickSelect = {
			idSale: -1,
			idRoute: -1,
		};

		this.items.forEach((i) => {
			let r = this.routeList.find((d) => d.Id == i.IDRoute);
			if (r) {
				r.Count += 1;
			} else {
				this.routeList.push({
					Id: i.IDRoute,
					Name: i.IDRoute ? i.RouteName : 'Chưa có tuyến',
					Count: 1,
				});
			}

			let s = this.sellerList.find((d) => d.Id == i.IDSeller);
			if (s) {
				s.Count += 1;
			} else {
				this.sellerList.push({
					Id: i.IDSeller,
					Name: i.IDSeller ? i.SellerName : 'N/A',
					Count: 1,
				});
			}

			i.OrderTimeText = i.OrderDate ? lib.dateFormat(i.OrderDate, 'hh:MM') : '';
			i.OrderDateText = i.OrderDate ? lib.dateFormat(i.OrderDate, 'dd/mm/yy') : '';
			i.Query = i.OrderDate ? lib.dateFormat(i.OrderDate, 'yyyy-mm-dd') : '';
			i.OriginalTotalText = lib.currencyFormat(i.OriginalTotalAfterTax);
			i.ProductWeightText = lib.formatMoney(i.ProductWeight, 2);
			i.ProductDimensionsText = lib.formatMoney(i.ProductDimensions / 10 ** 3, 1);
			i.checked = this.selectedIds.includes(i.Id);
			if (i.checked) {
				this.selectedItems.push(i);
			}
		});
		super.loadedData(event);
		this.changeSelection({});
	}

	total: any = {
		OriginalTotalAfterTax: 0,
		ProductWeight: 0,
		ProductDimensions: 0,
	};

	changeSelection(i, e = null) {
		super.changeSelection(i, e);

		this.total = {
			OriginalTotalAfterTax: 0,
			ProductWeight: 0,
			ProductDimensions: 0,
		};

		this.selectedItems.forEach((o) => {
			this.total.OriginalTotalAfterTax += o.OriginalTotalAfterTax;
			this.total.ProductWeight += o.ProductWeight;
			this.total.ProductDimensions += o.ProductDimensions;
		});

		this.total.OriginalTotalText = lib.currencyFormat(this.total.OriginalTotalAfterTax);
		this.total.ProductWeightText = lib.formatMoney(this.total.ProductWeight, 2);
		this.total.ProductDimensionsText = lib.formatMoney(this.total.ProductDimensions / 10 ** 3, 1);
	}

	SaveSelectedOrders() {
		this.modalController.dismiss(this.selectedItems);
	}

	isAllChecked = false;
	toggleSelectAll() {
		this.items.forEach((i) => (i.checked = this.isAllChecked));
		this.selectedItems = this.isAllChecked ? [...this.items] : [];
		this.changeSelection({});
	}
}
