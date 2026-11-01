import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyShipmentsComponent } from './my-shipments.component';

describe('MyShipmentsComponent', () => {
  let component: MyShipmentsComponent;
  let fixture: ComponentFixture<MyShipmentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyShipmentsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MyShipmentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
