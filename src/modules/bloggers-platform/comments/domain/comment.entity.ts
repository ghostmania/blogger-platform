import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Model } from 'mongoose';
import { CreateCommentDomainDto } from './dto/create-comment.domain.dto';
import { UpdateCommentInputDto } from '../api/input-dto/update-comment.input-dto';
import { LikeStatus } from '../../enums/like-status.enum';
import { calculateLikesDelta } from '../../utils/calculate-likes-delta';

//денормализованные данные автора комментария, чтобы не джойнить на чтении
@Schema({ _id: false })
export class CommentatorInfo {
  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ type: String, required: true })
  userLogin: string;
}

export const CommentatorInfoSchema =
  SchemaFactory.createForClass(CommentatorInfo);

/**
 * Денормализованные счётчики реакций на комментарий.
 * Персональный myStatus здесь не хранится — он вычисляется на чтении.
 */
@Schema({ _id: false })
export class CommentLikesInfo {
  @Prop({ type: Number, required: true, default: 0 })
  likesCount: number;

  @Prop({ type: Number, required: true, default: 0 })
  dislikesCount: number;
}

export const CommentLikesInfoSchema =
  SchemaFactory.createForClass(CommentLikesInfo);

/**
 * Comment Entity Schema
 */
@Schema({ timestamps: true })
export class Comment {
  @Prop({ type: String, required: true })
  content: string;

  @Prop({ type: String, required: true })
  postId: string;

  @Prop({ type: CommentatorInfoSchema, required: true })
  commentatorInfo: CommentatorInfo;

  @Prop({
    type: CommentLikesInfoSchema,
    required: true,
    default: () => ({ likesCount: 0, dislikesCount: 0 }),
  })
  likesInfo: CommentLikesInfo;

  createdAt: Date;
  updatedAt: Date;

  @Prop({ type: Date, nullable: true, default: null })
  deletedAt: Date | null;

  get id() {
    // @ts-ignore
    return this._id.toString();
  }

  static createInstance(dto: CreateCommentDomainDto): CommentDocument {
    const comment = new this();
    comment.content = dto.content;
    comment.postId = dto.postId;
    comment.commentatorInfo = {
      userId: dto.userId,
      userLogin: dto.userLogin,
    };
    comment.likesInfo = { likesCount: 0, dislikesCount: 0 };

    return comment as CommentDocument;
  }

  makeDeleted() {
    if (this.deletedAt !== null) {
      throw new Error('Entity already deleted');
    }
    this.deletedAt = new Date();
  }

  //редактировать и удалять комментарий может только его автор
  isOwnedBy(userId: string): boolean {
    return this.commentatorInfo.userId === userId;
  }

  /**
   * Пересчитывает денормализованные счётчики при смене реакции одного
   * пользователя. Сам документ лайка живёт в отдельной коллекции.
   */
  applyLikeStatusChange(oldStatus: LikeStatus, newStatus: LikeStatus) {
    const { likesDelta, dislikesDelta } = calculateLikesDelta(
      oldStatus,
      newStatus,
    );

    this.likesInfo = {
      likesCount: this.likesInfo.likesCount + likesDelta,
      dislikesCount: this.likesInfo.dislikesCount + dislikesDelta,
    };
  }

  update(dto: UpdateCommentInputDto) {
    this.content = dto.content;
  }
}

export const CommentSchema = SchemaFactory.createForClass(Comment);

CommentSchema.loadClass(Comment);

export type CommentDocument = HydratedDocument<Comment>;

export type CommentModelType = Model<CommentDocument> & typeof Comment;
