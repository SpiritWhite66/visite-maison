import { Injectable } from '@angular/core';
import { ajouterErreur, EntreeErreur } from '../domain/journal-erreurs';
import { JournalErreursPort } from '../ports/journal-erreurs.port';

const CLE = 'visite-immo.erreurs';

/** Journal persisté dans localStorage (synchrone, utilisable même si Dexie est en panne). */
@Injectable()
export class JournalErreursLocal extends JournalErreursPort {
  lire(): EntreeErreur[] {
    try {
      return JSON.parse(localStorage.getItem(CLE) ?? '[]') as EntreeErreur[];
    } catch {
      return [];
    }
  }

  enregistrer(source: string, erreur: unknown): void {
    const message = erreur instanceof Error ? erreur.message : String(erreur);
    try {
      const journal = ajouterErreur(this.lire(), { date: new Date().toISOString(), source, message });
      localStorage.setItem(CLE, JSON.stringify(journal));
    } catch {
      /* stockage indisponible : on ne peut rien faire de plus */
    }
  }

  vider(): void {
    try {
      localStorage.removeItem(CLE);
    } catch {
      /* ignoré */
    }
  }
}
