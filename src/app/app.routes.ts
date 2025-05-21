import { Routes } from '@angular/router';

import { MapContainerComponent } from './features/map/components/container/map-container/map-container.component';

export const routes: Routes = [
  {
    path: 'map',
    component: MapContainerComponent,
  },
  {
    path: '',
    redirectTo: '/map',
    pathMatch: 'full',
  },
];
