import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BRA_BranchProvider, SALE_OrderProvider, SHIP_ShipmentProvider, WMS_OutboundOrderProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { ApiSetting } from 'src/app/services/static/api-setting';
import { lib } from 'src/app/services/static/global-functions';
import QRCode from 'qrcode';

@Component({
	selector: 'app-shipment-map',
	templateUrl: 'shipment-map.page.html',
	styleUrls: ['shipment-map.page.scss'],
	standalone: false,
})
export class ShipmentMapPage extends PageBase {
	ngayIn = '';
	colors = lib.Colors;

	constructor(
		public pageProvider: SHIP_ShipmentProvider,
		public outboundProvider: WMS_OutboundOrderProvider,
		public branchProvider: BRA_BranchProvider,
		public modalController: ModalController,
		public alertCtrl: AlertController,
		public loadingController: LoadingController,
		public env: EnvService,
		public navCtrl: NavController,
		public location: Location
	) {
		super();
		this.pageConfig.isShowFeature = true;

		let today = new Date();
		this.ngayIn = lib.dateFormat(today, 'dd/mm/yy hh:MM');
		//this.query.DeliveryDate = lib.dateFormat(today.setDate(today.getDate() + 1), 'yyyy-mm-dd');
		this.query.IDStatus = '[301]';
	}

	loadData(event) {
		this.pageProvider.apiPath.getList.url = function () {
			return ApiSetting.apiDomain('SHIP/Shipment/List');
		};
		super.loadData(event);
	}

	loadedData(event) {
		for (let i = 0; i < this.items.length; i++) {
			this.items[i]._color = this.colors[i];
		}

		super.loadedData(event);
	}

	shipemntList = [];
	mapData: any = [];
	loadShipmentMap() {
		this.mapData = [];
		this.shipemntList = [];

		if (this.submitAttempt) {
			this.env.showMessage('Please wait for a few moments');
			return;
		}

		let selected = this.selectedItems.map((m) => m.Id);
		if (!selected.length) {
			this.env.showMessage('Please wait for a few moments', 'warning');
			return;
		}

		let docQuery: any = {
			Id: JSON.stringify(selected),
		};

		this.loadingController
			.create({
				cssClass: 'my-custom-class',
				message: 'Please wait for a few moments',
			})
			.then((loading) => {
				loading.present();
				this.submitAttempt = true;
				this.pageProvider.commonService
					.connect('GET', 'SHIP/Shipment/MapData', docQuery)
					.toPromise()
					.then((resp: any) => {
						this.shipemntList = resp;
						for (let i = 0; i < resp.length; i++) {
							let shipment = resp[i];
							shipment._color = this.items.find((i) => i.Id == shipment.Id)._color;

							//add all shipmnet.SaleOrders to mapData
							if (shipment.SaleOrders || shipment.DebtOrders) {
								shipment.DebtOrders.forEach((i) => {i._isDebt = true;});
								let orders = [...(shipment.SaleOrders || []), ...(shipment.DebtOrders || [])];
								orders.map((m) => {
									return {
										Id: m.Id,
										Address: m.Address,
										Color: shipment._color,
										Title: shipment.Vehicle,
										Subtitle: shipment.Shiper,
										Content:
											'<b>' +
											m.Customer + (m._isDebt ? ' (Debt)' : '') +
											'</b><br>' +
											[m.Address.Contact, m.Address.Phone1, m.Address.Phone2].filter((part) => part && part.trim()).join(', ') +
											'<br>' +
											(m.Address.AddressLine1 ? m.Address.AddressLine1 + '<br>' : '') +
											(m.Address.AddressLine2 ? m.Address.AddressLine2 + '<br>' : '') +
											[m.Address.Ward, m.Address.District, m.Address.Province, m.Address.Country].filter((part) => part && part.trim()).join(', '),
									};
								}).forEach((i) => {
									this.mapData.push(i);
								});
							}
						}

						this.submitAttempt = false;
						if (loading) loading.dismiss();
					})
					.catch((err) => {
						if (err.message != null) {
							this.env.showMessage(err.message, 'danger');
						} else {
							this.env.showMessage('Cannote create list', 'danger');
						}
						this.submitAttempt = false;
						if (loading) loading.dismiss();
					});
			});
	}

	toggleDateFilter() {
		this.query.IDStatus = this.query.IDStatus == '[301]' ? '' : '[301]';
		if (this.query.IDStatus == '[301]') {
			this.query.DeliveryDate = '';
		} else {
			let today = new Date();
			this.query.DeliveryDate = lib.dateFormat(today.setDate(today.getDate() + 1), 'yyyy-mm-dd');
		}

		this.refresh();
	}

	currentGroup = '';
	checkCurrentGroup(group) {
		if (this.currentGroup != group) {
			this.currentGroup = group;
			return false;
		}
		return true;
	}
}
