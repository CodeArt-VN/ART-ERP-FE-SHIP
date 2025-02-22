import { Component, ChangeDetectorRef } from '@angular/core';
import { NavController, ModalController, LoadingController, AlertController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import {
	SALE_OrderProvider,
	BRA_BranchProvider,
	CRM_ContactProvider,
	SALE_OrderDetailProvider,
	WMS_ItemProvider,
	HRM_StaffProvider,
	SHIP_ShipmentDetailProvider,
} from 'src/app/services/static/services.service';
import { FormBuilder, Validators, FormControl, FormArray } from '@angular/forms';
import { CommonService } from 'src/app/services/core/common.service';
import { NgSelectConfig } from '@ng-select/ng-select';
import { concat, of, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { ApiSetting } from 'src/app/services/static/api-setting';
import { lib } from 'src/app/services/static/global-functions';
import { Geolocation } from '@capacitor/geolocation';

@Component({
	selector: 'app-delivery-detail',
	templateUrl: './delivery-detail.page.html',
	styleUrls: ['./delivery-detail.page.scss'],
	standalone: false,
})
export class DeliveryDetailPage extends PageBase {
	public maskSigned: any = {
		mask: Number,
		scale: 0, // digits after point, 0 for integers
		signed: true, // disallow negative
		thousandsSeparator: ',', // any single char
		//autofix: true,
		//overwrite: true,
		// padFractionalZeros: false,  // if true, then pads zeros at end to the length of scale
		// normalizeZeros: true,  // appends or removes zeros at ends
		// radix: ',',  // fractional delimiter
		// mapToRadix: ['.']  // symbols to process as radix
	};

	public mask: any = {
		mask: Number,
		scale: 0,
		signed: false,
		thousandsSeparator: ',',
	};

	statusList = [
		// {Id: 314, Name: 'Đã phân tài'},
		// {Id: 315, Name: 'Chờ lấy hàng từ nhà bán'},
		// {Id: 316, Name: 'Đã lấy hàng về kho'},
		// {Id: 317, Name: 'Đang đóng gói'},
		// {Id: 318, Name: 'Đang giao hàng'},

		{ Id: 319, Name: 'Đã giao hàng' },
		{ Id: 307, Name: 'Khách hẹn giao lại' },
		{ Id: 308, Name: 'Không liên lạc được' },
		{ Id: 309, Name: 'Khách không nhận do hàng lỗi' },
		{ Id: 310, Name: 'Khách không nhận do giá' },
		{ Id: 311, Name: 'Khách không nhận do khách đổi ý' },
		{ Id: 312, Name: 'Khách không nhận do khách hết tiền' },
		{ Id: 313, Name: 'Không giao được - lý do khác' },
	];

	statusDebtList = [
		// { Id: 320, Name: 'Chuẩn bị đi thu'},
		// { Id: 321, Name: 'Đang đi thu'},
		// { Id: 322, Name: 'Đã thu một phần'},
		// { Id: 323, Name: 'Đã thu xong'},

		{ Id: 324, Name: 'Khách hẹn lại' },
		{ Id: 325, Name: 'Không liên lạc được' },
		{ Id: 326, Name: 'SAI TIỀN - Khách khiếu nại' },
		{ Id: 327, Name: 'MẤT PHIẾU' },
	];

	isShowAllDiscount = false;

	constructor(
		public pageProvider: SHIP_ShipmentDetailProvider,
		public orderDetailProvider: SALE_OrderDetailProvider,
		public branchProvider: BRA_BranchProvider,
		public contactProvider: CRM_ContactProvider,
		public itemProvider: WMS_ItemProvider,
		public staffPovider: HRM_StaffProvider,

		public env: EnvService,
		public navCtrl: NavController,
		public route: ActivatedRoute,
		public modalController: ModalController,
		public alertCtrl: AlertController,
		public formBuilder: FormBuilder,
		public cdr: ChangeDetectorRef,
		public loadingController: LoadingController,
		public commonService: CommonService
	) {
		super();
		this.pageConfig.isDetailPage = true;
		this.id = this.route.snapshot.paramMap.get('id');
	}

	loadData(event) {
		this.loadFromCache(event);
	}

	loadFromCache(event) {
		this.env.getStorage('deliveryData').then((data) => {
			if (!data || !data.length) {
				data = [];
				this.loadedData(event);
			} else {
				let found = false;
				for (let i = 0; i < data.length; i++) {
					const s = data[i];
					for (let j = 0; j < s.ShipmentOrder.length; j++) {
						const so = s.ShipmentOrder[j];
						if (so.SaleOrder.Id == this.id) {
							this.item = so;
							this.item.IsDebt = false;
							found = true;
							i = data.length;
							break;
						}
					}
					if (found == false) {
						for (let j = 0; j < s.ShipmentDebt.length; j++) {
							const so = s.ShipmentDebt[j];
							if (so.SaleOrder.Id == this.id) {
								this.item = so;
								this.item.IsDebt = true;
								found = true;
								i = data.length;
								break;
							}
						}
					}
				}

				this.loadedData(event);
			}
		});
	}

	checkIsEditableShipmentDetail() {
		if (this.item.IsDebt) {
			return false;
		}

		let editableStatus = [
			314, //	Đã phân tài	32
			315, //	Đã giao đơn vị vận chuyển	32
			316, //	Đang lấy hàng	32
			317, //	Đang đóng gói	32
			318, //	Đang giao hàng	32
			// 319	, //	Đã giao hàng	32
			// 307	, //	Khách hẹn giao lại	32
			// 308	, //	Không liên lạc được	32
			// 309	, //	Khách không nhận do hàng lỗi	32
			// 310	, //	Khách không nhận do giá	32
			// 311	, //	Khách không nhận	32
			// 312	, //	Khách không nhận do khách hết tiền	32
			// 313	, //	Không giao được - lý do khác	32
		];
		return editableStatus.indexOf(this.item.IDStatus) > -1;
	}

	checkIsEditableShipmentDebt() {
		if (!this.item.IsDebt) {
			return false;
		}

		let statusDebtList = [
			320, //'Chuẩn bị đi thu'
			321, //'Đang đi thu'
			// { Id: 322, Name: 'Đã thu một phần'},
			// { Id: 323, Name: 'Đã thu xong'},
			// { Id: 324, Name: 'Khách hẹn lại' },
			// { Id: 325, Name: 'Không liên lạc được' },
			// { Id: 326, Name: 'SAI TIỀN - Khách khiếu nại' },
			// { Id: 327, Name: 'MẤT PHIẾU' },
		];
		return statusDebtList.indexOf(this.item.IDStatus) > -1;
	}

	loadedData(event) {
		if (this.item && this.item.SaleOrder && this.item.SaleOrder.OrderLines) {
			for (let i = 0; i < this.item.SaleOrder.OrderLines.length; i++) {
				const l = this.item.SaleOrder.OrderLines[i];
				l.ItemSort = l.UoMPrice > 0 ? -1 : 1;
			}

			this.item.SaleOrder.OrderLines.sort((a, b) => parseFloat(a.ItemSort) - parseFloat(b.ItemSort) || a.ItemCode.localeCompare(b.ItemCode));

			if (this.checkIsEditableShipmentDetail()) {
				this.item.DA_GIAO_HANG = false;
				this.setFullQuantity();
				this.calcOrder();
			} else {
				this.item.DA_GIAO_HANG = true;

				if (this.item.IsDebt && this.checkIsEditableShipmentDebt()) {
					this.setDaNhan('=', this.item.Debt - (this.item.SaleOrder.DiscountFromSalesman - this.item.SaleOrder.ReceivedDiscountFromSalesman));
				}
			}

			this.checkFullSoLuong();
			this.renderCurrencyFormat();
		}
		super.loadedData(event);
		console.log(this.item);
	}

	setFullQuantity() {
		console.log('setFullQuantity');
		for (let index = 0; index < this.item.SaleOrder.OrderLines.length; index++) {
			const i = this.item.SaleOrder.OrderLines[index];
			i.ShippedQuantity = i.Quantity;
			i.Discount1 = i.OriginalDiscount1;
			i.Discount2 = i.OriginalDiscount2;
			i.DiscountFromSalesman = i.OriginalDiscountFromSalesman;

			this.calcLine(i);
		}
	}

	dropAll() {
		for (let index = 0; index < this.item.SaleOrder.OrderLines.length; index++) {
			const i = this.item.SaleOrder.OrderLines[index];
			i.ShippedQuantity = 0;
			i.Discount1 = 0;
			i.Discount2 = 0;
			i.DiscountFromSalesman = 0;

			this.calcLine(i);
		}

		this.calcOrder();
		this.setDaNhan('=', 0);
		console.log(this.item);
	}

	renderCurrencyFormat() {
		if (!this.item.Received || this.item.Received < 0) {
			this.item.Received = 0;
		}
		if (this.item.IsDebt) {
			this.item.MaxReceive = this.item.Debt - (this.item.SaleOrder.DiscountFromSalesman - this.item.SaleOrder.ReceivedDiscountFromSalesman);
			this.item.ReceivedPercent = !this.item.MaxReceive ? 0 : Math.round((this.item.Received / this.item.MaxReceive) * 100);
		} else {
			this.item.MaxReceive = this.item.SaleOrder.TotalAfterTax - (this.item.SaleOrder.DiscountFromSalesman - this.item.SaleOrder.ReceivedDiscountFromSalesman);
			this.item.ReceivedPercent = !this.item.MaxReceive ? 0 : Math.round((this.item.Received / this.item.MaxReceive) * 100);
		}

		if (this.item.Received > this.item.MaxReceive) {
			this.item.Received = 0;
		}

		this.item.MaxReceiveText = lib.currencyFormat(this.item.MaxReceive);
		this.item.ReceivedText = lib.currencyFormat(this.item.Received);
		this.item.SaleOrder.OriginalTotalAfterTaxText = lib.currencyFormat(this.item.SaleOrder.OriginalTotalAfterTax);
		this.item.SaleOrder.TotalAfterTaxText = lib.currencyFormat(this.item.SaleOrder.TotalAfterTax);
		this.item.SaleOrder.TotalDiscountText = lib.currencyFormat(this.item.SaleOrder.TotalDiscount);
		this.item.SaleOrder.DiscountFromSalesmanText = lib.currencyFormat(this.item.SaleOrder.DiscountFromSalesman);

		this.item.SaleOrder.ReceivedText = lib.currencyFormat(this.item.SaleOrder.Received);

		this.item.SaleOrder.CustomerDebtText = lib.currencyFormat(this.item.SaleOrder.CustomerDebt);
		this.item.CustomerDebt = this.item.Debt - this.item.Received - (this.item.SaleOrder.DiscountFromSalesman - this.item.SaleOrder.ReceivedDiscountFromSalesman);
		this.item.CustomerDebtText = lib.currencyFormat(this.item.CustomerDebt);

		this.item.SaleOrder.DebtText = lib.currencyFormat(this.item.SaleOrder.Debt);
		this.item.SaleOrder.OrderLines.forEach((i) => {
			i.Discount1Text = lib.currencyFormat(i.Discount1);
			i.Discount2Text = lib.currencyFormat(i.Discount2);
			i.DiscountFromSalesmanText = lib.currencyFormat(i.DiscountFromSalesman);
		});
	}

	setDaNhan(sign, value) {
		if (sign == '=') {
			this.item.Received = value;
		} else if (sign == '+') {
			this.item.Received += value;
		}
		this.changeDaNhan();
	}

	changeDaNhan(e = null) {
		if (!this.item.Received || this.item.Received < 0) {
			this.item.Received = 0;
		}

		if (this.item.IsDebt) {
			if (this.item.Received > this.item.Debt - (this.item.SaleOrder.DiscountFromSalesman - this.item.SaleOrder.ReceivedDiscountFromSalesman)) {
				this.item.Received = this.item.Debt - (this.item.SaleOrder.DiscountFromSalesman - this.item.SaleOrder.ReceivedDiscountFromSalesman);
			}

			if (this.item.Received == 0) {
				this.item.IDStatus = 324; //{ Id: 324, Name: 'Khách hẹn lại' },
			} else if (this.item.Received < this.item.Debt) {
				this.item.IDStatus = 322; // { Id: 322, Name: 'Đã thu một phần'},
			} else if (this.item.Received == this.item.Debt) {
				this.item.IDStatus = 323; // { Id: 323, Name: 'Đã thu xong'},
			}

			this.item.CustomerDebt = this.item.Debt - this.item.Received - (this.item.SaleOrder.DiscountFromSalesman - this.item.SaleOrder.ReceivedDiscountFromSalesman);
		} else {
			if (this.item.Received > this.item.SaleOrder.TotalAfterTax - (this.item.SaleOrder.DiscountFromSalesman - this.item.SaleOrder.ReceivedDiscountFromSalesman)) {
				this.item.Received = this.item.SaleOrder.TotalAfterTax - (this.item.SaleOrder.DiscountFromSalesman - this.item.SaleOrder.ReceivedDiscountFromSalesman);
			}

			this.item.SaleOrder.Received = this.item.Received;

			this.item.SaleOrder.Debt = this.item.SaleOrder.TotalAfterTax - this.item.SaleOrder.Received;
			this.item.SaleOrder.CustomerDebt = this.item.SaleOrder.Debt - (this.item.SaleOrder.DiscountFromSalesman - this.item.SaleOrder.ReceivedDiscountFromSalesman);
		}

		if (e) {
			e.target.value = parseInt(this.item.Received);
		}

		this.renderCurrencyFormat();
	}

	count;
	changeSoLuong(line, e = null, checkFullQuantity = true) {
		this.count++;
		if (this.count >= 100) {
			debugger;
		}

		if (!line.ShippedQuantity) {
			line.ShippedQuantity = 0;
		}
		if (line.ShippedQuantity > line.Quantity) {
			line.ShippedQuantity = line.Quantity;
		}
		if (e && e.target.value != line.ShippedQuantity) {
			e.target.value = parseInt(line.ShippedQuantity);
		}

		this.checkFullSoLuong().then((isFullQuantity) => {
			if (isFullQuantity && checkFullQuantity) {
				this.setFullQuantity();
			} else {
				this.calcLine(line);
			}
			this.calcOrder();
			this.renderCurrencyFormat();
		});
	}

	changeDiscount(i, e, ck) {
		if (!i.Discount1) i.Discount1 = 0;
		if (!i.Discount2) i.Discount2 = 0;
		if (!i.DiscountFromSalesman) i.DiscountFromSalesman = 0;

		let sumCK3 = this.item.SaleOrder.OrderLines.map((i) => i.DiscountFromSalesman).reduce((prev, next) => parseInt(prev) + parseInt(next));
		if (sumCK3 < 0) {
			i.DiscountFromSalesman = i.OriginalDiscountFromSalesman;
			e.target.value = i.DiscountFromSalesman;
			this.env.showAlert('Tổng bù giá phải lớn hơn hoặc bằng 0. Hệ thống sẽ lấy lại CK NVBH ban đầu.');
			// setTimeout(() => {
			//     i.DiscountFromSalesman = i.OriginalDiscountFromSalesman;
			// }, 0);
		}
		if (sumCK3 > this.item.SaleOrder.TotalAfterDiscount) {
			i.DiscountFromSalesman = i.OriginalDiscountFromSalesman;
			e.target.value = i.DiscountFromSalesman;
			this.env.showAlert('Tổng bù giá phải nhỏ hơn trị giá đơn hàng. Hệ thống sẽ lấy lại CK NVBH ban đầu.');
			// setTimeout(() => {
			//     i.DiscountFromSalesman = i.OriginalDiscountFromSalesman;
			// }, 0);
		}

		if (ck == 'CK1' && i.Discount1 > i.OriginalDiscount1 && !this.isShowAllDiscount) {
			i.Discount1 = i.OriginalDiscount1;
			if (e) {
				e.target.value = parseInt(i.Discount1);
			}
		} else if (ck == 'CK2' && i.Discount2 > i.OriginalDiscount2 && !this.isShowAllDiscount) {
			i.Discount2 = i.OriginalDiscount2;

			if (e) {
				e.target.value = parseInt(i.Discount2);
			}
		}

		this.changeSoLuong(i, null, false);
	}

	fullSoLuong = true;
	checkFullSoLuong() {
		return new Promise((resolve, reject) => {
			this.count++;
			if (this.count >= 100) {
				debugger;
			}

			let result = true;
			for (let index = 0; index < this.item.SaleOrder.OrderLines.length; index++) {
				const i = this.item.SaleOrder.OrderLines[index];
				if (i.ShippedQuantity != i.Quantity) {
					result = false;
					break;
				}
			}
			this.fullSoLuong = result;
			resolve(result);
		});
	}

	calcOrder() {
		console.log('calcOrder');
		this.count++;
		if (this.count >= 100) {
			debugger;
		}

		this.item.SaleOrder.TotalBeforeDiscount = 0;
		this.item.SaleOrder.Discount1 = 0;
		this.item.SaleOrder.Discount2 = 0;
		this.item.SaleOrder.DiscountByItem = 0;
		this.item.SaleOrder.DiscountByGroup = 0;
		this.item.SaleOrder.DiscountByLine = 0;
		this.item.SaleOrder.DiscountByOrder = 0;
		this.item.SaleOrder.DiscountFromSalesman = 0;
		this.item.SaleOrder.TotalDiscount = 0;
		this.item.SaleOrder.TotalAfterDiscount = 0;
		this.item.SaleOrder.Tax = 0;
		this.item.SaleOrder.TotalAfterTax = 0;
		this.item.TongSoLuongLe = 0;

		for (let index = 0; index < this.item.SaleOrder.OrderLines.length; index++) {
			const line = this.item.SaleOrder.OrderLines[index];

			this.item.SaleOrder.TotalBeforeDiscount += line.TotalBeforeDiscount;

			this.item.SaleOrder.Discount1 += line.Discount1;
			this.item.SaleOrder.Discount2 += line.Discount2;
			this.item.SaleOrder.DiscountByItem += line.DiscountByItem;
			this.item.SaleOrder.DiscountByGroup += line.DiscountByGroup;
			this.item.SaleOrder.DiscountByLine += line.DiscountByLine;
			this.item.SaleOrder.DiscountByOrder += line.DiscountByOrder;
			this.item.SaleOrder.TotalDiscount += line.TotalDiscount;
			this.item.SaleOrder.TotalAfterDiscount += line.TotalAfterDiscount;
			this.item.SaleOrder.Tax += line.Tax;
			this.item.SaleOrder.TotalAfterTax += line.TotalAfterTax;

			this.item.SaleOrder.DiscountFromSalesman += line.DiscountFromSalesman;

			this.item.TongSoLuongLe += line.ShippedQuantity;
		}

		this.item.SaleOrder.OriginalTotalAfterTax = Math.round(this.item.SaleOrder.OriginalTotalAfterTax);
		this.item.SaleOrder.TotalAfterTax = Math.round(this.item.SaleOrder.TotalAfterTax);

		if (this.item.SaleOrder.TotalAfterTax < this.item.SaleOrder.Received) {
			this.item.SaleOrder.Received = 0;
		}
		this.item.SaleOrder.Debt = this.item.SaleOrder.TotalAfterTax - this.item.SaleOrder.Received;
		this.item.SaleOrder.CustomerDebt = this.item.SaleOrder.Debt - (this.item.SaleOrder.DiscountFromSalesman - this.item.SaleOrder.ReceivedDiscountFromSalesman);

		if (this.item.TongSoLuongLe == 0) {
			this.item.IDStatus = 307;
		} else {
			this.item.IDStatus = 319;
		}
	}

	calcLine(i) {
		console.log('calcLine');
		this.count++;
		if (this.count >= 100) {
			debugger;
		}

		if (!i.Discount1) {
			i.Discount1 = 0;
		}
		if (!i.Discount2) {
			i.Discount2 = 0;
		}

		i.ReturnedQuantity = i.Quantity - i.ShippedQuantity;
		i.TotalBeforeDiscount = i.ShippedQuantity * i.UoMPrice;

		i.DiscountByItem = i.Discount1 + i.Discount2;
		if (i.DiscountByItem > i.TotalBeforeDiscount || i.DiscountByItem < 0) {
			i.Discount1 = 0;
			i.Discount2 = 0;
			i.DiscountByItem = 0;
		}

		if (i.ShippedQuantity == 0) {
			i.DiscountFromSalesman = 0;
		}

		i.Promotion = i.Promotion;
		i.DiscountByGroup = (i.Promotion / 100) * i.TotalBeforeDiscount;
		i.DiscountByLine = i.DiscountByItem + i.DiscountByGroup;
		i.DiscountByOrder = i.DiscountByOrder;

		i.TotalDiscount = i.DiscountByOrder + i.DiscountByLine;
		i.TotalAfterDiscount = i.TotalBeforeDiscount - i.TotalDiscount;
		if (i.DiscountFromSalesman > i.TotalAfterDiscount) {
			i.DiscountFromSalesman = 0;
		}

		i.Tax = i.TotalAfterDiscount * (i.TaxRate / 100);
		i.TotalAfterTax = i.TotalAfterDiscount + i.Tax;
	}

	reopenOrder() {
		this.item.IDStatus = 314;
		this.item.DA_GIAO_HANG = false;
		this.loadedData(null);
	}

	saveDonHang(daGiaoHang = true) {
		this.alertCtrl
			.create({
				header: 'Hoàn tất giao hàng',
				subHeader: 'Bạn sẽ không thể thay đổi sau khi đã xác nhận hoàn tất.',
				message: 'Vui lòng xác nhận lại số lượng đã giao và số tiền đã nhận.',
				buttons: [
					{
						text: 'Quay lại',
						handler: () => {},
					},
					{
						text: 'HOÀN TẤT',
						handler: () => {
							if (this.item.IsDebt) {
								// if (this.checkIsEditableShipmentDebt()) {
								//     this.item.IDStatus = 319;
								// }
							} else {
								this.item.DA_GIAO_HANG = daGiaoHang;
								if (this.checkIsEditableShipmentDetail()) {
									this.item.IDStatus = 319;
								}
							}

							this.updateDonHang().then((r) => {
								this.env.publishEvent({
									Code: this.pageConfig.pageName,
								});
								this.goBack();
							});
						},
					},
				],
			})
			.then((alert) => {
				alert.present();
			});
	}

	updateDonHang() {
		return new Promise((resolve, reject) => {
			this.env.getStorage('deliveryData').then((data) => {
				if (!data || !data.length) {
					this.env.showMessage('Please recheck. Cannot find Order {{value}} within the saved list.', '', this.item.SaleOrder.Id);
				} else {
					let found = false;
					this.item._state = 'waitSync';

					for (let i = 0; i < data.length; i++) {
						const s = data[i];
						for (let j = 0; j < s.ShipmentOrder.length; j++) {
							const so = s.ShipmentOrder[j];
							if (so.SaleOrder.Id == this.id) {
								s.ShipmentOrder[j] = this.item;
								found = true;
								i = data.length;
								break;
							}
						}
						if (found == false) {
							for (let j = 0; j < s.ShipmentDebt.length; j++) {
								const so = s.ShipmentDebt[j];
								if (so.SaleOrder.Id == this.id) {
									s.ShipmentDebt[j] = this.item;
									found = true;
									i = data.length;
									break;
								}
							}
						}
					}

					if (found == false) {
						this.env.showMessage('Please recheck. Cannot find Order {{value}} within the saved list.', '', this.item.SaleOrder.Id);
						reject(false);
					} else {
						this.env.setStorage('deliveryData', data).then((result) => {
							resolve(true);
						});
					}
				}
			});
		});
	}

	UpdatePosition() {
		let apiPath = {
			method: 'PUT',
			url: function () {
				return ApiSetting.apiDomain('SHIP/Shipment/DeliveryUpdatePosition');
			},
		};

		Geolocation.getCurrentPosition()
			.then((resp) => {
				this.item.position = 'lat: ' + resp.coords.latitude + ', long: ' + resp.coords.longitude;

				let c = {
					Id: this.item.SaleOrder.Id,
					Lat: resp.coords.latitude,
					Long: resp.coords.longitude,
				};
				this.pageProvider.commonService
					.connect(apiPath.method, apiPath.url(), c)
					.toPromise()
					.then((res) => {
						this.env.showMessage('Coordinates updated');
					});

				//console.log(resp.coords);
				// resp.coords.latitude
				// resp.coords.longitude
			})
			.catch((error) => {
				console.log('Error getting location', error);
			});
	}
}
