import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { isValidObjectId } from 'mongoose';
import { Blog, BlogDocument, BlogModelType } from '../domain/blog.entity';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../core/exceptions/domain-exception-codes';

@Injectable()
export class BlogsRepository {
  //инжектирование модели через DI
  constructor(@InjectModel(Blog.name) private BlogModel: BlogModelType) {}

  async findById(id: string): Promise<BlogDocument | null> {
    //невалидный ObjectId -> сразу null (иначе Mongoose бросит CastError 500)
    if (!isValidObjectId(id)) {
      return null;
    }

    return this.BlogModel.findOne({
      _id: id,
      deletedAt: null,
    });
  }

  async save(blog: BlogDocument) {
    await blog.save();
  }

  async findOrNotFoundFail(id: string): Promise<BlogDocument> {
    const blog = await this.findById(id);

    if (!blog) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'blog not found',
      });
    }

    return blog;
  }
}
