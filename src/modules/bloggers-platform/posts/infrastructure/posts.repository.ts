import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { isValidObjectId } from 'mongoose';
import { Post, PostDocument, PostModelType } from '../domain/post.entity';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../core/exceptions/domain-exception-codes';

@Injectable()
export class PostsRepository {
  constructor(@InjectModel(Post.name) private PostModel: PostModelType) {}

  async findById(id: string): Promise<PostDocument | null> {
    //невалидный ObjectId -> сразу null (иначе Mongoose бросит CastError 500)
    if (!isValidObjectId(id)) {
      return null;
    }

    return this.PostModel.findOne({
      _id: id,
      deletedAt: null,
    });
  }

  async save(post: PostDocument) {
    await post.save();
  }

  async findOrNotFoundFail(id: string): Promise<PostDocument> {
    const post = await this.findById(id);

    if (!post) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'post not found',
      });
    }

    return post;
  }
}
