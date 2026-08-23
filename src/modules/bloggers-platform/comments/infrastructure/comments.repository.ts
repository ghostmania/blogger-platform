import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { isValidObjectId } from 'mongoose';
import {
  Comment,
  CommentDocument,
  CommentModelType,
} from '../domain/comment.entity';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../core/exceptions/domain-exception-codes';

@Injectable()
export class CommentsRepository {
  constructor(
    @InjectModel(Comment.name) private CommentModel: CommentModelType,
  ) {}

  async findById(id: string): Promise<CommentDocument | null> {
    //невалидный ObjectId -> сразу null (иначе Mongoose бросит CastError 500)
    if (!isValidObjectId(id)) {
      return null;
    }

    return this.CommentModel.findOne({
      _id: id,
      deletedAt: null,
    });
  }

  async save(comment: CommentDocument) {
    await comment.save();
  }

  async findOrNotFoundFail(id: string): Promise<CommentDocument> {
    const comment = await this.findById(id);

    if (!comment) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'comment not found',
      });
    }

    return comment;
  }
}
