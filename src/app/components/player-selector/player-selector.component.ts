import { ChangeDetectorRef, Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { JsonReader } from '../../json-reader';

@Component({
  selector: 'app-player-selector',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './player-selector.component.html',
  styleUrl: './player-selector.component.scss',
})
export class PlayerSelectorComponent implements OnInit {
  @Input({ required: true }) characterName = '';
  @Input() imageUrl = '';
  @Input() name = '';
  @Input() level: number | string | null = null;
  @Input() race = '';
  @Input() characterClass = '';
  @Input() disabled = false;
  private cdr = inject(ChangeDetectorRef);

  private readonly jsonReader = inject(JsonReader);
  protected loading = true;

  async ngOnInit(): Promise<void> {
    if (!this.characterName) {
      this.loading = false;
      return;
    }

    try {
      const result = await this.jsonReader.getData('characters/' + this.characterName + '.json');
      const character = result?.data;
      this.name ||= character?.name ?? this.characterName;
      this.imageUrl ||= this.resolveImageUrl(character);
      this.level ??= this.resolveLevel(character);
      this.race ||= character?.race?.baseRaceName ?? character?.race?.fullName ?? '';
      this.characterClass ||= character?.classes?.map((item: any) => item.definition?.name).filter(Boolean).join(' / ') ?? '';
    } catch (error) {
      console.log(error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  protected get displayName(): string {
    return this.name || this.characterName;
  }

  protected get linkCommands(): string[] {
    return ['/', this.characterName];
  }

  private resolveImageUrl(character: any): string {
    return (
      character?.decorations?.avatarUrl ||
      character?.race?.portraitAvatarUrl ||
      character?.race?.largeAvatarUrl ||
      character?.race?.avatarUrl ||
      ''
    );
  }

  private resolveLevel(character: any): number {
    return (character?.classes ?? []).reduce((total: number, item: any) => total + (item.level ?? 0), 0);
  }
}
