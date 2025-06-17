import { Component, ViewChild } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { HRM_StaffProvider, SALE_OrderProvider, SHIP_ShipmentDetailProvider, SHIP_ShipmentProvider, SHIP_VehicleProvider } from 'src/app/services/static/services.service';
import { ApiSetting } from 'src/app/services/static/api-setting';
import { lib } from 'src/app/services/static/global-functions';
import { IonModal } from '@ionic/angular/common';
import { ShipmentModalPage } from '../shipment-modal/shipment-modal.page';
import { ShipmentDebtPickerModalPage } from '../shipment-debt-picker-modal/shipment-debt-picker-modal.page';

@Component({
	selector: 'app-shipment',
	templateUrl: 'shipment.page.html',
	styleUrls: ['shipment.page.scss'],
	standalone: false,
})
export class ShipmentPage extends PageBase {
	branchList = [];
	statusList = [];

	segmentView = 's2';

	orderList = [];
	routeList = [];
	sellerList = [];

	constructor(
		public pageProvider: SHIP_ShipmentProvider,
		public vehicleProvider: SHIP_VehicleProvider,
		public staffProvider: HRM_StaffProvider,
		public saleOrderProvider: SALE_OrderProvider,
		public shipmentDetailProvider: SHIP_ShipmentDetailProvider,

		public modalController: ModalController,
		public popoverCtrl: PopoverController,
		public alertCtrl: AlertController,
		public loadingController: LoadingController,
		public env: EnvService,
		public navCtrl: NavController
	) {
		super();

		this.pageConfig.ShowFeature = true;
		// this.pageConfig.isShowSearch = true;

		this.exportQuery.ExpectedDeliveryDate = lib.dateFormat(new Date(), 'yyyy-mm-dd');
		this.exportQuery.IsAllOrders = true;
		this.pageConfig.dividers = [
			{
				field: 'DeliveryDate',
				dividerFn: (record, recordIndex, records) => {
					let a: any = recordIndex == 0 ? new Date('2000-01-01') : new Date(records[recordIndex - 1].DeliveryDate);
					let b: any = new Date(record.DeliveryDate);
					let mins = Math.floor((b - a) / 1000 / 60);

					if (Math.abs(mins) < 600) {
						return null;
					}
					return  lib.dateFormat(record.DeliveryDate, 'yyyy-mm-dd') ;
				},
			},
		];
	}

	toggleDateFilter() {
		if (this.exportQuery.ExpectedDeliveryDate == '') {
			this.exportQuery.ExpectedDeliveryDate = lib.dateFormat(new Date(), 'yyyy-mm-dd');
		} else {
			this.exportQuery.ExpectedDeliveryDate = '';
		}
	}

	preLoadData(event) {
		// let today = new Date();
		// this.query.DeliveryDate = lib.dateFormat(today, 'yyyy-mm-dd');
		this.sort.Id = 'Id';
		this.sortToggle('Id', true);
		//this.query.IDStatus = '[301,302,303,304,305,306,329]';
		this.env.getStatus('ShipmentStatus').then((data) => {
			this.statusList = data;
			super.preLoadData(event);
		});
		this.initVRP();
	}

	loadData(event) {
		this.pageProvider.apiPath.getList.url = function () {
			return ApiSetting.apiDomain('SHIP/Shipment/List');
		};
		super.loadData(event);
	}

	loadedData(event) {
		this.items.forEach((i) => {
			i._Status = this.statusList.find((d) => d.Id == i.IDStatus);
		});
		super.loadedData(event);

		//this.loadOrders();
	}

	showDetail(i) {
		this.navCtrl.navigateForward('/shipment/' + i.Id);
	}

	add() {
		let newMCP = {
			Id: 0,
		};
		this.showDetail(newMCP);
	}

	autoCreateShipment() {
		this.submitAttempt = true;
		let dto = {
			IDBranch: this.env.selectedBranch,
			IDBranchs: JSON.parse(this.env.selectedBranchAndChildren),
			DeliveryDate: this.exportQuery.ExpectedDeliveryDate,
		};

		this.env
			.showLoading('Please wait for a few moments', this.pageProvider.commonService.connect('PUT', 'SHIP/Shipment/AutoCreateShipment', dto).toPromise())

			.then(() => {
				this.submitAttempt = false;
				this.env.showMessage('Delivery assigned. Please check and adjust if necessary', 'warning');
				this.refresh();
			})
			.catch((err) => {
				if (err.message != null) {
					this.env.showMessage(err.message, 'danger');
				} else {
					this.env.showMessage('Cannot assign for delivery', 'danger');
				}
				this.submitAttempt = false;
				this.refresh();
			});
	}

	@ViewChild('importfile2') importfile: any;
	importManualShipment() {
		this.importfile.nativeElement.value = '';
		this.importfile.nativeElement.click();
	}

