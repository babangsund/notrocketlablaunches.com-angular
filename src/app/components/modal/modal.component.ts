import { CommonModule } from '@angular/common';
import { Component, HostBinding } from '@angular/core';

@Component({
    selector: 'app-modal',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './modal.component.html',
    styleUrls: ['./modal.component.scss'],
})
export class ModalComponent {
    @HostBinding('attr.role')
    public get role() {
        return 'presentation';
    }
}
