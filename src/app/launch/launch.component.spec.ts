import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LaunchComponent } from './launch.component';

describe('LaunchComponent', () => {
    let component: LaunchComponent;
    let fixture: ComponentFixture<LaunchComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [LaunchComponent],
        });
        fixture = TestBed.createComponent(LaunchComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
