import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Globe3dComponent } from './globe3d.component';

describe('Globe3dComponent', () => {
    let component: Globe3dComponent;
    let fixture: ComponentFixture<Globe3dComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [Globe3dComponent],
        });
        fixture = TestBed.createComponent(Globe3dComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
