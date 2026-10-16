import { inject, Injectable, signal } from '@angular/core';
import { prenomValide } from '../domain/avis';
import { Personne } from '../domain/modeles';
import { PersonnesPort } from '../ports/depots.port';

/** Personnes déclarées dans Paramètres, triées par prénom. */
@Injectable({ providedIn: 'root' })
export class PersonnesService {
  private readonly port = inject(PersonnesPort);
  readonly personnes = signal<Personne[]>([]);

  async charger(): Promise<Personne[]> {
    const liste = trier(await this.port.lister());
    this.personnes.set(liste);
    return liste;
  }

  /** @returns `null` si le prénom est vide ou déjà pris. */
  async ajouter(saisi: string): Promise<Personne | null> {
    const prenom = prenomValide(saisi, this.personnes());
    if (!prenom) return null;
    const personne: Personne = { id: crypto.randomUUID(), prenom };
    await this.port.enregistrer(personne);
    this.personnes.update((l) => trier([...l, personne]));
    return personne;
  }

  /** @returns `false` si le prénom est vide ou déjà pris. */
  async renommer(id: string, saisi: string): Promise<boolean> {
    const prenom = prenomValide(saisi, this.personnes(), id);
    if (!prenom) return false;
    await this.port.enregistrer({ id, prenom });
    this.personnes.update((l) => trier(l.map((p) => (p.id === id ? { id, prenom } : p))));
    return true;
  }

  /** Supprime aussi tous les avis de la personne. */
  async supprimer(id: string): Promise<void> {
    await this.port.supprimer(id);
    this.personnes.update((l) => l.filter((p) => p.id !== id));
  }
}

function trier(l: Personne[]): Personne[] {
  return [...l].sort((a, b) => a.prenom.localeCompare(b.prenom, 'fr'));
}
