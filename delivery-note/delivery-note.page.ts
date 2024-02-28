import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BRA_BranchProvider, SHIP_ShipmentProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { ApiSetting } from 'src/app/services/static/api-setting';
import { lib } from 'src/app/services/static/global-functions';
import QRCode from 'qrcode'
import { ActivatedRoute } from '@angular/router';

@Component({
    selector: 'app-delivery-note',
    templateUrl: 'delivery-note.page.html',
    styleUrls: ['delivery-note.page.scss']
})
export class DeliveryNotePage extends PageBase {
    branchList = [];

    constructor(
        public pageProvider: SHIP_ShipmentProvider,
        public branchProvider: BRA_BranchProvider,
        public modalController: ModalController,
		public popoverCtrl: PopoverController,
        public alertCtrl: AlertController,
        public loadingController: LoadingController,
        public env: EnvService,
        public navCtrl: NavController,
        public location: Location,
        public route: ActivatedRoute,
    ) {
        super();
        this.pageConfig.isShowFeature = true;
        this.id = this.route.snapshot.paramMap.get('id');
        //let today = new Date;
        //this.query.DeliveryDate = lib.dateFormat(today.setDate(today.getDate() + 1), 'yyyy-mm-dd');
        this.query.IDStatus = '[301]';
    }

    loadData(event) {
        this.pageProvider.apiPath.getList.url = function () { return ApiSetting.apiDomain("SHIP/Shipment/List") };
        super.loadData(event);
    }

    loadedData(event) {
        this.items.forEach(i => {
            i.DeliveryDateText = lib.dateFormat(i.DeliveryDate, 'dd/mm/yy hh:MM');
            i.DeliveryTimeText = lib.dateFormat(i.DeliveryDate, 'hh:MM');
        });
        super.loadedData(event);

        if (this.id) {
            this.loadDeliveryNote({ Id: this.id });
        }
    }

