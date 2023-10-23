import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LineChart2dComponent } from './line-chart2d.component';

describe('LineChart2dComponent', () => {
    let component: LineChart2dComponent;
    let fixture: ComponentFixture<LineChart2dComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [LineChart2dComponent],
        });
        fixture = TestBed.createComponent(LineChart2dComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