	async import2(event) {
		if (this.submitAttempt) {
			this.env.showMessage('Importing driver allocation. Please wait for completion', 'primary');
			return;
		}
		this.submitAttempt = true;
		this.env.publishEvent({
			Code: 'app:ShowAppMessage',
			IsShow: true,
			Id: 'FileImportShipment',
			Icon: 'flash',
			IsBlink: true,
			Color: 'danger',
			Message: 'đang import phân tài',
		});

		this.pageProvider.apiPath.postImport.method = 'UPLOAD';
		let url = 'SHIP/Shipment/importManualShipment?IDBranch=' + this.env.selectedBranch;
		this.pageProvider.apiPath.postImport.url = function () {
			return ApiSetting.apiDomain(url);
		};

		this.pageProvider
			.import(event.target.files[0])
			.then((response) => {
				this.submitAttempt = false;
				this.env.publishEvent({
					Code: 'app:ShowAppMessage',
					IsShow: false,
					Id: 'FileImportShipment',
				});
				this.refresh();
				//this.download(response);
			})
			.catch((err) => {
				this.submitAttempt = false;
				this.env.publishEvent({
					Code: 'app:ShowAppMessage',
					IsShow: false,
					Id: 'FileImportShipment',
				});
				this.refresh();
				this.env.showMessage('Import error, please check again', 'danger');
			});
	}

	exportQuery: any = {};
	exportAvailbleOrders() {
		let apiPath = {
			getExport: {
				method: 'GET',
				url: function () {
					return ApiSetting.apiDomain('SHIP/Shipment/ExportAvailableOrdersForShipment/');
				},
			},
		};
		this.loadingController
			.create({
				cssClass: 'my-custom-class',
				message: 'Đang tìm kiếm đơn hàng, xin vui lòng chờ giây lát...',
			})
			.then((loading) => {
				loading.present();
				this.pageProvider.commonService
					.export(apiPath, this.exportQuery)
					.then((response: any) => {
						if (loading) loading.dismiss();
						this.downloadURLContent(response);
					})
					.catch((err) => {
						console.log(err);
						if (loading) loading.dismiss();
					});
			});
	}

	delete() {
		this.pageProvider.apiPath.delItem = {
			method: 'DELETE',
			url: function (id) {
				return ApiSetting.apiDomain('SHIP/Shipment/Delete/') + id;
			},
		};
		super.delete(this.pageConfig.pageName);
	}



	/////////	// VRP (Vehicle Routing Problem) related methods
	vrpReady = false;
	constraintTypeList = ['None', 'Recommended', 'Max'];
	vehicleList = [];
	warehouseList = [];

	selectedSOList = [];
	selectedDebtList = [];
	selectedWarehouse: any = null;

	strategyList = [
		{ Code: 'CHEAPEST', Name: 'Lowest cost' },
		{ Code: 'FASTEST', Name: 'Fastest delivery time' },
	];

	vrpInputDTO: any = {
		IDWarehouse: 0,
		IsReviewVRP: true,
		Option: {
			Costs: [{ Type: 'Distance', Value: 1.0 }],
			Constraints: { Weight: 'Recommended', Volume: 'None' },
			SolutionStrategy: 'CHEAPEST',
			IsUseGoogleAPI: false,
		},
		Vehicles: [],
		SO: [],
		Debt: [],
	};

	isOpenVRP: boolean = false;
	vrpOutputDTO: any;

	initVRP() {
		this.vrpReady = false;
		Promise.all([this.vehicleProvider.read({ IgnoredBranch: true }), this.env.getWarehouses(false, true)])
			.then(([vehicles, warehouses]) => {
				this.vehicleList = vehicles['data'] || [];
				this.warehouseList = warehouses;
				if (warehouses.length > 0) this.vrpInputDTO.IDWarehouse = warehouses[0].Id;

				this.vrpReady = true;
			})
			.catch((err) => {
				this.env.showMessage('Could not load warehouse list', 'danger');
				console.error('Error loading warehouses:', err);
			});
	}

	onVRPOpen() {
		this.isOpenVRP = true;
		this.onWarehouseChange(null);
	}

	onWarehouseChange(e) {
		// Load saved vehicles and orders for the selected warehouse
		this.vrpInputDTO.IDWarehouse = this.vrpInputDTO.IDWarehouse || 0;
		this.env.getStorage('VRPInputVehiclesOfWarehouse_' + this.vrpInputDTO.IDWarehouse).then((data) => {
			if (data) {
				this.vrpInputDTO.Vehicles = this.vehicleList.filter((v) => data.some((s) => s == v.Id)).map((v) => v.Id);
			} else {
				this.vrpInputDTO.Vehicles = [];
			}
		});
		this.selectedWarehouse = this.warehouseList.find((w) => w.Id == this.vrpInputDTO.IDWarehouse) || null;
	}

	onVehicleChange(e) {
		// Save selected vehicles to storage
		this.env.setStorage('VRPInputVehiclesOfWarehouse_' + this.vrpInputDTO.IDWarehouse, this.vrpInputDTO.Vehicles);
	}