    selectedShipmentID = 0;
    sheets: any = [];
    loadDeliveryNote(i) {

        this.selectedShipmentID = i.Id;
        this.id = this.selectedShipmentID;

        let newURL = window.location.hash.substring(0, 15) + '/' + this.id;
        history.pushState({}, null, newURL);

        // if(!this.query.DeliveryDate){
        //     let today = new Date;
        //     this.query.DeliveryDate = lib.dateFormat(today.setDate(today.getDate() + 1), 'yyyy-mm-dd');
        // }

        let docQuery: any = {
            //DeliveryDate: this.query.DeliveryDate,
        };

        if (i.Id) {
            docQuery.Id = i.Id;
        }

        this.submitAttempt = true;

        let apiPath = {
            method: "GET",
            url: function () { return ApiSetting.apiDomain("SHIP/Shipment/PickingList2") }
        };

        this.loadingController.create({
            cssClass: 'my-custom-class',
            message: 'Đang tạo phiếu GNTT...'
        }).then(loading => {
            loading.present();

            this.pageProvider.commonService.connect(apiPath.method, apiPath.url(), docQuery).toPromise()
                .then((resp: any) => {
                    this.sheets = resp;

                    for (let si = 0; si < this.sheets.length; si++) {
                        const s = this.sheets[si];

                        s.DeliveryDateText = lib.dateFormat(s.DeliveryDate, 'dd/mm/yy hh:MM');
                        s.NumberOfOrders = 0;
                        s.TotalOrders = 0;

                        for (let i = 0; i < s.Customers.length; i++) {
                            const c = s.Customers[i];

                            for (let j = 0; j < c.Orders.length; j++) {
                                const o = c.Orders[j];

                                s.NumberOfOrders++;

                                o.STT = s.NumberOfOrders;
                                s.TotalOrders += o.OriginalTotalAfterTax;

                                o.OrderDateText = lib.dateFormat(o.OrderDate, 'dd/mm/yyyy');
                                o.OriginalTotalBeforeDiscountText = lib.currencyFormat(o.OriginalTotalBeforeDiscount);
                                o.OriginalTotalDiscountText = lib.currencyFormat(o.OriginalTotalDiscount);
                                o.OriginalTaxText = lib.currencyFormat(o.OriginalTax);

                                o.OriginalTotalAfterTaxText = lib.currencyFormat(o.OriginalTotalAfterTax);
                                o.OriginalDiscountFromSalesmanText = lib.currencyFormat(o.OriginalDiscountFromSalesman);
                                o.OriginalTotalAfterDiscountFromSalesmanText = lib.currencyFormat(o.OriginalTotalAfterTax - o.OriginalDiscountFromSalesman);
                                o.DocTienBangChu = this.DocTienBangChu(o.OriginalTotalAfterTax);
                                o.HasDiscountFromSalesman = false;
                                o.ShowCalcPromotion = false;

                                if(o.VietQR){
                                    QRCode.toDataURL(o.VietQR, { errorCorrectionLevel: 'M', version: 6, width: 500, scale: 20, type: 'image/webp' }, function (err, url) {
                                        o.QRC = url;
                                    })
                                }
                                else{
                                    QRCode.toDataURL('O:' + o.Id, { errorCorrectionLevel: 'H', version: 2, width: 500, scale: 20, type: 'image/webp' }, function (err, url) {
                                        o.QRC = url;
                                    })
                                }

                                

                                o.Items = this.calcSheet1(o);
                                o.BuGiaItems = this.calcSheetBuGia(o);
                                //o.OrderLines.sort((a, b) => (parseFloat(a.ItemSort) - parseFloat(b.ItemSort)) || a.Item.Code.localeCompare(b.Item.Code));

                                o.PromotionTracking.forEach(p => {
                                    p.ChietKhauText = lib.currencyFormat(p.ChietKhau);
                                });
                            }
                        }

                        s.TotalOrdersText = lib.currencyFormat(s.TotalOrders);
                    };

                    this.submitAttempt = false;
                    if (loading) loading.dismiss();
                    setTimeout(() => {
                        this.calcPageBreak();
                    }, 100);
                })
                .catch(err => {
                    console.log(err);
                    if (err.message != null) {
                        this.env.showMessage(err.message, 'danger');
                    }
                    else {
                        this.env.showTranslateMessage('Cannot create pick - up list','danger');
                    }
                    this.submitAttempt = false;
                    if (loading) loading.dismiss();
                });

        });
    }

    calcSheet1(o) {
        let itemList = [];

        for (let i = 0; i < o.OrderLines.length; i++) {
            const l = o.OrderLines[i];

            if (l.Item.InventoryUoM == null) {
                l.Item.InventoryUoM = { BaseQuantity: 1, AlternativeQuantity: 1 }
            }

            let giaLe = (l.UoMPrice * l.Item.UoM.AlternativeQuantity) / l.Item.UoM.BaseQuantity;
            let giaThung = (giaLe * l.Item.InventoryUoM.BaseQuantity) / l.Item.InventoryUoM.AlternativeQuantity;

            l.OriginalTotalAfterDiscountFromSalesman = l.OriginalTotalAfterTax - l.OriginalDiscountFromSalesman;
            l.SalesmanPrice = Math.round(l.OriginalTotalAfterDiscountFromSalesman / l.Quantity);
            l.OriginalTotalDiscountText = lib.formatMoney(l.OriginalTotalDiscount, 0);

            let findItem = itemList.find(d => d.IDItem == l.IDItem && Math.abs(d.UoMBasePrice * 10 - giaLe * 10) < 1);

            if (!findItem) {
                findItem = {
                    IDItem: l.IDItem,
                    ItemCode: l.Item.Code,
                    ItemName: l.Item.Name,

                    UoMBasePrice: giaLe,
                    UoMBasePriceText: lib.formatMoney(giaLe, 0),
                    GiaThung: giaThung,
                    GiaThungText: lib.formatMoney(giaThung, 0),

                    OriginalTotalBeforeDiscount: 0,
                    OriginalTotalDiscount: 0,
                    OriginalTotalAfterDiscount: 0,

                    OriginalDiscountFromSalesman: 0,
                    ItemGroupName: l.ItemGroupName,
                    ItemSort: giaLe > 0 ? -1 : 1,

                    //InventoryUoMBaseQuantity: l.Item.InventoryUoM.BaseQuantity / l.Item.InventoryUoM.AlternativeQuantity,

                    UoMs: []
                };
                itemList.push(findItem);
            }

            if (l.OriginalDiscountFromSalesman != 0) {
                findItem.OriginalDiscountFromSalesman += l.OriginalDiscountFromSalesman;
                o.HasDiscountFromSalesman = true;
            }

            if ((l.OriginalTotalDiscount || l.OriginalTotalAfterTax==0) && o.PromotionTracking.length == 0) {
                o.ShowCalcPromotion = true;
            }

            this.calcSumQty(findItem, l);

        };

        itemList.sort((a, b) => (parseFloat(a.ItemSort) - parseFloat(b.ItemSort)) || a.ItemCode.localeCompare(b.ItemCode));
        o.OrderLines.sort((a, b) => (parseFloat(a.ItemSort) - parseFloat(b.ItemSort)) || a.Item.Code.localeCompare(b.Item.Code));
        
        return itemList;
    }

