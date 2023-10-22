import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StartMissionComponent } from './start-mission.component';

describe('StartMissionComponent', () => {
    let component: StartMissionComponent;
    let fixture: ComponentFixture<StartMissionComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [StartMissionComponent],
        });
        fixture = TestBed.createComponent(StartMissionComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
