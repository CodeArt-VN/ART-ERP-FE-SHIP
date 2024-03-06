import { Component } from '@angular/core';
import { PageBase } from 'src/app/page-base';
import { EnvService } from 'src/app/services/core/env.service';
import { NavController, AlertController, PopoverController } from '@ionic/angular';
import { lib } from 'src/app/services/static/global-functions';
import { PopoverPage } from '../../SYS/popover/popover.page';
import { ApiSetting } from 'src/app/services/static/api-setting';
import { SHIP_ShipmentProvider } from 'src/app/services/static/services.service';

@Component({
  selector: 'app-delivery-review',
  templateUrl: './delivery-review.page.html',
  styleUrls: ['./delivery-review.page.scss'],
})
export class DeliveryReviewPage extends PageBase {
  statusList = [];
  canvasChart: any;

  chartData = {};
  centerText = '';
  chartView = 'doanhThu';
  countLoad = 0;

  doanhThuChartData = [];
  congnoChartData = [];

  ChartStyle = {
    width: '100%',
    'min-height': '200px',
  };

  constructor(
    public pageProvider: SHIP_ShipmentProvider,
    public env: EnvService,
    public popoverCtrl: PopoverController,
    public alertCtrl: AlertController,
    public navCtrl: NavController,
  ) {
    super();
  }