    calcSumQty(findItem, l) {
        findItem.OriginalTotalBeforeDiscount += l.OriginalTotalBeforeDiscount;
        findItem.OriginalTotalDiscount += l.OriginalTotalDiscount;
        findItem.OriginalTotalAfterDiscount += l.OriginalTotalAfterDiscount;

        findItem.OriginalTotalBeforeDiscountText = lib.formatMoney(findItem.OriginalTotalBeforeDiscount, 0);
        findItem.OriginalTotalDiscountText = lib.formatMoney(findItem.OriginalTotalDiscount, 0);
        findItem.OriginalTotalAfterDiscountText = lib.formatMoney(findItem.OriginalTotalAfterDiscount, 0);

        let calcUom = findItem.UoMs.find(d => d.IDUoM == 0);
        if (!calcUom) {
            calcUom = {
                IDUoM: 0,
                BaseQuantity: 0,
                InventoryQuantity: 0,
            }
            findItem.UoMs.push(calcUom);
        }

        if ((l.Item.UoM.Id == l.Item.BaseUoM.Id || l.Item.UoM.Id == l.Item.InventoryUoM.Id)) {

            if (l.Item.UoM.Id == l.Item.BaseUoM.Id) {
                calcUom.BaseQuantity += l.Quantity;
            }
            else {
                calcUom.InventoryQuantity += l.Quantity;
            }

            if (calcUom.BaseQuantity >= findItem.InventoryUoMBaseQuantity && findItem.InventoryUoMBaseQuantity > 0) {
                calcUom.InventoryQuantity += (calcUom.BaseQuantity - (calcUom.BaseQuantity % findItem.InventoryUoMBaseQuantity)) / findItem.InventoryUoMBaseQuantity;
                calcUom.BaseQuantity = calcUom.BaseQuantity % findItem.InventoryUoMBaseQuantity;
            }

            let qdThung = parseInt((calcUom.BaseQuantity * l.Item.InventoryUoM.AlternativeQuantity / l.Item.InventoryUoM.BaseQuantity).toString());
            if (qdThung > 0) {
                calcUom.InventoryQuantity += qdThung;
                calcUom.BaseQuantity = calcUom.BaseQuantity - (qdThung * l.Item.InventoryUoM.BaseQuantity / l.Item.InventoryUoM.AlternativeQuantity);
            }

        }
        else {
            let uom = findItem.UoMs.find(d => d.IDUoM == l.Item.UoM.Id);
            if (!uom) {
                uom = {
                    IDUoM: l.Item.UoM.Id,
                    UoMName: l.Item.UoM.Name,
                    Quantity: 0,
                    UoMPrice: l.UoMPrice,
                    UoMPriceText: lib.formatMoney(l.UoMPrice, 0),
                }

                findItem.UoMs.push(uom);
            }
            uom.Quantity += l.Quantity;


            let tongLeQty = uom.Quantity * l.Item.UoM.BaseQuantity / l.Item.UoM.AlternativeQuantity;
            let qdThung = parseInt((tongLeQty * l.Item.InventoryUoM.AlternativeQuantity / l.Item.InventoryUoM.BaseQuantity).toString());

            if (qdThung > 0) {
                calcUom.InventoryQuantity += qdThung;
                let leConLai = tongLeQty - (qdThung * l.Item.InventoryUoM.BaseQuantity / l.Item.InventoryUoM.AlternativeQuantity);

                let uomLe = leConLai * l.Item.UoM.AlternativeQuantity / l.Item.UoM.BaseQuantity;
                uom.Quantity = uomLe;

            }

            let qdLe = parseInt((uom.Quantity * l.Item.UoM.BaseQuantity / l.Item.UoM.AlternativeQuantity).toString());
            if (qdLe > 0 && l.Item.UoM.BaseQuantity < l.Item.UoM.AlternativeQuantity) {
                calcUom.BaseQuantity += qdLe;
                uom.Quantity = uom.Quantity - (qdLe * l.Item.UoM.AlternativeQuantity / l.Item.UoM.BaseQuantity);
            }

            if (uom.Quantity == 0) {
                const index = findItem.UoMs.indexOf(uom);
                if (index > -1) {
                    findItem.UoMs.splice(index, 1);
                }
            }

            qdThung = parseInt((calcUom.BaseQuantity * l.Item.InventoryUoM.AlternativeQuantity / l.Item.InventoryUoM.BaseQuantity).toString());
            if (qdThung > 0) {
                calcUom.InventoryQuantity += qdThung;
                calcUom.BaseQuantity = calcUom.BaseQuantity - (qdThung * l.Item.InventoryUoM.BaseQuantity / l.Item.InventoryUoM.AlternativeQuantity);
            }
        }

        if (calcUom.BaseQuantity == 0 && calcUom.InventoryQuantity == 0) {
            const index = findItem.UoMs.indexOf(calcUom);
            if (index > -1) {
                findItem.UoMs.splice(index, 1);
            }
        }
    }

