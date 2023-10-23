import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Timeline2dComponent } from './timeline2d.component';

describe('Timeline2dComponent', () => {
    let component: Timeline2dComponent;
    let fixture: ComponentFixture<Timeline2dComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [Timeline2dComponent],
        });
        fixture = TestBed.createComponent(Timeline2dComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
