import { Routes } from '@angular/router';

export const BIENS_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./biens.page').then((m) => m.BiensPage) },
  { path: 'nouveau', loadComponent: () => import('./bien-form.page').then((m) => m.BienFormPage) },
  { path: ':id', loadComponent: () => import('./fiche-bien.page').then((m) => m.FicheBienPage) },
  { path: ':id/modifier', loadComponent: () => import('./bien-form.page').then((m) => m.BienFormPage) },
  { path: ':id/compte-rendu', loadComponent: () => import('./compte-rendu/compte-rendu.page').then((m) => m.CompteRenduPage) },
  { path: ':id/visites/:visiteId', loadComponent: () => import('./visite.page').then((m) => m.VisitePage) },
  { path: ':id/plan/:etageId', loadComponent: () => import('./plan/plan-editeur.page').then((m) => m.PlanEditeurPage) },
  { path: ':id/pieces/nouveau', loadComponent: () => import('./piece-form.page').then((m) => m.PieceFormPage) },
  { path: ':id/pieces/:pieceId', loadComponent: () => import('./piece-form.page').then((m) => m.PieceFormPage) },
  { path: ':id/devis', loadComponent: () => import('./devis/devis-liste.page').then((m) => m.DevisListePage) },
  { path: ':id/devis/nouveau', loadComponent: () => import('./devis/devis-form.page').then((m) => m.DevisFormPage) },
  { path: ':id/devis/:devisId', loadComponent: () => import('./devis/devis-form.page').then((m) => m.DevisFormPage) },
  { path: ':id/photos', loadComponent: () => import('./photos/photos.page').then((m) => m.PhotosPage) },
  { path: ':id/travaux/nouveau', loadComponent: () => import('./poste-form.page').then((m) => m.PosteFormPage) },
  { path: ':id/travaux/:posteId', loadComponent: () => import('./poste-form.page').then((m) => m.PosteFormPage) },
];
