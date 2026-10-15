import { EntreeErreur } from '../domain/journal-erreurs';

export abstract class JournalErreursPort {
  abstract lire(): EntreeErreur[];
  abstract enregistrer(source: string, erreur: unknown): void;
  abstract vider(): void;
}
