import { Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaremeService } from '../../application/bareme.service';
import { CATEGORIES, LigneBareme, PrixGamme } from '../../domain/modeles';
import { gammesDisponibles } from '../../domain/budget';
import { formaterEuro } from '../../shared/format';
import { IconeComponent } from '../../shared/icone.component';

const UNITES = { M2: 'm²', ML: 'ml', UNITE: 'unité', FORFAIT: 'forfait' } as const;

@Component({
  selector: 'app-bareme-editeur',
  imports: [FormsModule, IconeComponent, NgTemplateOutlet],
  template: `
    <section class="carte">
      <div class="tete">
        <div>
          <h2>Barème des travaux</h2>
          <p class="discret">Prix artisan TTC fourni-posé, indicatifs. Ajustez-les selon vos devis.</p>
        </div>
        <div class="boutons">
          <button class="bouton-texte" (click)="restaurer()">Valeurs par défaut</button>
          <button (click)="ajouter()"><app-icone nom="plus" [taille]="20" /> Ligne</button>
        </div>
      </div>

      <ng-template #formulaire let-l>
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
          </div>
          <table class="prix-gammes">
            <thead><tr><th>Gamme</th><th>Prix bas (€)</th><th>Prix haut (€)</th></tr></thead>
            <tbody>
              <tr>
                <th>Bas de gamme <small>facultatif</small></th>
                <td><input name="ecoBas" type="number" inputmode="decimal" min="0" aria-label="Bas de gamme, prix bas" [(ngModel)]="gammesSaisies.ECO.bas" /></td>
                <td><input name="ecoHaut" type="number" inputmode="decimal" min="0" aria-label="Bas de gamme, prix haut" [(ngModel)]="gammesSaisies.ECO.haut" /></td>
              </tr>
              <tr class="principale">
                <th>Moyen de gamme</th>
                <td><input name="bas" type="number" inputmode="decimal" min="0" aria-label="Moyen de gamme, prix bas" [(ngModel)]="l.prixBas" /></td>
                <td><input name="haut" type="number" inputmode="decimal" min="0" aria-label="Moyen de gamme, prix haut" [(ngModel)]="l.prixHaut" /></td>
              </tr>
              <tr>
                <th>Haut de gamme <small>facultatif</small></th>
                <td><input name="hautBas" type="number" inputmode="decimal" min="0" aria-label="Haut de gamme, prix bas" [(ngModel)]="gammesSaisies.HAUT.bas" /></td>
                <td><input name="hautHaut" type="number" inputmode="decimal" min="0" aria-label="Haut de gamme, prix haut" [(ngModel)]="gammesSaisies.HAUT.haut" /></td>
              </tr>
            </tbody>
          </table>
          <p class="aide-gammes">Sans prix pour une gamme, la ligne n’est proposée qu’en moyen de gamme.</p>
          <label class="champ">Coefficient DIY propre à cette ligne (vide = coefficient global)
            <input name="coef" type="number" inputmode="decimal" min="0" step="0.05" [(ngModel)]="l.coefDiy" />
          </label>
          @if (erreur()) { <p class="erreur" role="alert">{{ erreur() }}</p> }
          <div class="actions pied-edition">
            @if (!estNouvelle()) {
              <button type="button" class="bouton-texte danger" (click)="supprimer(l)"><app-icone nom="corbeille" [taille]="18" /> Supprimer</button>
            }
            <span class="espaceur"></span>
            <button type="button" class="bouton-secondaire" (click)="edition.set(null)">Annuler</button>
            <button type="submit">Valider</button>
          </div>
        </form>
      </ng-template>

      @if (edition(); as l) {
        @if (estNouvelle()) {
          <ng-container *ngTemplateOutlet="formulaire; context: { $implicit: l }" />
        }
      }

      @for (g of groupes(); track g.categorie) {
        <h3>{{ g.categorie }}</h3>
        @for (l of g.lignes; track l.id) {
          <button class="ligne" [class.en-edition]="edition()?.id === l.id" (click)="modifier(l)">
            <span class="libelle">{{ l.libelle }}@if (nbGammes(l) > 1) { <span class="etiquette-gammes">{{ nbGammes(l) }} gammes</span> }</span>
            <span class="prix">{{ euro(l.prixBas) }} – {{ euro(l.prixHaut) }} <small>/ {{ unites_[l.unite] }}</small></span>
          </button>
          @if (edition(); as e) {
            @if (e.id === l.id) {
              <ng-container *ngTemplateOutlet="formulaire; context: { $implicit: e }" />
            }
          }
        }
      }
    </section>
  `,
  styles: `
    .tete { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; gap: 0.5rem 1rem; }
    .tete h2 { margin-bottom: 0.25rem; }
    .tete p { margin: 0 0 0.75rem; font-size: 0.9rem; }
    .boutons { display: flex; gap: 0.5rem; }
    h3 { margin: 1.25rem 0 0.25rem; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; color: var(--texte-discret); }
    .ligne {
      display: flex; justify-content: space-between; align-items: center; gap: 1rem; width: 100%; min-height: 48px; padding: 0.4rem 0.5rem;
      text-align: left; background: none; color: var(--texte); border: 0; border-bottom: 1px solid var(--filet); border-radius: 0; font-weight: 400;
    }
    .ligne:active, .ligne.en-edition { background: var(--primaire-pale); }
    .libelle { flex: 1; }
    .prix { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; color: var(--encre); }
    .prix small { color: var(--texte-discret); }
    .pied-edition { margin-bottom: 0; } .espaceur { flex: 1; }
    .prix-gammes { width: 100%; border-collapse: collapse; margin-bottom: 0.25rem; }
    .prix-gammes th, .prix-gammes td { padding: 0.25rem 0.35rem 0.25rem 0; text-align: left; font-size: 0.85rem; }
    .prix-gammes thead th { color: var(--texte-discret); font-weight: 650; }
    .prix-gammes tbody th { font-weight: 600; color: var(--encre); white-space: nowrap; }
    .prix-gammes small { display: block; font-weight: 400; color: var(--texte-discret); }
    .prix-gammes input { width: 100%; min-height: 44px; padding: 0.4rem 0.6rem; border: 1px solid var(--filet-fort); border-radius: var(--rayon); font: inherit; background: var(--surface); color: var(--encre); }
    .prix-gammes tr.principale input { border-color: var(--primaire); }
    .aide-gammes { margin: 0 0 1rem; font-size: 0.8rem; color: var(--texte-discret); }
    .etiquette-gammes { margin-left: 0.5rem; padding: 0 0.4rem; border-radius: 4px; background: var(--primaire-pale); color: var(--primaire); font-size: 0.72rem; font-weight: 650; white-space: nowrap; }
    .edition { border: 1px solid var(--primaire); box-shadow: 0 0 0 3px var(--primaire-pale); border-radius: var(--rayon); padding: 1rem; margin: 0.5rem 0 1rem; }
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
  /** Ligne en cours d'ajout (pas encore dans le barème) : son formulaire s'affiche en tête. */
  protected readonly estNouvelle = computed(() => {
    const e = this.edition();
    return !!e && !this.service.lignes().some((l) => l.id === e.id);
  });
  /** Lignes regroupées par catégorie, dans l'ordre des catégories. */
  protected readonly groupes = computed(() =>
    CATEGORIES.map((categorie) => ({ categorie, lignes: this.service.lignes().filter((l) => l.categorie === categorie) })).filter(
      (g) => g.lignes.length > 0,
    ),
  );

  /** Prix saisis pour les gammes facultatives de la ligne en édition (vides = gamme non proposée). */
  protected gammesSaisies = gammesVides();

  protected nbGammes(l: LigneBareme): number {
    return gammesDisponibles(l).length;
  }

  protected ajouter(): void {
    this.erreur.set('');
    this.gammesSaisies = gammesVides();
    this.edition.set({ id: crypto.randomUUID(), categorie: 'Autre', libelle: '', unite: 'FORFAIT', prixBas: 0, prixHaut: 0 });
  }

  protected modifier(l: LigneBareme): void {
    this.erreur.set('');
    this.gammesSaisies = {
      ECO: { bas: l.gammes?.ECO?.prixBas ?? null, haut: l.gammes?.ECO?.prixHaut ?? null },
      HAUT: { bas: l.gammes?.HAUT?.prixBas ?? null, haut: l.gammes?.HAUT?.prixHaut ?? null },
    };
    this.edition.set({ ...l });
  }

  protected async valider(): Promise<void> {
    const l = this.edition();
    if (!l) return;
    if (!l.libelle.trim()) return this.erreur.set('Le libellé est obligatoire.');
    const prixBas = l.prixBas ?? 0;
    const prixHaut = l.prixHaut ?? 0;
    if (prixBas > prixHaut) return this.erreur.set('Le prix bas doit être inférieur ou égal au prix haut.');
    const gammes: Partial<Record<'ECO' | 'HAUT', PrixGamme>> = {};
    for (const g of ['ECO', 'HAUT'] as const) {
      const { bas, haut } = this.gammesSaisies[g];
      const vide = (v: number | null) => v === null || v === undefined || (v as unknown) === '';
      if (vide(bas) && vide(haut)) continue;
      if (vide(bas) || vide(haut)) return this.erreur.set(`${g === 'ECO' ? 'Bas' : 'Haut'} de gamme : renseignez les deux prix, ou aucun.`);
      if (bas! > haut!) return this.erreur.set(`${g === 'ECO' ? 'Bas' : 'Haut'} de gamme : le prix bas doit être inférieur ou égal au prix haut.`);
      gammes[g] = { prixBas: bas!, prixHaut: haut! };
    }
    await this.service.enregistrer({
      ...l,
      gammes: Object.keys(gammes).length ? gammes : undefined,
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

function gammesVides(): Record<'ECO' | 'HAUT', { bas: number | null; haut: number | null }> {
  return { ECO: { bas: null, haut: null }, HAUT: { bas: null, haut: null } };
}
