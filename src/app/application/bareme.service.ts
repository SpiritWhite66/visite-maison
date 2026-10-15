import { inject, Injectable, signal } from '@angular/core';
import { BAREME_DEFAUT } from '../domain/bareme-defaut';
import { LigneBareme } from '../domain/modeles';
import { BaremePort } from '../ports/depots.port';

@Injectable({ providedIn: 'root' })
export class BaremeService {
  private readonly port = inject(BaremePort);
  readonly lignes = signal<LigneBareme[]>([]);

  /** Au premier lancement, le barème est pré-rempli avec les valeurs de la SPEC §6. */
  async charger(): Promise<void> {
    let lignes = await this.port.lister();
    if (lignes.length === 0) {
      await this.port.remplacer(BAREME_DEFAUT);
      lignes = [...BAREME_DEFAUT];
    }
    this.lignes.set(trier(lignes));
  }

  async enregistrer(ligne: LigneBareme): Promise<void> {
    await this.port.enregistrer(ligne);
    this.lignes.update((l) => trier([...l.filter((x) => x.id !== ligne.id), ligne]));
  }

  async supprimer(id: string): Promise<void> {
    await this.port.supprimer(id);
    this.lignes.update((l) => l.filter((x) => x.id !== id));
  }

  async restaurerDefaut(): Promise<void> {
    await this.port.remplacer(BAREME_DEFAUT);
    this.lignes.set(trier([...BAREME_DEFAUT]));
  }
}

function trier(lignes: LigneBareme[]): LigneBareme[] {
  return [...lignes].sort((a, b) => a.categorie.localeCompare(b.categorie, 'fr') || a.libelle.localeCompare(b.libelle, 'fr'));
}
