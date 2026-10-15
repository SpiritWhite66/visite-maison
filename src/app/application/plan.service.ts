import { inject, Injectable } from '@angular/core';
import { Etage, FichierPlan } from '../domain/modeles';
import { EtagesPort, FichiersPlanPort } from '../ports/depots.port';
import { CompressionPhotoPort } from '../ports/photo.port';

/** Un plan photographié doit rester lisible : on le garde plus grand et moins compressé qu'une photo. */
const COTE_MAX_PLAN = 2400;
const QUALITE_PLAN = 0.85;

@Injectable({ providedIn: 'root' })
export class PlanService {
  private readonly etages = inject(EtagesPort);
  private readonly fichiers = inject(FichiersPlanPort);
  private readonly compression = inject(CompressionPhotoPort);

  async listerEtages(bienId: string): Promise<Etage[]> {
    const etages = await this.etages.listerParBien(bienId);
    return etages.sort((a, b) => a.ordre - b.ordre);
  }

  obtenirEtage(id: string): Promise<Etage | undefined> {
    return this.etages.obtenir(id);
  }

  async ajouterEtage(bienId: string, nom: string): Promise<Etage> {
    const existants = await this.etages.listerParBien(bienId);
    const etage: Etage = {
      id: crypto.randomUUID(),
      bienId,
      nom,
      ordre: Math.max(-1, ...existants.map((e) => e.ordre)) + 1,
      elements: [],
    };
    await this.etages.enregistrer(etage);
    return etage;
  }

  enregistrerEtage(etage: Etage): Promise<void> {
    return this.etages.enregistrer(etage);
  }

  supprimerEtage(id: string): Promise<void> {
    return this.etages.supprimer(id);
  }

  listerFichiers(bienId: string): Promise<FichierPlan[]> {
    return this.fichiers.listerParBien(bienId);
  }

  async blobFichier(id: string): Promise<Blob | undefined> {
    return (await this.fichiers.obtenir(id))?.blob;
  }

  /** Les images sont réduites ; les autres fichiers (PDF…) sont gardés tels quels. */
  async ajouterFichier(bienId: string, etageId: string, fichier: File): Promise<FichierPlan> {
    const estImage = fichier.type.startsWith('image/') && fichier.type !== 'image/svg+xml';
    const blob = estImage ? await this.compression.compresser(fichier, COTE_MAX_PLAN, QUALITE_PLAN) : fichier;
    const enregistrement: FichierPlan = {
      id: crypto.randomUUID(),
      bienId,
      etageId,
      nom: fichier.name || 'Plan',
      typeMime: estImage ? 'image/jpeg' : fichier.type || 'application/octet-stream',
      blob,
      ajouteLe: new Date().toISOString(),
    };
    await this.fichiers.enregistrer(enregistrement);
    return enregistrement;
  }

  supprimerFichier(id: string): Promise<void> {
    return this.fichiers.supprimer(id);
  }
}
