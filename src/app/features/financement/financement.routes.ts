import { Routes } from '@angular/router';

export const FINANCEMENT_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./choix-bien.page').then((m) => m.ChoixBienPage) },
  { path: ':id', loadComponent: () => import('./financement.page').then((m) => m.FinancementPage) },
];
