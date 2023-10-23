# [notrocketlablaunches.com](https://notrocketlablaunches.com/)

### Commands

-   `npm install` to install project dependencies.
-   `npm run start` to start a dev server.
-   `npm run test` to run tests.

This project was built with Angular. See [their website](https://angular.io/) for more information about their cli.

### Project Goals

The goal of this project was to push browser capabilities to the limit while maintaining peak performance and maximizing GPU utilization. Rocket telemetry is produced at a rate of 100hz and displayed at 50hz by default. Instead of receiving data from a server (via WebSocket or SSEs), I've imposed an additional artificial constraint where all data is generated (through linear interpolation) on the client side.

A detailed write-up will follow soon!

### History, aka TODO

This project was originally built on only two dependencies [`gl-matrix`](https://github.com/toji/gl-matrix) and [`lit`](https://lit.dev/). It recently transitioned to Angular. The functional architecture in line-chart2d and globe3d draw commands reflects this history. The aim is to eventually convert these to classes for a fully Angular-centric application.

### Links

-   [notrocketlablaunches.com (this project)](https://notrocketlablaunches.com/)
-   [notspacexlaunches.com](https://notspacexlaunches.com/)
-   [My Github profile](https://github.com/babangsund/)
-   [My personal website](https://www.babangsund.com/)