	onVRPcancel() {
		this.modalController.dismiss(null, 'cancel');
	}

	onVRPConfirm() {
		// Validate the VRP input data before confirming

		let message = [];
		if (!this.vrpInputDTO.IDWarehouse) {
			message.push('Please select a warehouse.');
		}
		if (this.vrpInputDTO.Vehicles.length === 0) {
			message.push('Please select at least one vehicle.');
		}

		if (!(this.vrpInputDTO.Debt.length || this.vrpInputDTO.SO.length)) {
			message.push('Please select at least one order.');
		}
		if (message.length > 0) {
			this.env.showMessage(message, 'danger', null, 0, true);
			return;
		}

		this.modalController.dismiss(this.vrpInputDTO, 'confirm');
	}

	onVRPWillDismiss(event: any) {
		this.isOpenVRP = false;

		if (event.detail.role === 'confirm') {
			// Handle the confirmed data here
			this.env
				.showLoading(
					'Đang phân bổ đơn hàng, xin vui lòng chờ giây lát',
					this.pageProvider.commonService.connect('POST', 'SHIP/Shipment/VRPCalc', this.vrpInputDTO).toPromise()
				)
				.then((response) => {
					this.vrpOutputDTO = response;
					console.log('VRP Output:', this.vrpOutputDTO);

					if (this.vrpInputDTO.IsReviewVRP) {
						// Draw the map or perform any other actions after successful allocation
						this.openReviewVRP();
					} else {
						this.vrpInputDTO.SO = [];
						this.vrpInputDTO.Debt = [];
						this.env.showMessage('Phân bổ đơn hàng thành công', 'success');
						this.refresh();
					}
				})
				.catch((err) => {
					if (err.message != null) {
						this.env.showMessage(err.message, 'danger');
					} else {
						this.env.showMessage('Không thể phân bổ đơn hàng', 'danger');
					}
				});
		}
	}

	async showShipmentModal() {
		const modal = await this.modalController.create({
			component: ShipmentModalPage,
			componentProps: {
				selectedIds: this.vrpInputDTO.SO,
				canViewAllOrders: this.pageConfig.canViewAllOrders,
			},
			cssClass: 'modal90',
		});

		await modal.present();
		const { data } = await modal.onWillDismiss();

		if (data && data.length) {
			this.selectedSOList = data;
			this.vrpInputDTO.SO = data.map((item) => item.Id);
		}
	}

	async showShipmentDebtModal() {
		const modal = await this.modalController.create({
			component: ShipmentDebtPickerModalPage,
			componentProps: {
				selectedIds: this.vrpInputDTO.Debt,
				canViewAllOrders: this.pageConfig.canViewAllOrders,
			},
			cssClass: 'modal90',
		});

		await modal.present();
		const { data } = await modal.onWillDismiss();

		if (data && data.length) {
			this.selectedDebtList = data;
			this.vrpInputDTO.Debt = data.map((item) => item.Id);
		}
	}

	isOpenReviewVRP: boolean = false;

	openReviewShipments() {
		// Load selected shipments into the VRP output DTO then open the review modal

		if (!this.vrpOutputDTO || !this.vrpOutputDTO.Shipments || this.vrpOutputDTO.Shipments.length === 0) {
			this.env.showMessage('No route data available to review.', 'danger');
			return;
		}

		this.openReviewVRP();
	}
	openReviewVRP() {
		this.isOpenVRP = false;
		this.isOpenReviewVRP = true;
	}

	onReviewVRPCancel() {
		this.isOpenReviewVRP = false;
		this.modalController.dismiss(null, 'cancel');
	}

	onReviewVRPConfirm() {
		// Validate the VRP output data before confirming
		let message = [];

		if (!this.vrpOutputDTO || !this.vrpOutputDTO.Shipments || this.vrpOutputDTO.Shipments.length === 0) {
			message.push('No route data available to confirm.');
		}

		if (message.length > 0) {
			this.env.showMessage(message, 'danger', null, 0, true);
			return;
		}

		this.modalController.dismiss(this.vrpOutputDTO, 'confirm');
	}

	onVRPDataChanged(updatedData: any) {
		// Update the VRP output data when changes are made in the review component
		this.vrpOutputDTO = updatedData;
	}
	onReviewVRPWillDismiss(event: any) {
		this.isOpenReviewVRP = false;

		if (event.detail.role === 'confirm') {
			// Handle the confirmed data here
			this.env
				.showLoading(
					'Đang cập nhật, xin vui lòng chờ giây lát',
					this.pageProvider.commonService.connect('POST', 'SHIP/Shipment/CreateShipmentFromVRPCalc', this.vrpOutputDTO).toPromise()
				)
				.then((response) => {
					this.env.showMessage('Đã lưu phân tài', 'success');
					this.refresh();
				})
				.catch((err) => {
					if (err.message != null) {
						this.env.showMessage(err.message, 'danger');
					} else {
						this.env.showMessage('Không thể lưu phân tài', 'danger');
					}
				});
		}
	}
}
