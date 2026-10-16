import { inject, Injectable } from '@angular/core';
import { nomFichierSauvegarde, ResumeSauvegarde, resumerDonnees } from '../domain/sauvegarde';
import { FormatSauvegardePort, SauvegardeLue, SauvegardePort } from '../ports/sauvegarde.port';
import { VERSION_APP } from '../version';
import { BaremeService } from './bareme.service';
import { ParametresService } from './parametres.service';

export type ModeImport = 'REMPLACER' | 'FUSIONNER';

export interface Export {
  fichier: File;
  resume: ResumeSauvegarde;
}

@Injectable({ providedIn: 'root' })
export class SauvegardeService {
  private readonly base = inject(SauvegardePort);
  private readonly format = inject(FormatSauvegardePort);
  private readonly parametres = inject(ParametresService);
  private readonly bareme = inject(BaremeService);

  /** Y a-t-il quelque chose à perdre ? Sert au rappel de sauvegarde. */
  async aDesDonnees(): Promise<boolean> {
    return (await this.base.lireTout()).biens.length > 0;
  }

  /**
   * Fichier complet de la base. La date est notée avant la lecture : le fichier contient
   * donc sa propre date de sauvegarde, et une restauration la retrouve.
   */
  async exporter(): Promise<Export> {
    const maintenant = new Date();
    await this.parametres.noterSauvegarde(maintenant.toISOString());
    const donnees = await this.base.lireTout();
    const blob = await this.format.ecrire(donnees, VERSION_APP, maintenant);
    const fichier = new File([blob], nomFichierSauvegarde(maintenant), { type: 'application/json' });
    return { fichier, resume: resumerDonnees(donnees) };
  }

  /** Lit et contrôle un fichier sans rien modifier. @throws SauvegardeInvalideError */
  lire(fichier: Blob): Promise<SauvegardeLue> {
    return this.format.lire(fichier);
  }

  async importer(sauvegarde: SauvegardeLue, mode: ModeImport): Promise<void> {
    if (mode === 'REMPLACER') {
      await this.base.remplacer(sauvegarde.donnees);
    } else {
      await this.base.fusionner(sauvegarde.donnees);
    }
    // Les écrans lisent les réglages et le barème depuis ces services : on les recharge.
    await this.parametres.charger();
    await this.bareme.charger();
  }
}
