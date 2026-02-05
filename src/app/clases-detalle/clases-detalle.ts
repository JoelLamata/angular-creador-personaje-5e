import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { JsonReader } from '../json-reader';
import { AsyncPipe, JsonPipe } from '@angular/common';

@Component({
  selector: 'app-clases-detalle',
  imports: [AsyncPipe, JsonPipe],
  templateUrl: './clases-detalle.html',
  styleUrl: './clases-detalle.css',
})
export class ClasesDetalle implements OnInit {
  page!: string;
  data: Promise<any> | undefined;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly jsonReader: JsonReader
  ) {}

  ngOnInit(): void {
    this.page = this.route.snapshot.paramMap.get('page')!;
    this.data = this.jsonReader.getPageData('class/', this.page);
  }
}
