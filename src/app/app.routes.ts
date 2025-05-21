import { Routes } from '@angular/router';

import { MapContainerComponent } from './components/map/container/map-container.component';

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
