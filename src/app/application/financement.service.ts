import { computed, inject, Injectable } from '@angular/core';
import { FOYER_DEFAUT, gestesSuggeres, nouveauPlan } from '../domain/financement';
import { Foyer, PlanFinancement, PosteTravaux } from '../domain/modeles';
import { PlansFinancementPort } from '../ports/depots.port';
import { ParametresService } from './parametres.service';

@Injectable({ providedIn: 'root' })
export class FinancementService {
  private readonly port = inject(PlansFinancementPort);
  private readonly parametres = inject(ParametresService);

  /** Foyer emprunteur, commun à tous les biens (rangé dans les réglages). */
  readonly foyer = computed<Foyer>(() => ({ ...FOYER_DEFAUT, ...this.parametres.parametres().foyer }));
  readonly foyerRempli = computed(() => !!this.parametres.parametres().foyer);

  enregistrerFoyer(foyer: Foyer): Promise<void> {
    return this.parametres.enregistrer({ ...this.parametres.parametres(), foyer });
  }

  /** Plan enregistré du bien, ou un plan de départ (non enregistré) avec les gestes repérés dans ses travaux. */
  async plan(bienId: string, postes: readonly PosteTravaux[]): Promise<{ plan: PlanFinancement; nouveau: boolean }> {
    const existant = await this.port.obtenir(bienId);
    if (existant) return { plan: { ...nouveauPlan(bienId, new Date()), ...existant }, nouveau: false };
    return { plan: nouveauPlan(bienId, new Date(), gestesSuggeres(postes)), nouveau: true };
  }

  /** Plans enregistrés, complétés des champs ajoutés depuis leur création. */
  async lister(): Promise<PlanFinancement[]> {
    return (await this.port.lister()).map((p) => ({ ...nouveauPlan(p.bienId, new Date()), ...p }));
  }

  enregistrer(plan: PlanFinancement): Promise<void> {
    return this.port.enregistrer({ ...plan, modifieLe: new Date().toISOString() });
  }

  supprimer(bienId: string): Promise<void> {
    return this.port.supprimer(bienId);
  }
}
