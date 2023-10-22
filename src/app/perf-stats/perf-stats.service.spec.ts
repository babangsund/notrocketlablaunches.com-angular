import { TestBed } from '@angular/core/testing';

import { PerfStatsService } from './perf-stats.service';

describe('PerfStatsService', () => {
    let service: PerfStatsService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(PerfStatsService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
