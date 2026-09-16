import { CreateBlogDomainDto } from '../dto/create-blog.domain.dto';

export type BlogRow = {
  id:string;
  name: string;
  description:string;
  website_url: string;
  is_membership: boolean;
  created_at: Date;
  updated_at: Date;
}

export class BlogSqlEntity {
  id: string = '';
  name: string;
  description: string;
  websiteUrl: string;
  isMembership: boolean;
  createdAt: Date;
  updatedAt: Date;

  // создаем сущность
  static createInstance(dto: CreateBlogDomainDto): BlogSqlEntity {
    const blog = new this();
    blog.name = dto.name;
    blog.description = dto.description;
    blog.websiteUrl = dto.websiteUrl;
    return blog;
  }

  //разворачивает плоскую строку БД во вложенную доменную структуру
  static fromRow(row: BlogRow): BlogSqlEntity {
    const blog = new this();

    blog.id = row.id;
    blog.name = row.name;
    blog.description = row.description;
    blog.websiteUrl = row.website_url;
    blog.isMembership = row.is_membership;

    blog.createdAt = row.created_at;
    blog.updatedAt = row.updated_at;

    return blog;
  }
}
