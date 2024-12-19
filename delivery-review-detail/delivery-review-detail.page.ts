import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { SHIP_ShipmentProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { ApiSetting } from 'src/app/services/static/api-setting';
import { lib } from 'src/app/services/static/global-functions';
import QRCode from 'qrcode';
import { ActivatedRoute } from '@angular/router';

@Component({
    selector: 'app-delivery-review-detail',
    templateUrl: 'delivery-review-detail.page.html',
    styleUrls: ['delivery-review-detail.page.scss'],
    standalone: false
})
export class DeliveryReviewDetailPage extends PageBase {
  constructor(
    public pageProvider: SHIP_ShipmentProvider,

    public modalController: ModalController,
    public alertCtrl: AlertController,
    public loadingController: LoadingController,
    public env: EnvService,
    public route: ActivatedRoute,
    public navCtrl: NavController,
    public location: Location,
  ) {
    super();
    this.id = this.route.snapshot.paramMap.get('id');
    this.pageConfig.isShowFeature = false;
    this.pageConfig.isDetailPage = true;
  }

  loadData(event) {
    this.loadShipmentDocument();
    super.loadedData(event);
  }

  sheets = [];
  loadShipmentDocument() {
    if (this.submitAttempt) {
      this.env.showMessage('Data checking');
      return;
    }
    this.submitAttempt = true;

    let docQuery: any = {
      Id: this.id,
      IgnoredBranch: true,
    };

    let apiPath = {
      method: 'GET',
      url: function () {
        return ApiSetting.apiDomain('SHIP/Shipment/ShipmentReview');
      },
    };

    this.loadingController
      .create({
        cssClass: 'my-custom-class',
        message: 'Đang kiểm tra số liệu...',
      })
      .then((loading) => {
        loading.present();

        this.pageProvider.commonService
          .connect(apiPath.method, apiPath.url(), docQuery)
          .toPromise()
          .then((resp: any) => {
            for (let si = 0; si < resp.length; si++) {
              const s = resp[si];
              let itemList = [];

              s.DeliveryDateText = lib.dateFormat(s.DeliveryDate, 'dd/mm/yy hh:MM');
              s.TotalOfNewDebtOrder = s.TotalOfDoneOrder - s.TotalOfCashOrder;
              s.TotalOfNewDebtOrderText = lib.currencyFormat(s.TotalOfNewDebtOrder);
              s.TotalOfCashOrderText = lib.currencyFormat(s.TotalOfCashOrder);
              s.TotalOfUndoneOrderText = lib.currencyFormat(s.TotalOfUndoneOrder);
              s.TotalOfReceivedDebtText = lib.currencyFormat(s.TotalOfReceivedDebt);
              s.TotalOfDebtText = lib.currencyFormat(s.TotalOfDebt);

              let stt = 1;

              for (let i = 0; i < s.ShipmentOrder.length; i++) {
                const o = s.ShipmentOrder[i];

                o.Debt = o.SaleOrder.TotalAfterTax - o.Received;
                o.DebtText = lib.currencyFormat(o.Debt);
                o.ReceivedText = lib.currencyFormat(o.Received);

                o.SaleOrder.OriginalTotalAfterTaxText = lib.currencyFormat(o.SaleOrder.OriginalTotalAfterTax);
                o.SaleOrder.TotalAfterTaxText = lib.currencyFormat(o.SaleOrder.TotalAfterTax);

                for (let j = 0; j < o.SaleOrder.OrderLines.length; j++) {
                  const l = o.SaleOrder.OrderLines[j];
                  l.STT = stt++;

                  let findItem = itemList.find((d) => d.IDItem == l.IDItem);
                  if (!findItem) {
                    findItem = {
                      IDItem: l.IDItem,
                      ItemCode: l.ItemCode,
                      ItemName: l.ItemName,
                      IDInventoryUoM: l.IDInventoryUoM,
                      InventoryUoMBaseQuantity: l.InventoryUoMBaseQuantity,
                      UoMs: [],
                    };
                    itemList.push(findItem);
                  }

                  let uom = null;
                  if (l.IsBaseUoM || l.IDInventoryUoM == l.IDUoM) {
                    uom = findItem.UoMs.find((d) => d.IDUoM == 0);
                    if (!uom) {
                      uom = {
                        IDUoM: 0,
                        BaseQuantity: 0,
                        InventoryQuantity: 0,
                      };
                      findItem.UoMs.push(uom);
                    }

                    if (l.IsBaseUoM) {
                      uom.BaseQuantity += l.Quantity - l.ShippedQuantity;
                    } else {
                      uom.InventoryQuantity += l.Quantity - l.ShippedQuantity;
                    }

                    if (
                      uom.BaseQuantity >= findItem.InventoryUoMBaseQuantity &&
                      findItem.InventoryUoMBaseQuantity > 0
                    ) {
                      uom.InventoryQuantity +=
                        (uom.BaseQuantity - (uom.BaseQuantity % findItem.InventoryUoMBaseQuantity)) /
                        findItem.InventoryUoMBaseQuantity;
                      uom.BaseQuantity = uom.BaseQuantity % findItem.InventoryUoMBaseQuantity;
                    }
                  } else {
                    uom = findItem.UoMs.find((d) => d.IDUoM == l.IDUoM);
                    if (!uom) {
                      uom = {
                        IDUoM: l.IDUoM,
                        UoMName: l.UoMName,
                        Quantity: 0,
                      };

                      findItem.UoMs.push(uom);
                    }

                    uom.Quantity += l.Quantity - l.ShippedQuantity;
                  }
                }
              }

              s.Items = itemList
                .filter(
                  (d) =>
                    d.UoMs.findIndex((s) => s.IDUoM == 0 && (s.BaseQuantity > 0 || s.InventoryQuantity > 0)) > -1 ||
                    d.UoMs.findIndex((s) => s.IDUoM != 0 && s.Quantity > 0) > -1,
                )
                .sort((a, b) => parseFloat(b.IDItem) - parseFloat(a.IDItem));

              for (let i = 0; i < s.ShipmentDebt.length; i++) {
                const o = s.ShipmentDebt[i];

                o.RemainingDebt = o.Debt - o.Received;
                o.DebtText = lib.currencyFormat(o.Debt);
                o.ReceivedText = lib.currencyFormat(o.Received);
                o.RemainingDebtText = lib.currencyFormat(o.RemainingDebt);
              }
            }

            this.sheets = resp;
            this.submitAttempt = false;
            if (loading) loading.dismiss();
          })
          .catch((err) => {
            this.submitAttempt = false;
            if (err.message != null) {
              this.env.showMessage(err.message, 'danger');
            } else {
              this.env.showMessage('Cannot create pick - up list', 'danger');
            }
            if (loading) loading.dismiss();
          });
      });
  }
}
