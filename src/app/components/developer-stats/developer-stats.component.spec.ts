import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeveloperStatsComponent } from './developer-stats.component';

describe('DeveloperStatsComponent', () => {
    let component: DeveloperStatsComponent;
    let fixture: ComponentFixture<DeveloperStatsComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [DeveloperStatsComponent],
        });
        fixture = TestBed.createComponent(DeveloperStatsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
