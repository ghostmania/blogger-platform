import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Model } from 'mongoose';
import { LikeStatus } from '../enums/like-status.enum';
import { CreatePostLikeDomainDto } from './dto/create-post-like.domain.dto';

/**
 * Одна реакция одного пользователя на один пост (пара postId + userId).
 * login хранится тут же, чтобы собирать newestLikes без обращения к users.
 * createdAt (timestamps) используется как addedAt при отдаче newestLikes.
 */
@Schema({ timestamps: true })
export class PostLike {
  @Prop({ type: String, required: true })
  postId: string;

  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ type: String, required: true })
  login: string;

  @Prop({ type: String, enum: LikeStatus, required: true })
  status: LikeStatus;

  createdAt: Date;
  updatedAt: Date;

  get id() {
    // @ts-ignore
    return this._id.toString();
  }

  static createInstance(dto: CreatePostLikeDomainDto): PostLikeDocument {
    const like = new this();
    like.postId = dto.postId;
    like.userId = dto.userId;
    like.login = dto.login;
    like.status = dto.status;

    return like as PostLikeDocument;
  }

  updateStatus(status: LikeStatus) {
    this.status = status;
  }
}

export const PostLikeSchema = SchemaFactory.createForClass(PostLike);

PostLikeSchema.loadClass(PostLike);

export type PostLikeDocument = HydratedDocument<PostLike>;

export type PostLikeModelType = Model<PostLikeDocument> & typeof PostLike;
