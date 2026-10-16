import { inject, Injectable } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { EntreeErreur } from '../domain/journal-erreurs';
import { VERSION_APP } from '../version';
import { BaseDonneesPort, EtatBaseDonnees } from '../ports/base-donnees.port';
import { EstimationStockage, StockagePort } from '../ports/stockage.port';
import { JournalErreursPort } from '../ports/journal-erreurs.port';

export interface Diagnostic {
  version: string;
  serviceWorker: string;
  stockagePersistant: boolean | null;
  stockage: EstimationStockage;
  baseDonnees: EtatBaseDonnees;
  erreurs: EntreeErreur[];
}

@Injectable({ providedIn: 'root' })
export class DiagnosticService {
  private readonly stockage = inject(StockagePort);
  private readonly bdd = inject(BaseDonneesPort);
  private readonly journal = inject(JournalErreursPort);
  private readonly sw = inject(SwUpdate);

  /** Demandé au premier lancement (SPEC §3) pour éviter l'éviction des données. */
  async demanderPersistance(): Promise<boolean | null> {
    if ((await this.stockage.estPersistant()) === true) return true;
    return this.stockage.demanderPersistance();
  }

  async etatPersistance(): Promise<boolean | null> {
    return this.stockage.estPersistant();
  }

  async collecter(): Promise<Diagnostic> {
    const [stockagePersistant, stockage, baseDonnees, serviceWorker] = await Promise.all([
      this.stockage.estPersistant(),
      this.stockage.estimer(),
      this.bdd.etat(),
      this.etatServiceWorker(),
    ]);
    return { version: VERSION_APP, serviceWorker, stockagePersistant, stockage, baseDonnees, erreurs: this.journal.lire() };
  }

  viderErreurs(): void {
    this.journal.vider();
  }

  private async etatServiceWorker(): Promise<string> {
    if (!('serviceWorker' in navigator)) return 'non supporté';
    if (!this.sw.isEnabled) return 'désactivé (mode développement)';
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return 'non enregistré';
    if (reg.active) return navigator.serviceWorker.controller ? 'actif (page contrôlée, hors ligne OK)' : 'actif (rechargez la page pour le contrôler)';
    return reg.installing ? 'installation…' : reg.waiting ? 'en attente' : 'inconnu';
  }
}
