import { ErrorHandler, inject, Injectable } from '@angular/core';
import { JournalErreursPort } from '../ports/journal-erreurs.port';

/** Capture les erreurs Angular et les erreurs/promesses non gérées dans le journal. */
@Injectable()
export class CaptureErreurs implements ErrorHandler {
  private readonly journal = inject(JournalErreursPort);

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (e) => this.journal.enregistrer('window.error', e.error ?? e.message));
      window.addEventListener('unhandledrejection', (e) => this.journal.enregistrer('promesse', e.reason));
    }
  }

  handleError(erreur: unknown): void {
    this.journal.enregistrer('angular', erreur);
    console.error(erreur);
  }
}
