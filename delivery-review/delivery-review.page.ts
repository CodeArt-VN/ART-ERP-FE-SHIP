import { Component, ViewChild } from '@angular/core';
import { PageBase } from 'src/app/page-base';
import { CustomService } from 'src/app/services/custom.service';
import { EnvService } from 'src/app/services/core/env.service';
import { NavController, AlertController, PopoverController } from '@ionic/angular';
import Chart from 'chart.js';
import 'chartjs-plugin-labels';
import { lib } from 'src/app/services/static/global-functions';
import { PopoverPage } from '../../SYS/popover/popover.page';
import { ApiSetting } from 'src/app/services/static/api-setting';
import { SHIP_ShipmentProvider, SYS_StatusProvider } from 'src/app/services/static/services.service';

@Component({
	selector: 'app-delivery-review',
	templateUrl: './delivery-review.page.html',
	styleUrls: ['./delivery-review.page.scss'],
})
export class DeliveryReviewPage extends PageBase {
	statusList = [];
	canvasChart: any;


	@ViewChild('chartCanvas') chartCanvas;
	chartData = {};
	centerText = '';
	chartView = 'doanhThu';
	countLoad = 0;


	constructor(
		public pageProvider: SHIP_ShipmentProvider,
		public statusProvider: SYS_StatusProvider,
		public env: EnvService,
		public popoverCtrl: PopoverController,
		public alertCtrl: AlertController,
		public navCtrl: NavController,
	) {
		super();
		Chart.pluginService.register({
			beforeDraw: function (chart) {
				if (chart.config.options.elements.center) {
					//Get ctx from string
					var ctx = chart.chart.ctx;

					//Get options from the center object in options
					var centerConfig = chart.config.options.elements.center;
					var fontStyle = centerConfig.fontStyle || 'Arial';
					var txt = centerConfig.text;
					
					var sidePadding = centerConfig.sidePadding || 20;
					var sidePaddingCalculated = (sidePadding / 100) * (chart.innerRadius * 2)
					//Start with a base font of 30px
					ctx.font = "30px " + fontStyle;

					//Get the width of the string and also the width of the element minus 10 to give it 5px side padding
					var stringWidth = ctx.measureText(txt).width;
					var elementWidth = (chart.innerRadius * 2) - sidePaddingCalculated;

					// Find out how much the font can grow in width.
					var widthRatio = elementWidth / stringWidth;
					var newFontSize = Math.floor(30 * widthRatio);
					var elementHeight = (chart.innerRadius * 2);

					// Pick a new font size so it will not be larger than the height of label.
					var fontSizeToUse = Math.min(newFontSize, elementHeight);

					//Set font settings to draw it correctly.
					ctx.textAlign = 'center';
					ctx.textBaseline = 'middle';
					var centerX = ((chart.chartArea.left + chart.chartArea.right) / 2);
					var centerY = ((chart.chartArea.top + chart.chartArea.bottom) / 2);
					ctx.font = fontSizeToUse + "px " + fontStyle;
					ctx.fillStyle = lib.getCssVariableValue('--ion-color-primary');

					//Draw text in center
					ctx.fillText(txt, centerX, centerY);
				}
			}
		});
	}
	needReload = false;
	chartViews = 'doanhThu';
	public buildChart() {

		let IsNeedDestroy = false;
		if (this.tongTienMat != this.item.TotalOfCash || this.tongPhieuNo != this.item.TongPhieuNoMoi) {
			this.tongTienMat = this.item.TotalOfCash;
			this.tongPhieuNo = this.item.TongPhieuNoMoi;
			IsNeedDestroy = true;
		}
		if (this.chartViews != this.chartView) {
			this.chartView = this.chartViews;
			IsNeedDestroy = true;
		}

		if (this.canvasChart && IsNeedDestroy) {
			this.canvasChart.destroy();
		}
		else if (this.canvasChart && !IsNeedDestroy) {
			return;
		}

		if (this.chartView == 'doanhThu') {
			this.chartData = {
				datasets: [{
					data: [this.item.TotalOfDoneOrder, this.item.TotalOfReturnProduct, this.item.TotalOfUndoneOrder],
					backgroundColor: () => { return [lib.getCssVariableValue('--ion-color-primary'), lib.getCssVariableValue('--ion-color-medium'), lib.getCssVariableValue('--ion-color-dark')] },
					label: 'Doanh thu'
				}],
				// TotalOfDoneOrder = (i.TotalOfCashOrder + i.TotalOfDebtOrder)
				// i.TotalOfOrder = (i.TotalOfCashOrder + i.TotalOfDebtOrder) + i.TotalOfUndoneOrder + i.TotalOfReturnProduct;

				labels: ['Đã giao', 'Hàng rớt', 'Chưa giao']
			};
			this.centerText = this.item.NumberOfDoneOrder + '/' + this.item.NumberOfOrder;
		}
		else {
			this.chartData = {
				datasets: [{
					data: [this.item.TotalOfReceivedDebt, this.item.TotalRemainingDebt],
					backgroundColor: () => { return [lib.getCssVariableValue('--ion-color-primary'), lib.getCssVariableValue('--ion-color-dark')] },
					label: 'Công nợ'
				}],
				labels: ['Đã thu được', 'Còn lại']
			};
			this.centerText = this.item.NumberOfReceivedDebt + '/' + this.item.NumberOfDebt;
		}


		let doughnutOption = {
			maintainAspectRatio: false,
			responsive: true,
			// cutoutPercentage: 70,
			// rotation: 1 * Math.PI,
			// circumference: 1 * Math.PI,
			legend: {
				display: false
			},
			title: {
				display: false,
			},
			animation: {
				animateScale: true,
				animateRotate: true
			},
			tooltips: {
				callbacks: {
					label: function (tooltipItem, data) {
						//var label = ' ' + data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index] + ' đơn ' + data.labels[tooltipItem.index];
						//return label;
						var value = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];
						var label = data.labels[tooltipItem.index];
						if (value >= 1000000) {
							return label + ': ' + Intl.NumberFormat().format(value / 1000000.0) + ' triệu';
						}
						else {
							return label + ': ' + Intl.NumberFormat().format(value / 1000.0) + ' K';
						}
					}
				}
			},
			layout: {
				padding: {
					left: 5,
					right: 5,
					top: 5,
					bottom: 5
				}
			},
			plugins: {
				labels: {
					position: 'outside', // << display data label outside piechart segment
					//arc: true,  // << make label curve above piechart segment
					textMargin: 6,   // << spacing
					// render: 'percentage',  // << display in percent
					precision: 0,  // << display same as .toFixed(1), ex: 30.1%
					fontSize: 12,
					//fontStyle: 'bold',
					anchor: 'center',
					fontColor: () => lib.getCssVariableValue('--ion-color-dark'),
					//offset: 10,
					// render: (args) => {
					// return `${args.label}: ${args.value}%`;
					// return `${args.value}`;
					// }  // display item Name + Value at the same type (shouldn't use this since names are too long)

					render: (args) => {
						if (args.percentage < 2.5) {
							return '';
						}
						return `${args.percentage}%` //args.percentage + '%'; //`${args.label}: ${args.percentage}%`
					},   // if percentage value smaller than limit, then hide, else display. (to minimize and avoid overlapping datalabels)
				},

				// labels: [
				// 	{
				// 		render: 'label',
				// 		position: 'outside',
				// 		// outsidePadding: 40,
				// 		textMargin: 8
				// 		// showZero: true,
				// 	},
				// 	{
				// 		render: 'percentage',
				// 		fontColor: '#FFF',
				// 		precision: 0,
				// 		//arc: true,
				// 		//position: 'outside',
				// 		position: 'border'
				// 	}]
			},
			elements: {
				arc: {
					borderWidth: 0
				},
				center: {
					text: this.centerText,
					fontStyle: 'Arial', // Default is Arial
					sidePadding: 20 // Defualt is 20 (as a percentage)
				}
			},

		};

