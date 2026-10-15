import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'biens' },
  { path: 'biens', loadChildren: () => import('./features/biens/biens.routes').then((m) => m.BIENS_ROUTES) },
  {
    path: 'parametres',
    loadChildren: () => import('./features/parametres/parametres.routes').then((m) => m.PARAMETRES_ROUTES),
  },
  { path: '**', redirectTo: 'biens' },
];
