import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PersonnesService } from '../../application/personnes.service';
import { Personne } from '../../domain/modeles';
import { IconeComponent } from '../../shared/icone.component';
import { couleurPersonne, initiale } from '../../shared/personnes';

/** Personnes qui visitent les biens : chacune peut donner son avis sur chaque bien. */
@Component({
  selector: 'app-personnes',
  imports: [FormsModule, IconeComponent],
  template: `
    <section class="carte">
      <h2>Personnes</h2>
      <p class="discret">
        Ajoutez celles et ceux qui visitent avec vous. Sur chaque bien, chacun donne ses étoiles et son avis, ou est marqué N/A s’il n’était pas là.
      </p>

      @if (service.personnes().length === 0) {
        <p class="vide-liste">Aucune personne pour l’instant.</p>
      }
      <ul>
        @for (p of service.personnes(); track p.id) {
          <li>
            <span class="pastille" [style.background]="couleur(p.id)" aria-hidden="true">{{ initiale(p.prenom) }}</span>
            <span class="prenom">{{ p.prenom }}</span>
            <button type="button" class="bouton-texte bouton-icone" (click)="renommer(p)" [attr.aria-label]="'Renommer ' + p.prenom" title="Renommer">
              <app-icone nom="crayon" [taille]="18" />
            </button>
            <button type="button" class="bouton-texte bouton-icone danger" (click)="supprimer(p)" [attr.aria-label]="'Supprimer ' + p.prenom" title="Supprimer">
              <app-icone nom="corbeille" [taille]="18" />
            </button>
          </li>
        }
      </ul>

      <form class="ajout" (ngSubmit)="ajouter()">
        <label class="champ">Nouvelle personne
          <input name="prenom" [(ngModel)]="saisie" placeholder="Prénom" autocomplete="off" />
        </label>
        <button type="submit" [disabled]="!saisie.trim()"><app-icone nom="plus" [taille]="20" /> Ajouter</button>
      </form>
      @if (erreur()) { <p class="erreur" role="alert">{{ erreur() }}</p> }
    </section>
  `,
  styles: `
    h2 { margin: 0 0 0.25rem; }
    .discret { margin: 0 0 0.75rem; font-size: 0.9rem; }
    .vide-liste { margin: 0 0 0.75rem; color: var(--texte-discret); font-style: italic; }
    ul { list-style: none; margin: 0 0 0.75rem; padding: 0; }
    li { display: flex; align-items: center; gap: 0.6rem; min-height: 52px; border-bottom: 1px solid var(--filet); }
    .prenom { flex: 1; min-width: 0; font-weight: 600; color: var(--encre); overflow-wrap: anywhere; }
    .pastille { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 50%; color: #fff; font-weight: 750; flex-shrink: 0; }
    li button { width: 44px; min-width: 44px; color: var(--texte-discret); }
    li button.danger { color: var(--etat-travaux); }
    .ajout { display: flex; align-items: flex-end; gap: 0.5rem; }
    .ajout label { flex: 1; margin: 0; }
  `,
})
export class PersonnesComponent implements OnInit {
  protected readonly service = inject(PersonnesService);
  protected saisie = '';
  protected readonly erreur = signal('');
  protected readonly couleur = couleurPersonne;
  protected readonly initiale = initiale;

  async ngOnInit(): Promise<void> {
    await this.service.charger();
  }

  protected async ajouter(): Promise<void> {
    this.erreur.set('');
    if (await this.service.ajouter(this.saisie)) this.saisie = '';
    else this.erreur.set('Ce prénom est vide ou existe déjà.');
  }

  protected async renommer(p: Personne): Promise<void> {
    const nouveau = prompt('Nouveau prénom', p.prenom);
    if (nouveau === null || nouveau.trim() === p.prenom) return;
    this.erreur.set('');
    if (!(await this.service.renommer(p.id, nouveau))) this.erreur.set('Ce prénom est vide ou existe déjà.');
  }

  protected async supprimer(p: Personne): Promise<void> {
    if (!confirm(`Supprimer ${p.prenom} ? Ses avis sur tous les biens seront aussi supprimés.`)) return;
    await this.service.supprimer(p.id);
  }
}
