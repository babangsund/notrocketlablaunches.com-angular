import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectHzComponent } from './select-hz.component';

describe('SelectHzComponent', () => {
    let component: SelectHzComponent;
    let fixture: ComponentFixture<SelectHzComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [SelectHzComponent],
        });
        fixture = TestBed.createComponent(SelectHzComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
