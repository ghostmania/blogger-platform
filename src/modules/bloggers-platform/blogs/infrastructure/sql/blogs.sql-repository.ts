import { Inject, Injectable } from '@nestjs/common';
import { PG_POOL } from '../../../../../core/database/database.constants';
import { Pool } from 'pg';
import { BlogSqlEntity } from '../../domain/sql/blog.sql-entity';
import { CreateBlogDomainDto } from '../../domain/dto/create-blog.domain.dto';

@Injectable()
export class BlogsSqlRepository {
  constructor(@Inject(PG_POOL) private pool: Pool) {
  }

  // создать сущность блога
  createInstance(dto: CreateBlogDomainDto): BlogSqlEntity {
    return BlogSqlEntity.createInstance(dto);
  }

  // сохранить блог в БД
  async save(blog: BlogSqlEntity):Promise<void>{
    if(!blog.id){
      const { rows } = await this.pool.query<{
        id: string;
        created_at: Date;
        updated_at: Date;
        is_membership: boolean
      }>(
        `INSERT INTO blogs (
           name,
           description,
           website_url,
           is_membership
         )
         VALUES ($1, $2, $3, $4)
         RETURNING id, created_at, updated_at, is_membership`,
        [
          blog.name,
          blog.description,
          blog.websiteUrl,
          blog.isMembership ?? true,
        ],
      );

      blog.id = rows[0].id;
      blog.createdAt = rows[0].created_at;
      blog.updatedAt = rows[0].updated_at;
      blog.isMembership = rows[0].is_membership;

      return;
    }
    await this.pool.query(
      `UPDATE blogs
       SET name = $2,
           description = $3,
           websiteUrl = $4,
           isMembership = $5,
           updated_at = now()
       WHERE id = $1`,
      [
        blog.id,
        blog.name,
        blog.description,
        blog.websiteUrl,
        blog.isMembership,
      ],
    );
  }
}
