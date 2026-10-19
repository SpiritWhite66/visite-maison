import { BudgetService } from '../../application/budget.service';
import { Budget } from '../../domain/budget';
import { EntreeFinancement } from '../../domain/financement';
import { Bien, PosteTravaux } from '../../domain/modeles';

/** Données du bien utiles au financement : prix négocié, fourchette de travaux, postes chiffrés. */
export function entreeFinancement(bien: Bien, postes: readonly PosteTravaux[], budget: Budget, budgets: BudgetService, tauxNotairePct: number): EntreeFinancement {
  return {
    prixNegocie: budget.prixNegocie,
    tauxNotairePct,
    travaux: budget.travaux,
    postes: postes.map((p) => ({ baremeId: p.modeChiffrage === 'BAREME' ? p.baremeId : undefined, montant: budgets.montantPoste(p) })),
    dpe: bien.dpe,
  };
}
