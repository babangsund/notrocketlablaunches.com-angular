import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';

@Component({
    selector: 'app-browser-check',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './browser-check.component.html',
    styleUrls: ['./browser-check.component.scss'],
})
export class BrowserCheckComponent implements OnInit {
    public showBanner = false;

    public ngOnInit(): void {
        this._checkBrowserAndPlatform();
    }

    private _checkBrowserAndPlatform(): void {
        const isChrome = !!(window as any).chrome;
        const supportsWorkers = !!window.Worker;
        const supportsOffscreenCanvas = !!window.OffscreenCanvas;

        if (!isChrome || !supportsWorkers || !supportsOffscreenCanvas) {
            this.showBanner = true;
        }
    }
}
