import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

interface PlayerMetric {
  label: string;
  value: string | number;
  icon: 'heart' | 'shield' | 'speed';
}

@Component({
  selector: 'app-player-base',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './player-base.component.html',
  styleUrl: './player-base.component.scss',
})
export class PlayerBaseComponent {
  @Input() character: any;
  @Input() name = '';
  @Input() avatarUrl = '';
  @Input() level: string | number | null = null;
  @Input() race = '';
  @Input() characterClass = '';
  @Input() hitPoints: string | number | null = null;
  @Input() armorClass: string | number | null = null;
  @Input() speed: string | number | null = null;

  get displayName(): string {
    return this.name || this.character?.name || 'Sin nombre';
  }

  get imageUrl(): string {
    return (
      this.avatarUrl ||
      this.character?.decorations?.avatarUrl ||
      this.character?.race?.portraitAvatarUrl ||
      this.character?.race?.largeAvatarUrl ||
      ''
    );
  }

  get displayLevel(): string {
    const explicitLevel = this.level ?? this.character?.classes?.[0]?.level;
    return explicitLevel ? `Nivel ${explicitLevel}` : 'Nivel';
  }

  get displayRace(): string {
    return this.race || this.character?.race?.baseRaceName || this.character?.race?.fullName || 'Raza';
  }

  get displayClass(): string {
    return this.characterClass || this.character?.classes?.[0]?.definition?.name || 'Clase';
  }

  get metrics(): PlayerMetric[] {
    return [
      {
        icon: 'heart',
        label: 'Puntos de Golpe',
        value: this.hitPoints ?? this.resolveHitPoints(),
      },
      {
        icon: 'shield',
        label: 'Clase de Armadura',
        value: this.armorClass ?? this.resolveArmorClass(),
      },
      {
        icon: 'speed',
        label: 'Velocidad',
        value: this.speed ?? this.resolveSpeed(),
      },
    ];
  }

  private resolveHitPoints(): string {
    const max = this.character?.baseHitPoints ?? this.character?.overrideHitPoints ?? 0;
    const removed = this.character?.removedHitPoints ?? 0;
    const current = Math.max(max - removed, 0);
    return `${current}/${max}`;
  }

  private resolveArmorClass(): string | number {
    return this.character?.armorClass ?? this.character?.defenses?.armorClass ?? 'N/D';
  }

  private resolveSpeed(): string {
    const walk = this.character?.customSpeeds?.walk ?? this.character?.race?.weightSpeeds?.normal?.walk ?? 30;
    return `${walk} pies`;
  }
}
