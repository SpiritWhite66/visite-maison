import { Routes } from '@angular/router';

export const BIENS_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./biens.page').then((m) => m.BiensPage) },
];
