import { Component, OnInit } from '@angular/core';
import { AccordionModule } from 'primeng/accordion';
import { JsonReader } from '../json-reader';

@Component({
  selector: 'app-clases',
  imports: [AccordionModule],
  templateUrl: './clases.html',
  styleUrl: './clases.css',
  standalone: true,
})
export class Clases implements OnInit {
  tabs: any[] = [];
  data: any;
  url: string = 'class/class-barbarian.json';
  public constructor(private readonly jsonReader: JsonReader) {}

  ngOnInit(): void {
    this.jsonReader.getData(this.url).subscribe(resp => {
      this.data = resp;
      //console.log(this.data);
      this.tabs = [
        {
          value: "0",
          title: this.data.class[0].name,
          content: "content"
        }
      ]
    });

  }
}
