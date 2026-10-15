import { Component } from '@angular/core';

@Component({
  selector: 'app-biens',
  template: `
    <h1>Biens</h1>
    <p class="vide">Aucun bien pour l'instant. La saisie des biens arrive avec le lot 1.</p>
  `,
  styles: `.vide { color: var(--texte-discret); }`,
})
export class BiensPage {}
