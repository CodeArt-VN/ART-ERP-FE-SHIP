import { Component, ChangeDetectorRef } from '@angular/core';
import { NavController, ModalController, LoadingController, AlertController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import {
  SALE_OrderProvider,
  HRM_StaffProvider,
  SHIP_ShipmentProvider,
  SHIP_VehicleProvider,
  BRA_BranchProvider,
} from 'src/app/services/static/services.service';
import { FormBuilder, Validators, FormControl } from '@angular/forms';
import { CommonService } from 'src/app/services/core/common.service';
import { NgSelectConfig } from '@ng-select/ng-select';
import { concat, of, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { ApiSetting } from 'src/app/services/static/api-setting';
import { lib } from 'src/app/services/static/global-functions';
import { ShipmentModalPage } from '../shipment-modal/shipment-modal.page';
import { ShipmentDebtPickerModalPage } from '../shipment-debt-picker-modal/shipment-debt-picker-modal.page';

@Component({
  selector: 'app-shipment-detail',
  templateUrl: './shipment-detail.page.html',
  styleUrls: ['./shipment-detail.page.scss'],
})
export class ShipmentDetailPage extends PageBase {
  //m3Mask = ['PPP-PPP', this.pattern];
  initItem = null;
  vehicleList = [];
  statusList = [];
  saller = null;
  branch = null;
  SelectedOrderList = [];
  SelectedDebtOrderList = [];
  wareHouseList = [];

  constructor(
    public pageProvider: SHIP_ShipmentProvider,
    public vehicleProvider: SHIP_VehicleProvider,
    public saleOrderProvider: SALE_OrderProvider,
    public branchProvider: BRA_BranchProvider,
    public staffProvider: HRM_StaffProvider,
    public env: EnvService,
    public navCtrl: NavController,
    public route: ActivatedRoute,
    public modalController: ModalController,
    public alertCtrl: AlertController,
    public formBuilder: FormBuilder,
    public cdr: ChangeDetectorRef,
    public loadingController: LoadingController,
  ) {
    super();
    this.route.queryParams.subscribe((e) => {
      if (e && e.shipment) {
        this.initItem = e.shipment;
      }
    });
    this.item = {};
    this.pageConfig.isDetailPage = true;
    this.id = this.route.snapshot.paramMap.get('id');
    this.formGroup = formBuilder.group({
      Id: new FormControl({ value: '', disabled: true }),
      IDBranch: new FormControl({ value: '', disabled: true }),
      Code: [''],
      Name: [''],
      Remark: [''],
      IDStatus: new FormControl({ value: '', disabled: true }),
      IDType: [''],
      ShipmentDetails: [''],
      IDVehicle: ['', Validators.required],

      IDWarehouse: ['', Validators.required],

      ProductWeight: new FormControl({ value: '', disabled: true }),
      ProductDimensions: new FormControl({ value: '', disabled: true }),

      ShippedDate: [''],

      IDShipper: ['', Validators.required],
      OriginalTotalAfterTax: new FormControl({
        value: '',
        disabled: true,
      }),
      DeliveryDatePart: ['', Validators.required],
      DeliveryTimePart: ['', Validators.required],

      Debt: new FormControl({ value: '', disabled: true }),
      //OrderLines: new FormArray([])
    });
  }

  preLoadData(event) {
    //Change to custome API
    this.pageProvider.apiPath.postItem.url = function () {
      return ApiSetting.apiDomain('SALE/Order/Add');
    };
    this.pageProvider.apiPath.putItem.url = function (id) {
      return ApiSetting.apiDomain('SALE/Order/Update/') + id;
    };
    this.env.getStatus('ShipmentStatus').then((data) => {
      this.statusList = data;
    });

    this.vehicleProvider.read({ IgnoredBranch: true }).then((response) => {
      this.vehicleList = response['data'];
      this.vehicleList.forEach((v) => {
        if (v.ShipperName) {
          v.Name = v.Name + ' - ' + v.ShipperName;
        }
      });
      super.preLoadData(event);
    });
    this.branchProvider.read({ Type: 'Warehouse' }).then((response) => {
      this.wareHouseList = response['data'];
    });
  }

  loadedData(event) {
    this.pageProvider.apiPath.postItem.url = function () {
      return ApiSetting.apiDomain('SHIP/Shipment/Add');
    };
    this.pageProvider.apiPath.putItem.url = function (id) {
      return ApiSetting.apiDomain('SHIP/Shipment/Update/') + id;
    };

    if (this.item.Id) {
      let blockedStatus = [
        //301	, //	Đã phân tài	31
        302, //	Đã giao đơn vị vận chuyển	31
        303, //	Đang lấy hàng	31
        304, //	Đang đóng gói	31
        305, //	Đang giao hàng	31
        306, //	Đã giao hàng	31
        328, //	Đã bàn giao	31
      ];
      if (blockedStatus.indexOf(this.item.IDStatus) > -1) {
        this.pageConfig.canEdit = false;
        this.pageConfig.canDelete = false;
      }

      this.item.DeliveryDatePart = lib.dateFormat(this.item.DeliveryDate, 'yyyy-mm-dd');
      this.item.DeliveryTimePart = lib.dateFormat(this.item.DeliveryDate, 'hh:MM');

      this.item.ProductDimensionsM = this.item.ProductDimensions / 10.0 ** 6;

      // this.fo.get('birthDate').setValue({
      //     year: parseInt(birthDate.format('YYYY'), 10),
      //     month: parseInt(birthDate.format('M'), 10),
      //     day: parseInt(birthDate.format('D'), 10)
      //   });

      this.loadSelectedShipper(this.item.IDShipper);
      this.loadSelectedOrders();
      this.loadSelectedDebtOrders();
    } else {
      if (this.initItem) {
        setTimeout(() => {
          if (this.initItem.DeliveryDate) {
            this.formGroup.get('DeliveryDatePart').setValue(lib.dateFormat(this.initItem.DeliveryDate, 'yyyy-mm-dd'));
          }

          if (this.initItem.IDVehicle) {
            this.formGroup.get('IDVehicle').setValue(this.initItem.IDVehicle);
            this.changedVehicle();
          }
        }, 0);
      }
    }

    super.loadedData(event);
  }

  segmentView = 's1';
  segmentChanged(ev: any) {
    this.segmentView = ev.detail.value;
  }

  loadSelectedShipper(IDShipper, isSaveChange = false) {
    this.staffProvider.getAnItem(IDShipper).then((resp) => {
      this.shipperListSelected.push(resp);
      this.shipperListSelected = [...this.shipperListSelected];
      this.shipperSearch();

      if (isSaveChange) {
        this.saveChange();
      }
    });
  }

  shipperList$;
  shipperListLoading = false;
  shipperListInput$ = new Subject<string>();
  shipperListSelected = [];
  shipperSelected = null;
  shipperSearch() {
    this.shipperListLoading = false;
    this.shipperList$ = concat(
      of(this.shipperListSelected),
      this.shipperListInput$.pipe(
        distinctUntilChanged(),
        tap(() => (this.shipperListLoading = true)),
        switchMap((term) =>
          this.staffProvider
            .search({
              Take: 20,
              Skip: 0,
              Term: term ? term : this.item.IDSeller,
            })
            .pipe(
              catchError(() => of([])), // empty list on error
              tap(() => (this.shipperListLoading = false)),
            ),
        ),
      ),
    );
  }

  changedVehicle() {
    let IDVehicle = this.formGroup.get('IDVehicle').value;
    let selectedVehicle = this.vehicleList.find((d) => d.Id == IDVehicle);
    if (selectedVehicle.IDShipper) {
      this.formGroup.get('IDShipper').setValue(selectedVehicle.IDShipper);
      this.loadSelectedShipper(selectedVehicle.IDShipper, true);
    } else {
      this.shipperSearch();
    }
  }

  isAllChecked = false;
  toggleSelectAll() {
    this.SelectedOrderList.forEach((i) => (i.checked = this.isAllChecked));
  }

  isAllDebtChecked = false;
  toggleDebtSelectAll() {
    this.SelectedDebtOrderList.forEach((i) => (i.checked = this.isAllDebtChecked));
  }

  sortToggle(field) {
    if (!this.sort[field]) {
      this.sort[field] = field;
    } else if (this.sort[field] == field) {
      this.sort[field] = field + '_desc';
    } else {
      delete this.sort[field];
    }

    let sortTerms = this.sort;

    let s = Object.keys(sortTerms).reduce(function (res, v) {
      return res.concat(sortTerms[v]);
    }, []);

    if (s.length) {
      this.query.SortBy = '[' + s.join(',') + ']';
    } else {
      delete this.query.SortBy;
    }

    this.loadSelectedOrders();
  }

  sortDebt: any = {};
  sortToggleDebt(field) {
    if (!this.sortDebt[field]) {
      this.sortDebt[field] = field;
    } else if (this.sortDebt[field] == field) {
      this.sortDebt[field] = field + '_desc';
    } else {
      delete this.sortDebt[field];
    }

    let sortTerms = this.sortDebt;

    let s = Object.keys(sortTerms).reduce(function (res, v) {
      return res.concat(sortTerms[v]);
    }, []);

    if (s.length) {
      this.debtQuery.SortBy = '[' + s.join(',') + ']';
    } else {
      delete this.debtQuery.SortBy;
    }

    this.loadSelectedDebtOrders();
  }

  saveChange(publishEventCode = this.pageConfig.pageName) {
    this.item.OrderIds = this.SelectedOrderList.map((e) => e.Id);
    this.item.DebtOrderIds = this.SelectedDebtOrderList.map((e) => e.Id);

    this.item.DeliveryDate =
      this.formGroup.get('DeliveryDatePart').value + ' ' + this.formGroup.get('DeliveryTimePart').value + ':00.0000000';

    return new Promise((resolve, reject) => {
      this.formGroup.updateValueAndValidity();

      if (!this.formGroup.valid) {
        this.env.showTranslateMessage('Please recheck information highlighted in red above', 'warning');
      } else if (this.submitAttempt == false) {
        this.submitAttempt = true;
        //lib.copyPropertiesValue(this.formGroup.value, this.item);
        // this.item = this.formGroup.value;
        // this.item.Id = this.id;
        Object.assign(this.item, this.formGroup.value);
        Object.keys(this.item).forEach((k) => {
          if (this.item[k] === null || this.item[k] === undefined || this.item[k] === '') delete this.item[k];
        });
        if (!this.item.hasOwnProperty('Id')) {
          this.item.Id = 0;
        }
        if (!this.item.hasOwnProperty('IsDisabled')) {
          this.item.IsDisabled = false;
        }

        // this.loadingController.create({
        //     cssClass: 'my-custom-class',
        //     message: 'Đang lưu dữ liệu...'
        // }).then(loading => {
        //     loading.present();
        if (!this.item.IDBranch) {
          this.item.IDBranch = this.env.selectedBranch;
        }
        this.pageProvider
          .save(this.item, this.pageConfig.isForceCreate)
          .then((savedItem: any) => {
            if (publishEventCode) {
              this.env.publishEvent({ Code: publishEventCode });
              console.log('saveChange', publishEventCode);
            }

            if (this.item.Id != savedItem.Id) {
              this.item.Id = savedItem.Id;
              this.id = savedItem.Id;
              this.item = savedItem;
              this.loadedData(null);
              if (window.location.hash.endsWith('/0')) {
                let newURL = window.location.hash.substring(0, window.location.hash.length - 1) + savedItem.Id;
                history.pushState({}, null, newURL);
              }
            }

            // if (loading) loading.dismiss();
            this.env.showTranslateMessage('Saving completed!', 'success');
            this.formGroup.markAsPristine();
            this.cdr.detectChanges();
            resolve(savedItem.Id);
            this.submitAttempt = false;
            this.savedChange(savedItem);
          })
          .catch((err) => {
            // if (loading) loading.dismiss();
            this.env.showTranslateMessage('Cannot save, please try again', 'danger');
            this.cdr.detectChanges();
            this.submitAttempt = false;
            reject(err);
          });
        // });
      }
    });
  }

  recalcShipment() {
    this.item.ProductDimensions = 0;
    this.item.ProductWeight = 0;

    for (let i = 0; i < this.SelectedOrderList.length; i++) {
      const order = this.SelectedOrderList[i];
      this.item.ProductDimensions += order.ProductDimensions;
      this.item.ProductWeight += order.ProductWeight;
    }

    for (let i = 0; i < this.SelectedDebtOrderList.length; i++) {
      const order = this.SelectedDebtOrderList[i];
      this.item.Debt += order.Debt;
    }

    let selectedVehicle = this.vehicleList.find((d) => d.Id == this.item.IDVehicle);

    this.item.ProductDimensionsM = this.item.ProductDimensions / 10.0 ** 6;
    this.formGroup.get('ProductDimensions').setValue(this.item.ProductDimensions);
    this.formGroup.get('ProductWeight').setValue(this.item.ProductWeight);
    this.formGroup.get('Debt').setValue(this.item.Debt);

    this.item.WeightLoading = this.item.ProductWeight / 1000 / selectedVehicle.WeightMax;
    this.item.WeightLoadingBuffer = selectedVehicle.WeightRecommend / selectedVehicle.WeightMax;
    this.item.WeightRecommend = selectedVehicle.WeightRecommend;
    this.item.WeightMax = selectedVehicle.WeightMax;
    //selectedVehicle.MinWeight: 0

    this.item.VolumeLoading = this.item.ProductDimensionsM / selectedVehicle.VolumeMax;
    this.item.VolumeLoadingBuffer = selectedVehicle.VolumeRecommend / selectedVehicle.VolumeMax;
    this.item.VolumeRecommend = selectedVehicle.VolumeRecommend;
    this.item.VolumeMax = selectedVehicle.VolumeMax;
    //selectedVehicle.VolumeMin: 0
  }

  loadSelectedOrders() {
    this.SelectedOrderList = this.item.Orders;
    this.item.OrderIds = this.SelectedOrderList.map((e) => e.Id);

    this.SelectedOrderList.forEach((i) => {
      i.OrderTimeText = i.OrderDate ? lib.dateFormat(i.OrderDate, 'hh:MM') : '';
      i.OrderDateText = i.OrderDate ? lib.dateFormat(i.OrderDate, 'dd/mm/yy') : '';
      i.Query = i.OrderDate ? lib.dateFormat(i.OrderDate, 'yyyy-mm-dd') : '';
      i.OriginalTotalText = lib.currencyFormat(i.OriginalTotalAfterTax);
      i.ProductWeightText = lib.formatMoney(i.ProductWeight, 2);
      i.ProductDimensionsText = lib.formatMoney(i.ProductDimensions / 10 ** 3, 1);
    });
    this.recalcShipment();
  }

  debtQuery: any = {
    Take: 2000,
  };
  loadSelectedDebtOrders() {
    this.SelectedDebtOrderList = this.item.Debts;
    this.item.DebtOrderIds = this.SelectedDebtOrderList.map((e) => e.Id);

    this.SelectedDebtOrderList.forEach((i) => {
      i.OrderTimeText = i.OrderDate ? lib.dateFormat(i.OrderDate, 'hh:MM') : '';
      i.OrderDateText = i.OrderDate ? lib.dateFormat(i.OrderDate, 'dd/mm/yy') : '';
      i.Query = i.OrderDate ? lib.dateFormat(i.OrderDate, 'yyyy-mm-dd') : '';
      i.TotalText = lib.currencyFormat(i.TotalAfterTax);
      i.DebtText = lib.currencyFormat(i.Debt);
    });
    this.recalcShipment();
  }

  removeAlSelectedOrder() {
    let selectedOrdersToDelete = this.SelectedOrderList.filter((d) => d.checked);
    for (let i = 0; i < selectedOrdersToDelete.length; i++) {
      const o = selectedOrdersToDelete[i];
      const index = this.SelectedOrderList.indexOf(o, 0);
      if (index > -1) {
        this.SelectedOrderList.splice(index, 1);
      }
    }

    this.recalcShipment();
    this.saveChange();
  }

  removeAlSelectedDebtOrder() {
    let selectedDebtOrdersToDelete = this.SelectedDebtOrderList.filter((d) => d.checked);
    for (let i = 0; i < selectedDebtOrdersToDelete.length; i++) {
      const o = selectedDebtOrdersToDelete[i];
      const index = this.SelectedDebtOrderList.indexOf(o, 0);
      if (index > -1) {
        this.SelectedDebtOrderList.splice(index, 1);
      }
    }

    this.recalcShipment();
    this.saveChange();
  }

  removeSelectedOrder(i) {
    const index = this.SelectedOrderList.indexOf(i, 0);
    if (index > -1) {
      this.SelectedOrderList.splice(index, 1);
    }
    this.recalcShipment();
    this.saveChange();
  }

  removeSelectedDebtOrder(i) {
    const index = this.SelectedDebtOrderList.indexOf(i, 0);
    if (index > -1) {
      this.SelectedDebtOrderList.splice(index, 1);
    }
    this.recalcShipment();
    this.saveChange();
  }

  async showShipmentModal() {
    const modal = await this.modalController.create({
      component: ShipmentModalPage,
      componentProps: {
        id: this.item.Id,
      },
      cssClass: 'modal90',
    });

    await modal.present();
    const { data } = await modal.onWillDismiss();

    if (data && data.length) {
      for (let i = 0; i < data.length; i++) {
        const e = data[i];
        if (this.SelectedOrderList.findIndex((d) => d.Id == e.Id) == -1) {
          this.SelectedOrderList.push(e);
        }
      }

      this.recalcShipment();
      this.saveChange();
    }
  }

  async showShipmentDebtModal() {
    const modal = await this.modalController.create({
      component: ShipmentDebtPickerModalPage,
      componentProps: {
        id: this.item.Id,
      },
      cssClass: 'modal90',
    });

    await modal.present();
    const { data } = await modal.onWillDismiss();

    if (data && data.length) {
      for (let i = 0; i < data.length; i++) {
        const e = data[i];
        if (this.SelectedDebtOrderList.findIndex((d) => d.Id == e.Id) == -1) {
          this.SelectedDebtOrderList.push(e);
        }
      }

      this.recalcShipment();
      this.saveChange();
    }
  }

  delete() {
    this.pageProvider.apiPath.delItem = {
      method: 'DELETE',
      url: function (id) {
        return ApiSetting.apiDomain('SHIP/Shipment/Delete/') + id;
      },
    };
    super.delete();
  }
}
