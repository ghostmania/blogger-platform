import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Blog } from '../../domain/blog.entity';
import { CreateBlogDomainDto } from '../../domain/dto/create-blog.domain.dto';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';
import { isBigintId } from '../../../../../core/database/bigint-id';

@Injectable()
export class BlogsTypeOrmRepository {
  constructor(
    @InjectRepository(Blog) private readonly repository: Repository<Blog>,
  ) {}

  createInstance(dto: CreateBlogDomainDto): Blog {
    return Blog.createInstance(dto);
  }

  async save(blog: Blog): Promise<void> {
    await this.repository.save(blog);
  }

  //id — bigint; нечисловая строка уронила бы запрос ошибкой 22P02 (500 вместо 404)
  findById(id: string): Promise<Blog | null> {
    if (!isBigintId(id)) return Promise.resolve(null);
    return this.repository.findOneBy({ id });
  }

  async findOrNotFoundFail(id: string): Promise<Blog> {
    const blog = await this.findById(id);
    if (!blog) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'Blog not found',
      });
    }
    return blog;
  }

  //посты блога удаляет каскад внешнего ключа в БД
  async delete(blog: Blog): Promise<void> {
    await this.repository.delete({ id: blog.id });
  }
}