    calcSheetBuGia(o) {
        let itemList = [];
        o.OriginalDiscountFromSalesman = 0;
        o.OriginalTotalAfterDiscountFromSalesman = 0;
        o.OrderLines.forEach(l => {
            let findItem = itemList.find(d => d.IDItem == l.IDItem && d.IDUoM == l.Item.UoM.Id && Math.abs(d.SalesmanPrice * 10 - l.SalesmanPrice * 10) < 1);

            if (!findItem) {
                findItem = {
                    IDItem: l.IDItem,
                    ItemCode: l.Item.Code,
                    ItemName: l.Item.Name,
                    IDUoM : l.Item.UoM.Id,
                    UoMName: l.Item.UoM.Name,

                    OriginalTotalBeforeDiscount: 0,
                    OriginalTotalDiscount: 0,
                    OriginalTotalAfterDiscount: 0,

                    OriginalDiscountFromSalesman: 0,
                    OriginalTotalAfterDiscountFromSalesman: 0,
                    Quantity: 0,

                    SalesmanPrice: l.SalesmanPrice,
                    ItemSort: l.SalesmanPrice > 0 ? -1 : 1,

                };
                itemList.push(findItem);
            }

            findItem.OriginalTotalBeforeDiscount += l.OriginalTotalBeforeDiscount;
            findItem.OriginalTotalDiscount += l.OriginalTotalDiscount;
            findItem.OriginalTotalAfterDiscount += l.OriginalTotalAfterDiscount;

            o.OriginalDiscountFromSalesman += l.OriginalDiscountFromSalesman;
            findItem.OriginalDiscountFromSalesman += l.OriginalDiscountFromSalesman;
            o.OriginalTotalAfterDiscountFromSalesman += l.OriginalTotalAfterDiscountFromSalesman;
            findItem.OriginalTotalAfterDiscountFromSalesman += l.OriginalTotalAfterDiscountFromSalesman;

            findItem.Quantity += l.Quantity;

            findItem.OriginalDiscountFromSalesmanText = lib.currencyFormat(findItem.OriginalDiscountFromSalesman);
            findItem.OriginalTotalAfterDiscountFromSalesmanText = lib.currencyFormat(findItem.OriginalTotalAfterDiscountFromSalesman);

            findItem.SalesmanPriceText = lib.currencyFormat(findItem.SalesmanPrice);
            findItem.ItemSort = l.SalesmanPrice > 0 ? -1 : 1;

        });

        o.OriginalDiscountFromSalesmanText = lib.currencyFormat(o.OriginalDiscountFromSalesman);
        o.OriginalTotalAfterDiscountFromSalesmanText = lib.currencyFormat(o.OriginalTotalAfterDiscountFromSalesman);

        itemList.sort((a, b) => (parseFloat(a.ItemSort) - parseFloat(b.ItemSort)) || a.ItemCode.localeCompare(b.ItemCode));
                                
        return itemList;
    }

