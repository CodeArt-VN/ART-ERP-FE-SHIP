import { Component, ViewChild } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import {
  HRM_StaffProvider,
  SALE_OrderProvider,
  SHIP_ShipmentDetailProvider,
  SHIP_ShipmentProvider,
} from 'src/app/services/static/services.service';
import { ApiSetting } from 'src/app/services/static/api-setting';
import { lib } from 'src/app/services/static/global-functions';

@Component({
    selector: 'app-shipment',
    templateUrl: 'shipment.page.html',
    styleUrls: ['shipment.page.scss'],
    standalone: false
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
    public staffProvider: HRM_StaffProvider,
    public saleOrderProvider: SALE_OrderProvider,
    public shipmentDetailProvider: SHIP_ShipmentDetailProvider,

    public modalController: ModalController,
    public popoverCtrl: PopoverController,
    public alertCtrl: AlertController,
    public loadingController: LoadingController,
    public env: EnvService,
    public navCtrl: NavController,
  ) {
    super();

    this.pageConfig.isShowFeature = true;
    this.pageConfig.isShowSearch = true;

    this.exportQuery.ExpectedDeliveryDate = lib.dateFormat(new Date(), 'yyyy-mm-dd');
    this.exportQuery.IsAllOrders = true;
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
    this.query.IDStatus = '[301,302,303,304,305,306,329]';
    this.env.getStatus('ShipmentStatus').then((data) => {
      this.statusList = data;
      super.preLoadData(event);
    });
  }

  loadData(event) {
    this.pageProvider.apiPath.getList.url = function () {
      return ApiSetting.apiDomain('SHIP/Shipment/List');
    };
    super.loadData(event);
  }

  loadedData(event) {
    this.items.forEach((i) => {
      i.Query = i.DeliveryDate ? lib.dateFormat(i.DeliveryDate, 'yyyy-mm-dd') : '';
      i.DeliveryDateText = lib.dateFormat(i.DeliveryDate, 'dd/mm/yyyy');
      i.DeliveryTimeText = lib.dateFormat(i.DeliveryDate, 'hh:MM');
      i.OriginalTotalAfterTaxText = lib.currencyFormat(i.OriginalTotalAfterTax);
      i.ProductWeightText = lib.formatMoney(i.ProductWeight / 1000, 2);
      i.ProductDimensionsText = lib.formatMoney(i.ProductDimensions / 10 ** 6, 2);

      i.StatusText = lib.getAttrib(i.IDStatus, this.statusList);
      i.StatusColor = lib.getAttrib(i.IDStatus, this.statusList, 'Color', 'dark');
    });
    super.loadedData(event);

    //this.loadOrders();
  }

  loadOrders() {
    let OrderDateFrom = lib.dateFormat(new Date().setDate(new Date().getDate() - 14));
    let OrderDateTo = lib.dateFormat(new Date()) + ' 23:59:59';

    this.saleOrderProvider.apiPath.getList.url = function () {
      return ApiSetting.apiDomain('SALE/Order/ShippingList');
    };
    //this.saleOrderProvider.read({ IDStatus: '[101,102,103,104,110]', Take: 20000 }).then(resp => {
    this.saleOrderProvider.read({ Status: "['Approved','Redelivery']", Take: 20000 }).then((resp) => {
      this.orderList = resp['data'];
      this.routeList = [];
      this.sellerList = [];

      this.orderList.forEach((i) => {
        if (i.IDShipment == 0) {
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
        }

        i.OrderTimeText = i.OrderDate ? lib.dateFormat(i.OrderDate, 'hh:MM') : '';
        i.OrderDateText = i.OrderDate ? lib.dateFormat(i.OrderDate, 'dd/mm/yy') : '';
        i.OriginalTotalText = lib.currencyFormat(i.OriginalTotalAfterTax);
      });
    });
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
      .showLoading(
        'Please wait for a few moments',
        this.pageProvider.commonService.connect('PUT', 'SHIP/Shipment/AutoCreateShipment', dto).toPromise(),
      )

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

  deleteItems() {
    this.pageProvider.apiPath.delItem = {
      method: 'DELETE',
      url: function (id) {
        return ApiSetting.apiDomain('SHIP/Shipment/Delete/') + id;
      },
    };
    super.deleteItems(this.pageConfig.pageName);
  }
}
