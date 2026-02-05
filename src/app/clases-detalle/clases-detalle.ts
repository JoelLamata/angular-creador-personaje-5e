import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { JsonReader } from '../json-reader';

@Component({
  selector: 'app-clases-detalle',
  imports: [],
  templateUrl: './clases-detalle.html',
  styleUrl: './clases-detalle.css',
})
export class ClasesDetalle implements OnInit {
  page!: string;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly jsonReader: JsonReader
  ) {}

  ngOnInit(): void {
    this.page = this.route.snapshot.paramMap.get('page')!;
  }
}