  totalPieChart = {
    Id: 'totalPieChart',
    Title: '',
    Subtext: '',
    SeriesName: '',

    Legend: false,
    ItemLabel: false,
    Data: [],
    ColorTemplate: [],
    Type: 'Doughnut',
    Style: this.ChartStyle,
  };

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
    } else if (this.canvasChart && !IsNeedDestroy) {
      return;
    }

    this.doanhThuChartData = [];
    this.congnoChartData = [];
    if (this.chartView == 'doanhThu') {
      // this.chartData = {
      // 	datasets: [{
      // 		data: [this.item.TotalOfDoneOrder, this.item.TotalOfReturnProduct, this.item.TotalOfUndoneOrder],
      // 		backgroundColor: () => { return [lib.getCssVariableValue('--ion-color-primary'), lib.getCssVariableValue('--ion-color-medium'), lib.getCssVariableValue('--ion-color-dark')] },
      // 		label: 'Doanh thu'
      // 	}],
      // 	// TotalOfDoneOrder = (i.TotalOfCashOrder + i.TotalOfDebtOrder)
      // 	// i.TotalOfOrder = (i.TotalOfCashOrder + i.TotalOfDebtOrder) + i.TotalOfUndoneOrder + i.TotalOfReturnProduct;

      // 	labels: ['Đã giao', 'Hàng rớt', 'Chưa giao']
      // };
      // this.centerText = this.item.NumberOfDoneOrder + '/' + this.item.NumberOfOrder;

      let tempLabel = ['Đã giao', 'Hàng rớt', 'Chưa giao'];
      let tempData = [this.item.TotalOfDoneOrder, this.item.TotalOfReturnProduct, this.item.TotalOfUndoneOrder];

      for (let idx = 0; idx < tempData.length; idx++) {
        let tempObj = { value: tempData[idx], name: tempLabel[idx] };
        this.doanhThuChartData.push(tempObj);
      }

      // this.totalPieChart.Title = 'Doanh thu';
      this.totalPieChart.ColorTemplate = [
        lib.getCssVariableValue('--ion-color-primary'),
        lib.getCssVariableValue('--ion-color-medium'),
        lib.getCssVariableValue('--ion-color-dark'),
      ];
    } else {
      // this.chartData = {
      // 	datasets: [{
      // 		data: [this.item.TotalOfReceivedDebt, this.item.TotalRemainingDebt],
      // 		backgroundColor: () => { return [lib.getCssVariableValue('--ion-color-primary'), lib.getCssVariableValue('--ion-color-dark')] },
      // 		label: 'Công nợ'
      // 	}],
      // 	labels: ['Đã thu được', 'Còn lại']
      // };
      // this.centerText = this.item.NumberOfReceivedDebt + '/' + this.item.NumberOfDebt;

      let tempLabel = ['Đã thu được', 'Còn lại'];
      let tempData = [this.item.TotalOfReceivedDebt, this.item.TotalRemainingDebt];

      for (let idx = 0; idx < tempData.length; idx++) {
        let tempObj = { value: tempData[idx], name: tempLabel[idx] };
        this.congnoChartData.push(tempObj);
      }

      // this.totalPieChart.Title = 'Công nợ';
      this.totalPieChart.ColorTemplate = [
        lib.getCssVariableValue('--ion-color-primary'),
        lib.getCssVariableValue('--ion-color-dark'),
      ];
    }
    // console.log(() => lib.getCssVariableValue('--ion-color-primary'));
  }

  events(e) {
    if (e.Code == 'app:updatedUser') {
      this.needReload = true;
    }
  }

  refresh() {
    this.chartView = '';
    this.loadData();
  }
  interval = null;
  preLoadData(event) {
    if (this.env.user && this.env.user.UserName) {
      if (!this.query.DeliveryDate) {
        this.query.DeliveryDate = lib.dateFormat(new Date(), 'yyyy-mm-dd');
      }

      if (!this.pageConfig.canViewAllData) {
        this.query.IDShipper = this.env.user.StaffID;
      }
      this.env.getStatus('ShipmentStatus').then((data) => {
        this.statusList = data;
        super.preLoadData(event);
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
      this.preLoadData(null);
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
    } else {
      this.loadedData(event);
    }
  }

  loadedData(event) {
    this.item = {
      TotalOfDoneOrder: 0,
      NumberOfFailOrder: 0,
      NumberOfUndoneOrder: 0,
      NumberOfRemainingDebt: 0,
      NumberOfNewDebt: 0,
      TotalOfCash: 0,
      TotalOfUndoneOrder: 0,
      TotalOfReceivedDebt: 0,
      TotalRemainingDebt: 0,
      NumberOfReceivedDebt: 0,
      NumberOfDebt: 0,
      NumberOfDoneOrder: 0,
      NumberOfOrder: 0,
      TotalOfOrder: 0,
      TotalOfReturnProduct: 0,
      TotalOfCashOrder: 0,
      TotalOfDebtOrder: 0,
      NumberOfDoneVehicle: 0,
      NumberOfVehicle: 0,
    };

    this.items.forEach((i) => {
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
    this.item.TongGiaTri =
      this.item.TotalOfUndoneOrder +
      this.item.TotalOfCashOrder +
      this.item.TotalOfDebtOrder +
      this.item.TotalOfReturnProduct;
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

    this.alertCtrl
      .create({
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
            },
          },
          {
            text: 'Nhận đủ',
            cssClass: 'success',
            handler: () => {
              this.ReceivedShipment(i);
            },
          },
        ],
      })
      .then((alert) => {
        alert.present();
      });
  }

  XuLyMatAlert(i) {
    this.alertCtrl
      .create({
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
            placeholder: 'Ghi chú...',
          },
        ],

        buttons: [
          {
            text: 'Trở lại',
            handler: () => {},
          },
          {
            text: 'Ghi nhận',
            handler: (data) => {
              this.ReceivedShipment(i, true, data.SoTienMat, data.GhiChu);
            },
          },
        ],
      })
      .then((alert) => {
        alert.present();
      });
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
    };

    let apiPath = {
      method: 'PUT',
      url: function (id) {
        return ApiSetting.apiDomain('SHIP/Shipment/ShipmentFinished/' + id);
      },
    };

    this.pageProvider.commonService
      .connect(apiPath.method, apiPath.url(i.Id), data)
      .toPromise()
      .then((resp: any) => {
        if (resp.Error) {
          console.log(resp);
        }
        this.submitAttempt = false;
        this.env.showTranslateMessage('Cash received', 'success');
        i.Status.Id = 328;
        this.item.NumberOfDoneVehicle = this.items.filter((i) => i.Status.Id == 328).length;
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
          singleDateLabel: 'Ngày giao hàng',
        },
        popData: {
          singleDate: this.query.DeliveryDate,
        },
      },
      event: ev,
      cssClass: 'delivery-review-filter',
      translucent: true,
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
      this.currentPopover.dismiss().then(() => {
        this.currentPopover = null;
      });
    }
  }

  showDetail(i) {
    this.navCtrl.navigateForward('/delivery-review/' + i.Id);
  }

  readData() {
    let apiPath = {
      method: 'GET',
      url: function () {
        return ApiSetting.apiDomain('RPT/SHIP/DailyReport');
      },
    };

    //this.query.IgnoredBranch = false;

    return this.pageProvider.commonService.connect(apiPath.method, apiPath.url(), this.query).toPromise();
  }
}