    printMode = 'A5';
    changePrintMode() {
        this.printMode = this.printMode == 'A4' ? 'A5' : 'A4';
        this.calcPageBreak();
    }
    calcPageBreak() {
        let sheets = document.querySelectorAll('.sheet');

        var e = document.createElement("div");
        e.style.position = "absolute";
        e.style.width = "147mm";
        document.body.appendChild(e);
        var rect = e.getBoundingClientRect();
        document.body.removeChild(e);
        let A5Height = rect.width;

        if (this.printMode == 'A5') {
            sheets.forEach((s: any) => {
                s.style.pageBreakAfter = 'always';
                s.style.borderBottom = 'none';
                s.style.minHeight = '147mm';

                if (s.clientHeight > A5Height * 6 + 20) {
                    s.style.minHeight = '1180mm';
                }
                else if (s.clientHeight > A5Height * 4 + 20) {
                    s.style.minHeight = '885mm';
                }
                else if (s.clientHeight > A5Height * 2 + 20) {
                    s.style.minHeight = '590mm';
                }
                else if (s.clientHeight > A5Height + 20) {
                    s.style.minHeight = '295mm';
                }
            });
        }
        else {
            sheets.forEach((s: any) => {
                s.style.breakAfter = 'unset';
                s.style.minHeight = '148mm';
                s.style.borderBottom = 'dashed 1px #ccc';

                if (s.clientHeight > A5Height * 6 + 20) {
                    s.style.minHeight = '1180mm';
                    s.style.pageBreakBefore = 'always';
                    s.style.pageBreakAfter = 'always';
                }
                else if (s.clientHeight > A5Height * 4 + 20) {
                    s.style.minHeight = '885mm';
                    s.style.pageBreakBefore = 'always';
                    s.style.pageBreakAfter = 'always';
                }
                else if (s.clientHeight > A5Height * 2 + 20) {
                    s.style.minHeight = '590mm';
                    s.style.pageBreakBefore = 'always';
                    s.style.pageBreakAfter = 'always';
                }
                else if (s.clientHeight > A5Height + 20) {
                    s.style.minHeight = '295mm';
                    s.style.pageBreakBefore = 'always';
                    s.style.pageBreakAfter = 'always';
                }
            });
        }
    }

