import { Component, ChangeDetectorRef } from '@angular/core';
import { NavController, LoadingController, AlertController, PopoverController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import { BRA_BranchProvider, HRM_StaffProvider, SHIP_VehicleProvider } from 'src/app/services/static/services.service';
import { FormBuilder, Validators, FormControl } from '@angular/forms';
import { CommonService } from 'src/app/services/core/common.service';
import { NgSelectConfig } from '@ng-select/ng-select';
import { concat, of, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';

@Component({
    selector: 'app-vehicle-detail',
    templateUrl: './vehicle-detail.page.html',
    styleUrls: ['./vehicle-detail.page.scss'],
    standalone: false
})
export class VehicleDetailPage extends PageBase {
  constructor(
    public pageProvider: SHIP_VehicleProvider,
    public branchProvider: BRA_BranchProvider,
    public staffProvider: HRM_StaffProvider,

    public popoverCtrl: PopoverController,
    public env: EnvService,
    public navCtrl: NavController,
    public route: ActivatedRoute,

    public alertCtrl: AlertController,
    public formBuilder: FormBuilder,
    public cdr: ChangeDetectorRef,
    public loadingController: LoadingController,
    public commonService: CommonService,
    private config: NgSelectConfig,
  ) {
    super();

    this.pageConfig.isDetailPage = true;
    this.id = this.route.snapshot.paramMap.get('id');
    this.config.notFoundText = 'Không tìm thấy dữ liệu phù hợp...';
    this.config.clearAllText = 'Xóa hết';

    this.formGroup = formBuilder.group({
      IDBranch: new FormControl({ value: null, disabled: false }),
      IDVehicleGroup: [{ value: '' }],
      IDShipper: [{ value: '' }],
      Id: new FormControl({ value: '', disabled: true }),
      Code: [{ value: '' }],
      Name: ['', Validators.required],
      Remark: [''],
      Sort: [''],
      IsDisabled: new FormControl({ value: '', disabled: true }),

      DateOfPurchase: [''],
      DateOfRegistration: [''],
      DateOfRegistrationExpire: [''],

      Length: ['', Validators.required],
      Width: ['', Validators.required],
      Height: ['', Validators.required],
      VolumeMin: ['', Validators.required],
      VolumeRecommend: ['', Validators.required],
      VolumeMax: ['', Validators.required],
      WeightMin: ['', Validators.required],
      WeightRecommend: ['', Validators.required],
      WeightMax: ['', Validators.required],

      RefShipper: [''],
    });
  }

  loadedData(event) {
    if (this.item?.IDShipper) {
      this.loadSelectedShipper(this.item.IDShipper);
    } else {
      this.shipperSearch();
    }
    super.loadedData(event);
  }

  segmentView = 's1';
  segmentChanged(ev: any) {
    this.segmentView = ev.detail.value;
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

  loadSelectedShipper(IDShipper) {
    this.staffProvider.getAnItem(IDShipper).then((resp) => {
      if (resp) {
        this.item.ShipperName = resp['FullName'];
        this.shipperListSelected.push(resp);

        this.shipperListSelected = [...this.shipperListSelected];
        this.shipperSearch();
      }
    });
  }

  async saveChange() {
    super.saveChange2();
  }
}