		let ctx = this.chartCanvas.nativeElement;
		this.canvasChart = new Chart(ctx, {
			type: 'doughnut',
			options: doughnutOption,
			data: this.chartData,
		});
		console.log(() => lib.getCssVariableValue('--ion-color-primary'));
	}

	events(e){
		if (e.Code == 'app:updatedUser') {
			this.needReload = true;
		}
	}

	refresh() {
		this.loadData();
	}
	interval = null;
	preLoadData() {
		if (this.env.user && this.env.user.UserName) {
			if (!this.query.DeliveryDate) {
				this.query.DeliveryDate = lib.dateFormat(new Date(), 'yyyy-mm-dd');
			}

			if (!this.pageConfig.canViewAllData) {
				this.query.IDShipper = this.env.user.StaffID;
			}
			this.statusProvider.read({ IDParent: 31 }).then(response => {
				this.statusList = response['data'];
				super.preLoadData();
			});
		}

		// this.interval = setInterval(() => {
		// 	this.refresh();
		// }, 15000);
	}

	ionViewWillLeave() {
		if (this.interval) {
			clearInterval(this.interval);
			this.interval = null;
		}
	}

	ionViewDidEnter() {
		if (this.needReload) {
			this.item = {};
			this.items = [];
			this.preLoadData();
		}
		if (!this.interval) {
			this.interval = setInterval(() => {
				//this.refresh();
			}, 15000);
		}
	}

	loadData(event = null) {

		if (this.pageProvider && this.query.DeliveryDate) {
			this.query.Skip = this.items.length;
			this.readData().then((result: any) => {
				if (result.length == 0) {
					this.pageConfig.isEndOfData = true;
				}
				this.items = result;
				this.loadedData(event);
			});
		}
		else {
			this.loadedData(event);
		}
	}

	loadedData(event) {

		this.item = {
			TotalOfDoneOrder: 0,
			NumberOfFailOrder: 0, NumberOfUndoneOrder: 0, NumberOfRemainingDebt: 0, NumberOfNewDebt: 0,
			TotalOfCash: 0, TotalOfUndoneOrder: 0, TotalOfReceivedDebt: 0, TotalRemainingDebt: 0,
			NumberOfReceivedDebt: 0, NumberOfDebt: 0, NumberOfDoneOrder: 0, NumberOfOrder: 0,
			TotalOfOrder: 0, TotalOfReturnProduct: 0, TotalOfCashOrder: 0, TotalOfDebtOrder: 0,
			NumberOfDoneVehicle: 0, NumberOfVehicle: 0,
		};

		this.items.forEach(i => {

			i.DeliveryTime = lib.dateFormat(i.DeliveryDate, 'hh:MM');

			//i.TotalOfOrder = (i.TotalOfCashOrder + i.TotalOfDebtOrder) + i.TotalOfUndoneOrder + i.TotalOfReturnProduct;

			i.NumberOfFailOrder = i.NumberOfOrder - i.NumberOfUndoneOrder - i.NumberOfDoneOrder;
			i.TotalOfReturnProduct = i.TotalOfOrder - i.TotalOfUndoneOrder - i.TotalOfDoneOrder;
			i.TotalOfDebtOrder = i.TotalOfDoneOrder - i.TotalOfCashOrder;


			i.TotalOfOrderText = lib.currencyFormat(i.TotalOfOrder);
			i.TotalOfCashOrderText = lib.currencyFormat(i.TotalOfCashOrder);
			i.TotalOfDebtOrderText = lib.currencyFormat(i.TotalOfDebtOrder);
			i.TotalOfReturnProductText = lib.currencyFormat(i.TotalOfReturnProduct);
			i.TotalOfUndoneOrderText = lib.currencyFormat(i.TotalOfUndoneOrder);

			i.TotalRemainingDebt = i.TotalOfDebt - i.TotalOfReceivedDebt;
			i.TotalOfReceivedDebtText = lib.currencyFormat(i.TotalOfReceivedDebt);
			i.TotalRemainingDebtText = lib.currencyFormat(i.TotalRemainingDebt);

			i.TotalOfCash = i.TotalOfCashOrder + i.TotalOfReceivedDebt;
			i.TotalOfCashText = lib.currencyFormat(i.TotalOfCash);


			this.item.TotalOfCashOrder += i.TotalOfCashOrder;
			this.item.NumberOfUndoneOrder += i.NumberOfUndoneOrder;
			this.item.TotalOfUndoneOrder += i.TotalOfUndoneOrder;
			this.item.NumberOfFailOrder += i.NumberOfFailOrder;
			this.item.TotalOfReturnProduct += i.TotalOfReturnProduct;
			this.item.TotalOfOrder += i.TotalOfOrder;
			this.item.TotalOfDoneOrder += i.TotalOfDoneOrder;

			this.item.NumberOfDoneOrder += i.NumberOfDoneOrder;
			this.item.NumberOfOrder += i.NumberOfOrder;
			this.item.NumberOfReceivedDebt += i.NumberOfReceivedDebt;
			this.item.NumberOfDebt += i.NumberOfDebt;
			this.item.TotalOfReceivedDebt += i.TotalOfReceivedDebt;

			this.item.TotalRemainingDebt += i.TotalRemainingDebt;

			this.item.TotalOfCash += i.TotalOfCash;
			this.item.NumberOfNewDebt += i.NumberOfNewDebt;
			this.item.NumberOfRemainingDebt += i.NumberOfRemainingDebt;

			this.item.TotalOfDebtOrder += i.TotalOfDebtOrder;
			this.item.NumberOfDoneVehicle += i.Status.Id == 328 ? 1 : 0;
			this.item.NumberOfVehicle += 1;

		});

		this.item.TotalOfUndoneOrderText = lib.currencyFormat(this.item.TotalOfUndoneOrder);
		this.item.TotalOfDebtOrderText = lib.currencyFormat(this.item.TotalOfDebtOrder);
		this.item.TotalOfReturnProductText = lib.currencyFormat(this.item.TotalOfReturnProduct);

		this.item.TotalOfCashOrderText = lib.currencyFormat(this.item.TotalOfCashOrder);
		this.item.TotalOfDebtOrderText = lib.currencyFormat(this.item.TotalOfDebtOrder);
		this.item.TotalOfReceivedDebtText = lib.currencyFormat(this.item.TotalOfReceivedDebt);
		this.item.TotalRemainingDebtText = lib.currencyFormat(this.item.TotalRemainingDebt);

		this.item.TotalOfDebt = this.item.TotalOfReceivedDebt + this.item.TotalRemainingDebt;
		this.item.CongNoTongText = lib.currencyFormat(this.item.TotalOfDebt);
		this.item.TotalOfCashText = lib.currencyFormat(this.item.TotalOfCash);

		this.item.TongPhieuNoMoi = this.item.NumberOfNewDebt + this.item.NumberOfRemainingDebt;
		this.item.TongGiaTri = this.item.TotalOfUndoneOrder + this.item.TotalOfCashOrder + this.item.TotalOfDebtOrder + this.item.TotalOfReturnProduct
		this.item.TongGiaTriText = lib.currencyFormat(this.item.TongGiaTri);

		this.countLoad++;
		if (this.item) {
			this.buildChart();
		}

		super.loadedData(event);
	}

	tongTienMat = 0;
	tongPhieuNo = 0;

	confirm(i) {
		let message = '<ul class="ion-text-left">';
		message += i.TotalOfCash ? '<li><b>' + i.TotalOfCashText + '</b> tiền mặt </ li>' : '';
		message += i.NumberOfNewDebt ? '<li><b>' + i.NumberOfNewDebt + '</b> phiếu nợ mới </ li>' : '';
		message += i.NumberOfRemainingDebt ? '<li><b>' + i.NumberOfRemainingDebt + '</b> phiếu nợ chưa thu hết </ li>' : '';

		message += '</ul>';

		this.alertCtrl.create({
			header: 'Nhận tiền hàng từ ' + i.Vehicle,
			subHeader: 'Đã kiểm tra và nhận đủ: ',
			message: message,
			buttons: [
				// {
				// 	text: 'Trở lại',
				// 	handler: () => {
				// 	}
				// },
				{
					text: 'Mất tiền/phiếu',
					handler: () => {
						this.XuLyMatAlert(i);
					}
				},
				{
					text: 'Nhận đủ',
					cssClass: 'success',
					handler: () => {
						this.ReceivedShipment(i);
					}
				}
			]
		}).then(alert => {
			alert.present();
		})
	}

	XuLyMatAlert(i) {
		this.alertCtrl.create({
			translucent: true,
			header: 'Nhận tiền hàng từ ' + i.Vehicle,
			subHeader: 'Số tiền bị mất sẽ được ghi nhận, hệ thống sẽ tạo phiếu tạm ứng cho NVGH',
			message: 'Vui lòng nhập số tiền hoặc giá trị phiếu bị mất quy ra tiền: ',
			inputs: [
				{
					name: 'SoTienMat',
					placeholder: 'Số tiền bị mất...',
					type: 'number',
					min: 0,
				},
				{
					name: 'GhiChu',
					id: 'paragraph',
					type: 'textarea',
					placeholder: 'Ghi chú...'
				},
			],

			buttons: [
				{
					text: 'Trở lại',
					handler: () => { }
				},
				{
					text: 'Ghi nhận',
					handler: (data) => {
						this.ReceivedShipment(i, true, data.SoTienMat, data.GhiChu);
					}
				}
			]
		}).then(alert => {
			alert.present();
		})
	}

	ReceivedShipment(i, IsLostMoney = false, LostAmount = 0, LostRemark = '') {
		if (this.submitAttempt) {
			return;
		}
		this.submitAttempt = true;
		let data = {
			Id: i.Id,
			IsLostMoney: IsLostMoney,
			LostAmount: LostAmount,
			LostRemark: LostRemark,

		}

		let apiPath = {
			method: "PUT",
			url: function (id) { return ApiSetting.apiDomain("SHIP/Shipment/ShipmentFinished/" + id) }
		};

		this.pageProvider.commonService.connect(apiPath.method, apiPath.url(i.Id), data).toPromise().then((resp:any) => {
			if (resp.Error) {
				console.log(resp);
			}
			this.submitAttempt = false;
			this.env.showTranslateMessage('erp.app.pages.shipping.delivery.message.money-received-complete','success');
			i.Status.Id = 328;
			this.item.NumberOfDoneVehicle = this.items.filter(i => i.Status.Id == 328).length;
		});
	}

	currentPopover = null;
	async presentPopover(ev: any) {
		if (!this.pageConfig.canSelectDate) {
			return;
		}
		let popover = await this.popoverCtrl.create({
			component: PopoverPage,
			componentProps: {
				popConfig: {
					type: 'PopSingleDate',
					isShowSingleDate: true,
					singleDateLabel: 'Ngày giao hàng'
				},
				popData: {
					singleDate: this.query.DeliveryDate
				}
			},
			event: ev,
			cssClass: 'delivery-review-filter',
			translucent: true
		});
		popover.onDidDismiss().then((result: any) => {
			console.log(result);
			if (result.data) {
				this.query.DeliveryDate = result.data.singleDate;
				this.refresh();
			}

		});
		this.currentPopover = popover;
		return await popover.present();
	}

	dismissPopover() {
		if (this.currentPopover) {
			this.currentPopover.dismiss().then(() => { this.currentPopover = null; });
		}
	}

	showDetail(i) {
		this.navCtrl.navigateForward('/delivery-review/' + i.Id);
	}

	readData() {
		let apiPath = {
			method: "GET",
			url: function () { return ApiSetting.apiDomain("RPT/SHIP/DailyReport") }
		};

		//this.query.IgnoredBranch = false;

		return this.pageProvider.commonService.connect(apiPath.method, apiPath.url(), this.query).toPromise()
	}

}
