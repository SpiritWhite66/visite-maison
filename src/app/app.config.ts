import { ApplicationConfig, ErrorHandler, isDevMode, provideAppInitializer, inject, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';

import { routes } from './app.routes';
import { BaseDonneesDexie } from './adapters/dexie/base-donnees-dexie';
import {
  AvisDexie,
  BaremeDexie,
  BiensDexie,
  EtagesDexie,
  FichiersPlanDexie,
  ParametresDexie,
  PersonnesDexie,
  PhotosDexie,
  PiecesDexie,
  PlansFinancementDexie,
  PostesTravauxDexie,
  VisitesDexie,
} from './adapters/dexie/depots-dexie';
import { SauvegardeDexie } from './adapters/dexie/sauvegarde-dexie';
import { FormatSauvegardeJson } from './adapters/format-sauvegarde-json';
import { CompressionPhotoCanvas } from './adapters/compression-photo-canvas';
import { JournalErreursLocal } from './adapters/journal-erreurs-local';
import { StockageNavigateur } from './adapters/stockage-navigateur';
import { CaptureErreurs } from './application/capture-erreurs';
import { BaremeService } from './application/bareme.service';
import { DiagnosticService } from './application/diagnostic.service';
import { ParametresService } from './application/parametres.service';
import { BaseDonneesPort } from './ports/base-donnees.port';
import { AvisPort, BaremePort, BiensPort, EtagesPort, FichiersPlanPort, ParametresPort, PersonnesPort, PhotosPort, PiecesPort, PlansFinancementPort, PostesTravauxPort, VisitesPort } from './ports/depots.port';
import { JournalErreursPort } from './ports/journal-erreurs.port';
import { CompressionPhotoPort } from './ports/photo.port';
import { FormatSauvegardePort, SauvegardePort } from './ports/sauvegarde.port';
import { StockagePort } from './ports/stockage.port';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    { provide: StockagePort, useClass: StockageNavigateur },
    { provide: JournalErreursPort, useClass: JournalErreursLocal },
    BaseDonneesDexie,
    { provide: BaseDonneesPort, useExisting: BaseDonneesDexie },
    { provide: BiensPort, useClass: BiensDexie },
    { provide: PostesTravauxPort, useClass: PostesTravauxDexie },
    { provide: BaremePort, useClass: BaremeDexie },
    { provide: ParametresPort, useClass: ParametresDexie },
    { provide: VisitesPort, useClass: VisitesDexie },
    { provide: PiecesPort, useClass: PiecesDexie },
    { provide: PhotosPort, useClass: PhotosDexie },
    { provide: PersonnesPort, useClass: PersonnesDexie },
    { provide: AvisPort, useClass: AvisDexie },
    { provide: PlansFinancementPort, useClass: PlansFinancementDexie },
    { provide: EtagesPort, useClass: EtagesDexie },
    { provide: FichiersPlanPort, useClass: FichiersPlanDexie },
    { provide: CompressionPhotoPort, useClass: CompressionPhotoCanvas },
    { provide: SauvegardePort, useClass: SauvegardeDexie },
    { provide: FormatSauvegardePort, useClass: FormatSauvegardeJson },
    { provide: ErrorHandler, useClass: CaptureErreurs },
    // Premier lancement : demande de stockage persistant (SPEC §3), sans bloquer le démarrage.
    provideAppInitializer(() => {
      void inject(DiagnosticService).demanderPersistance();
    }),
    // Paramètres et barème (pré-rempli au premier lancement) chargés avant l'affichage des écrans.
    provideAppInitializer(async () => {
      const parametres = inject(ParametresService);
      const bareme = inject(BaremeService);
      const erreurs = inject(ErrorHandler);
      try {
        await parametres.charger();
        await bareme.charger();
      } catch (e) {
        erreurs.handleError(e); // visible dans Paramètres › Diagnostic ; l'appli démarre quand même
      }
    }),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
