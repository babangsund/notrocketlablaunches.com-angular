import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DEFAULT_DATA_DISPLAY_HZ } from 'src/app/constants';

@Component({
    selector: 'app-select-hz',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './select-hz.component.html',
})
export class SelectHzComponent {
    @Input({ required: true }) public hz = DEFAULT_DATA_DISPLAY_HZ;

    @Output() public changeHz = new EventEmitter<number>();

    public handleChangeHz(evt: Event): void {
        this.changeHz.emit(
            Number((evt.target as HTMLSelectElement).value) ?? DEFAULT_DATA_DISPLAY_HZ
        );
    }
}
