import { Injectable, signal } from '@angular/core';
import { FILTRE_DEFAUT, FiltreBiens } from '../domain/etapes';

/** Filtre de la liste des biens : il survit à la navigation (ouvrir un bien puis revenir à la liste). */
@Injectable({ providedIn: 'root' })
export class FiltreBiensService {
  readonly filtre = signal<FiltreBiens>(FILTRE_DEFAUT);
}
