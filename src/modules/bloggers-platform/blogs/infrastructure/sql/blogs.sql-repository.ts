import { Inject, Injectable } from '@nestjs/common';
import { PG_POOL } from '../../../../../core/database/database.constants';
import { Pool } from 'pg';
import { BlogSqlEntity } from '../../domain/sql/blog.sql-entity';
import { CreateBlogDomainDto } from '../../domain/dto/create-blog.domain.dto';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';

const BLOG_COLUMNS = `
  id, name, description, website_url, is_membership, created_at, updated_at
`;
const NUMERIC_ID = /^\d+$/;

@Injectable()
export class BlogsSqlRepository {
  constructor(@Inject(PG_POOL) private pool: Pool) {}

  // создать сущность блога
  createInstance(dto: CreateBlogDomainDto): BlogSqlEntity {
    return BlogSqlEntity.createInstance(dto);
  }

  // сохранить блог в БД
  async save(blog: BlogSqlEntity): Promise<void> {
    if (!blog.id) {
      const { rows } = await this.pool.query<{
        id: string;
        created_at: Date;
        updated_at: Date;
        is_membership: boolean;
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
          blog.isMembership ?? false,
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
           website_url = $4,
           is_membership = $5,
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

  async deleteById(id: string): Promise<void> {
    if (!NUMERIC_ID.test(id)) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'Blog not found',
      });
    }

    const { rowCount } = await this.pool.query(
      'DELETE FROM blogs WHERE id = $1',
      [id],
    );

    if (rowCount === 0) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'Blog not found',
      });
    }
  }

  async findOrNotFoundFail(id: string): Promise<BlogSqlEntity> {
    if (!NUMERIC_ID.test(id)) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'Blog not found',
      });
    }

    const { rows } = await this.pool.query(
      `SELECT ${BLOG_COLUMNS}
       FROM blogs
       WHERE id = $1`,
      [id],
    );

    if (!rows.length) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'Blog not found',
      });
    }

    return BlogSqlEntity.fromRow(rows[0]);
  }
}
