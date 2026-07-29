import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Model } from 'mongoose';
import { LikeStatus } from '../enums/like-status.enum';
import { CreateCommentLikeDomainDto } from './dto/create-comment-like.domain.dto';

/**
 * Одна реакция одного пользователя на один комментарий (пара commentId + userId).
 */
@Schema({ timestamps: true })
export class CommentLike {
  @Prop({ type: String, required: true })
  commentId: string;

  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ type: String, enum: LikeStatus, required: true })
  status: LikeStatus;

  createdAt: Date;
  updatedAt: Date;

  get id() {
    // @ts-ignore
    return this._id.toString();
  }

  static createInstance(dto: CreateCommentLikeDomainDto): CommentLikeDocument {
    const like = new this();
    like.commentId = dto.commentId;
    like.userId = dto.userId;
    like.status = dto.status;

    return like as CommentLikeDocument;
  }

  updateStatus(status: LikeStatus) {
    this.status = status;
  }
}

export const CommentLikeSchema = SchemaFactory.createForClass(CommentLike);

CommentLikeSchema.loadClass(CommentLike);

export type CommentLikeDocument = HydratedDocument<CommentLike>;

export type CommentLikeModelType = Model<CommentLikeDocument> &
  typeof CommentLike;