    DocSo3ChuSo(baso) {
        var ChuSo = new Array(" không ", " một ", " hai ", " ba ", " bốn ", " năm ", " sáu ", " bảy ", " tám ", " chín ");

        var tram;
        var chuc;
        var donvi;
        var KetQua = "";
        tram = parseInt((baso / 100) + '');
        chuc = parseInt(((baso % 100) / 10) + '');
        donvi = baso % 10;
        if (tram == 0 && chuc == 0 && donvi == 0) return "";
        if (tram != 0) {
            KetQua += ChuSo[tram] + " trăm ";
            if ((chuc == 0) && (donvi != 0)) KetQua += " linh ";
        }
        if ((chuc != 0) && (chuc != 1)) {
            KetQua += ChuSo[chuc] + " mươi";
            if ((chuc == 0) && (donvi != 0)) KetQua = KetQua + " linh ";
        }
        if (chuc == 1) KetQua += " mười ";
        switch (donvi) {
            case 1:
                if ((chuc != 0) && (chuc != 1)) {
                    KetQua += " mốt ";
                }
                else {
                    KetQua += ChuSo[donvi];
                }
                break;
            case 5:
                if (chuc == 0) {
                    KetQua += ChuSo[donvi];
                }
                else {
                    KetQua += " lăm ";
                }
                break;
            default:
                if (donvi != 0) {
                    KetQua += ChuSo[donvi];
                }
                break;
        }
        return KetQua;
    }

    DocTienBangChu(SoTien) {
        var Tien = new Array("", " nghìn", " triệu", " tỷ", " nghìn tỷ", " triệu tỷ");

        var lan = 0;
        var i = 0;
        var so = 0;
        var KetQua = "";
        var tmp = "";
        var ViTri = new Array();
        if (SoTien < 0) return "Số tiền âm !";
        if (SoTien == 0) return "Không đồng !";
        if (SoTien > 0) {
            so = SoTien;
        }
        else {
            so = -SoTien;
        }
        if (SoTien > 8999999999999999) {
            //SoTien = 0;
            return "Số quá lớn!";
        }
        ViTri[5] = Math.floor(so / 1000000000000000);
        if (isNaN(ViTri[5]))
            ViTri[5] = "0";
        so = so - parseFloat(ViTri[5].toString()) * 1000000000000000;
        ViTri[4] = Math.floor(so / 1000000000000);
        if (isNaN(ViTri[4]))
            ViTri[4] = "0";
        so = so - parseFloat(ViTri[4].toString()) * 1000000000000;
        ViTri[3] = Math.floor(so / 1000000000);
        if (isNaN(ViTri[3]))
            ViTri[3] = "0";
        so = so - parseFloat(ViTri[3].toString()) * 1000000000;
        ViTri[2] = parseInt((so / 1000000) + '');
        if (isNaN(ViTri[2]))
            ViTri[2] = "0";
        ViTri[1] = parseInt(((so % 1000000) / 1000) + '');
        if (isNaN(ViTri[1]))
            ViTri[1] = "0";
        ViTri[0] = parseInt((so % 1000) + '');
        if (isNaN(ViTri[0]))
            ViTri[0] = "0";
        if (ViTri[5] > 0) {
            lan = 5;
        }
        else if (ViTri[4] > 0) {
            lan = 4;
        }
        else if (ViTri[3] > 0) {
            lan = 3;
        }
        else if (ViTri[2] > 0) {
            lan = 2;
        }
        else if (ViTri[1] > 0) {
            lan = 1;
        }
        else {
            lan = 0;
        }
        for (i = lan; i >= 0; i--) {
            tmp = this.DocSo3ChuSo(ViTri[i]);
            KetQua += tmp;
            if (ViTri[i] > 0) KetQua += Tien[i];
            if ((i > 0) && (tmp.length > 0)) KetQua += ',';//&& (!string.IsNullOrEmpty(tmp))
        }
        if (KetQua.substring(KetQua.length - 1) == ',') {
            KetQua = KetQua.substring(0, KetQua.length - 1);
        }
        KetQua = KetQua.substring(1, 2).toUpperCase() + KetQua.substring(2) + ' đồng';
        return KetQua;//.substring(0, 1);//.toUpperCase();// + KetQua.substring(1);
    }

    toggleDateFilter() {
        this.query.IDStatus = this.query.IDStatus == '[301]' ? '' : '[301]';
        if (this.query.IDStatus == '[301]') {
            this.query.DeliveryDate = '';
        }
        else {
            let today = new Date;
            this.query.DeliveryDate = lib.dateFormat(today.setDate(today.getDate() + 1), 'yyyy-mm-dd');
        }

        this.refresh();
    }


}
