import { Component } from '@angular/core';
import { BlogCatalogV217Component } from './blog-catalog-v217.component';

@Component({
  selector:'app-blog-list',
  standalone:true,
  imports:[BlogCatalogV217Component],
  template:`<app-blog-catalog-v217 />`,
})
export class BlogListComponent {}
