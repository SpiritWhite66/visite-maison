import { Routes } from '@angular/router';

export const BIENS_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./biens.page').then((m) => m.BiensPage) },
  { path: 'nouveau', loadComponent: () => import('./bien-form.page').then((m) => m.BienFormPage) },
  { path: ':id', loadComponent: () => import('./fiche-bien.page').then((m) => m.FicheBienPage) },
  { path: ':id/modifier', loadComponent: () => import('./bien-form.page').then((m) => m.BienFormPage) },
  { path: ':id/travaux/nouveau', loadComponent: () => import('./poste-form.page').then((m) => m.PosteFormPage) },
  { path: ':id/travaux/:posteId', loadComponent: () => import('./poste-form.page').then((m) => m.PosteFormPage) },
];
