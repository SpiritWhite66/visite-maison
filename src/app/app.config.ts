import { ApplicationConfig, ErrorHandler, isDevMode, provideAppInitializer, inject, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';

import { routes } from './app.routes';
import { BaseDonneesDexie } from './adapters/dexie/base-donnees-dexie';
import { JournalErreursLocal } from './adapters/journal-erreurs-local';
import { StockageNavigateur } from './adapters/stockage-navigateur';
import { CaptureErreurs } from './application/capture-erreurs';
import { DiagnosticService } from './application/diagnostic.service';
import { BaseDonneesPort } from './ports/base-donnees.port';
import { JournalErreursPort } from './ports/journal-erreurs.port';
import { StockagePort } from './ports/stockage.port';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    { provide: StockagePort, useClass: StockageNavigateur },
    { provide: JournalErreursPort, useClass: JournalErreursLocal },
    { provide: BaseDonneesPort, useClass: BaseDonneesDexie },
    { provide: ErrorHandler, useClass: CaptureErreurs },
    // Premier lancement : demande de stockage persistant (SPEC §3), sans bloquer le démarrage.
    provideAppInitializer(() => {
      void inject(DiagnosticService).demanderPersistance();
    }),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
