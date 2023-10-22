import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { PerfStatsService } from './services/perf-stats/perf-stats.service';
import { SimulatorService } from './services/simulator/simulator.service';

export const appConfig: ApplicationConfig = {
    providers: [provideRouter(routes), PerfStatsService, SimulatorService],
};
