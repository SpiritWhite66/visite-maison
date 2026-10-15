import { Component, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { BiensService } from '../../application/biens.service';
import { Bien, NoteEnergie } from '../../domain/modeles';

const NOTES: NoteEnergie[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

/** Un champ numérique vide donne `null` avec ngModel : on le range en « non renseigné ». */
function optionnel(v: number | null | undefined): number | undefined {
  return v === null || v === undefined || Number.isNaN(v) ? undefined : v;
}

@Component({
  selector: 'app-bien-form',
  imports: [FormsModule, RouterLink],
  templateUrl: './bien-form.page.html',
})
export class BienFormPage implements OnInit {
  /** Présent en édition (paramètre de route `:id`), absent à la création. */
  readonly id = input<string>();
  private readonly service = inject(BiensService);
  private readonly router = inject(Router);

  protected readonly bien = signal<Bien | null>(null);
  protected readonly notes = NOTES;
  protected readonly erreur = signal('');

  async ngOnInit(): Promise<void> {
    const id = this.id();
    const existant = id ? await this.service.obtenir(id) : this.service.nouveau();
    if (!existant) {
      await this.router.navigate(['/biens']);
      return;
    }
    this.bien.set(structuredClone(existant));
  }

  protected async enregistrer(): Promise<void> {
    const b = this.bien();
    if (!b) return;
    if (!b.titre.trim()) {
      this.erreur.set('Le titre est obligatoire.');
      return;
    }
    await this.service.enregistrer({
      ...b,
      titre: b.titre.trim(),
      prixAffiche: b.prixAffiche ?? 0,
      margeNegociationPct: b.margeNegociationPct ?? 0,
      surfaceHabitable: optionnel(b.surfaceHabitable),
      surfaceTerrain: optionnel(b.surfaceTerrain),
      anneeConstruction: optionnel(b.anneeConstruction),
      urlAnnonce: b.urlAnnonce?.trim() || undefined,
    });
    await this.router.navigate(['/biens', b.id]);
  }
}
