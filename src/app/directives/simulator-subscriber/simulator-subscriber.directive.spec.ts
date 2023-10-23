import { Component, DebugElement, ElementRef, Renderer2 } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { SimulatorService } from 'src/app/services/simulator/simulator.service';
import { SimulatorSubscriberDirective } from './simulator-subscriber.directive';

@Component({
    template: `
        <canvas
            appSimulatorSubscriber
            [id]="id"
            [hz]="hz"
            [worker]="worker"
            [unit]="unit"
            [colors]="colors"
            [listeners]="listeners"
            [missionDataProperties]="missionDataProperties"
        ></canvas>
    `,
    standalone: true,
    imports: [SimulatorSubscriberDirective],
})
class TestComponent {
    public id?: string = 'testId';
    public hz?: number = 50;
    public worker = jasmine.createSpyObj('Worker', ['postMessage']);
    public unit = 'testUnit';
    public colors = {};
    public listeners: VoidFunction[] = [];
    public missionDataProperties = [];
}

describe('SimulatorSubscriberDirective', () => {
    let component: TestComponent;
    let fixture: ComponentFixture<TestComponent>;
    let canvasEl: DebugElement;
    let mockSimulatorService: jasmine.SpyObj<SimulatorService>;
    let directive: SimulatorSubscriberDirective;

    beforeEach(() => {
        mockSimulatorService = jasmine.createSpyObj('SimulatorService', ['addSubscriber']);

        TestBed.configureTestingModule({
            imports: [SimulatorSubscriberDirective, TestComponent],
            providers: [
                { provide: SimulatorService, useValue: mockSimulatorService },
                Renderer2,
                { provide: ElementRef, useValue: {} },
            ],
        });
        fixture = TestBed.createComponent(TestComponent);
        component = fixture.componentInstance;
        canvasEl = fixture.debugElement.query(By.css('canvas'));
        directive = canvasEl.injector.get(SimulatorSubscriberDirective);
    });

    it('should create an instance', () => {
        expect(directive).toBeInstanceOf(SimulatorSubscriberDirective);
    });

    it('should call addSubscriber on SimulatorService after view initialization', () => {
        fixture.detectChanges();
        expect(mockSimulatorService.addSubscriber).toHaveBeenCalled();
    });

    it('should not call addSubscriber if id, hz, or worker are missing', () => {
        component.id = undefined;
        component.hz = undefined;
        fixture.detectChanges();
        expect(mockSimulatorService.addSubscriber).not.toHaveBeenCalled();
    });

    it('should set canvas width and height attributes on view initialization', () => {
        const canvas: HTMLCanvasElement = canvasEl.nativeElement;
        const dpr = window.devicePixelRatio;
        const boundingBox = canvas.getBoundingClientRect();
        const width = boundingBox.width;
        const height = boundingBox.height;

        fixture.detectChanges();

        expect(canvas.getAttribute('width')).toBe(String(width * dpr));
        expect(canvas.getAttribute('height')).toBe(String(height * dpr));
    });

    it('should start custom listeners and call their unsubscribe function on destroy', () => {
        const unsubscribe1 = jasmine.createSpy('unsubscribe1');
        const unsubscribe2 = jasmine.createSpy('unsubscribe2');

        const mockListener1 = jasmine.createSpy('listener1').and.returnValue(unsubscribe1);
        const mockListener2 = jasmine.createSpy('listener2').and.returnValue(unsubscribe2);

        component.listeners = [mockListener1, mockListener2];

        fixture.detectChanges();

        expect(mockListener1).toHaveBeenCalled();
        expect(mockListener2).toHaveBeenCalled();

        // 2 custom listeners + resize
        expect(directive['_unsubscribe'].length).toBe(3);

        directive.ngOnDestroy();

        expect(unsubscribe1).toHaveBeenCalled();
        expect(unsubscribe2).toHaveBeenCalled();
    });
});
