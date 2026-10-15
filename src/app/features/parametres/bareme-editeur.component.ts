import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BaremeService } from '../../application/bareme.service';
import { CATEGORIES, LigneBareme } from '../../domain/modeles';
import { formaterEuro } from '../../shared/format';

const UNITES = { M2: 'm²', ML: 'ml', UNITE: 'unité', FORFAIT: 'forfait' } as const;

@Component({
  selector: 'app-bareme-editeur',
  imports: [FormsModule],
  template: `
    <section class="carte">
      <h2>Barème des travaux</h2>
      <p class="discret">Prix artisan TTC fourni-posé, indicatifs. Ajustez-les selon vos devis.</p>
      <div class="actions">
        <button (click)="ajouter()">+ Ligne</button>
        <button class="bouton-secondaire" (click)="restaurer()">Valeurs par défaut</button>
      </div>

      @if (edition(); as l) {
        <form class="edition" (ngSubmit)="valider()">
          <label class="champ">Libellé
            <input name="libelle" [(ngModel)]="l.libelle" required />
          </label>
          <div class="grille-2">
            <label class="champ">Catégorie
              <select name="categorie" [(ngModel)]="l.categorie">
                @for (c of categories; track c) { <option [value]="c">{{ c }}</option> }
              </select>
            </label>
            <label class="champ">Unité
              <select name="unite" [(ngModel)]="l.unite">
                @for (u of unites; track u[0]) { <option [value]="u[0]">{{ u[1] }}</option> }
              </select>
            </label>
            <label class="champ">Prix bas (€)
              <input name="bas" type="number" inputmode="decimal" min="0" [(ngModel)]="l.prixBas" />
            </label>
            <label class="champ">Prix haut (€)
              <input name="haut" type="number" inputmode="decimal" min="0" [(ngModel)]="l.prixHaut" />
            </label>
          </div>
          <label class="champ">Coefficient DIY propre à cette ligne (vide = coefficient global)
            <input name="coef" type="number" inputmode="decimal" min="0" step="0.05" [(ngModel)]="l.coefDiy" />
          </label>
          @if (erreur()) { <p class="erreur" role="alert">{{ erreur() }}</p> }
          <div class="actions">
            <button type="submit">Valider</button>
            <button type="button" class="bouton-secondaire" (click)="edition.set(null)">Annuler</button>
            <button type="button" class="bouton-secondaire danger" (click)="supprimer(l)">Supprimer</button>
          </div>
        </form>
      }

      @for (l of service.lignes(); track l.id) {
        <button class="ligne" (click)="modifier(l)">
          <span><strong>{{ l.libelle }}</strong><br /><small>{{ l.categorie }}</small></span>
          <span class="prix">{{ euro(l.prixBas) }} – {{ euro(l.prixHaut) }}<br /><small>/ {{ unites_[l.unite] }}</small></span>
        </button>
      }
    </section>
  `,
  styles: `
    h2 { margin: 0 0 .5rem; }
    .ligne { display: flex; justify-content: space-between; gap: 1rem; width: 100%; text-align: left;
      background: none; color: var(--texte); border-bottom: 1px solid var(--bordure); border-radius: 0; font-weight: 400; padding: .5rem 0; }
    .prix { text-align: right; white-space: nowrap; }
    .edition { border: 2px solid var(--primaire); border-radius: 12px; padding: .75rem; margin-bottom: 1rem; }
  `,
})
export class BaremeEditeurComponent {
  protected readonly service = inject(BaremeService);
  protected readonly categories = CATEGORIES;
  protected readonly unites = Object.entries(UNITES);
  protected readonly unites_ = UNITES;
  protected readonly euro = formaterEuro;
  protected readonly edition = signal<LigneBareme | null>(null);
  protected readonly erreur = signal('');

  protected ajouter(): void {
    this.erreur.set('');
    this.edition.set({ id: crypto.randomUUID(), categorie: 'Autre', libelle: '', unite: 'FORFAIT', prixBas: 0, prixHaut: 0 });
  }

  protected modifier(l: LigneBareme): void {
    this.erreur.set('');
    this.edition.set({ ...l });
  }

  protected async valider(): Promise<void> {
    const l = this.edition();
    if (!l) return;
    if (!l.libelle.trim()) return this.erreur.set('Le libellé est obligatoire.');
    const prixBas = l.prixBas ?? 0;
    const prixHaut = l.prixHaut ?? 0;
    if (prixBas > prixHaut) return this.erreur.set('Le prix bas doit être inférieur ou égal au prix haut.');
    await this.service.enregistrer({
      ...l,
      libelle: l.libelle.trim(),
      prixBas,
      prixHaut,
      coefDiy: l.coefDiy === null || l.coefDiy === undefined ? undefined : l.coefDiy,
    });
    this.edition.set(null);
  }

  protected async supprimer(l: LigneBareme): Promise<void> {
    if (!confirm(`Supprimer « ${l.libelle} » du barème ? Les postes déjà créés gardent leurs montants.`)) return;
    await this.service.supprimer(l.id);
    this.edition.set(null);
  }

  protected async restaurer(): Promise<void> {
    if (!confirm('Remplacer tout le barème par les valeurs par défaut ? Vos modifications seront perdues.')) return;
    await this.service.restaurerDefaut();
    this.edition.set(null);
  }
}
