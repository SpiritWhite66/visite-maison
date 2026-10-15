import { inject, Injectable } from '@angular/core';
import { Budget, calculerBudget, Fourchette, montantsPoste } from '../domain/budget';
import { Bien, PosteTravaux } from '../domain/modeles';
import { BaremeService } from './bareme.service';
import { ParametresService } from './parametres.service';

@Injectable({ providedIn: 'root' })
export class BudgetService {
  private readonly bareme = inject(BaremeService);
  private readonly parametres = inject(ParametresService);

  calculer(bien: Bien, postes: readonly PosteTravaux[]): Budget {
    return calculerBudget(bien, postes, this.bareme.lignes(), this.parametres.parametres());
  }

  montantPoste(poste: PosteTravaux): Fourchette {
    return montantsPoste(poste, this.bareme.lignes(), this.parametres.parametres().coefDiyDefaut);
  }
}
