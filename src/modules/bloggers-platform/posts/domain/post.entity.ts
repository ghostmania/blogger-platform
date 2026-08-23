import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Model } from 'mongoose';
import { CreatePostDomainDto } from './dto/create-post.domain.dto';
import { UpdatePostInputDto } from '../api/input-dto/update-post.input-dto';
import { LikeStatus } from '../../enums/like-status.enum';
import { calculateLikesDelta } from '../../utils/calculate-likes-delta';

/**
 * Денормализованные счётчики реакций на пост.
 * myStatus и newestLikes здесь не хранятся — они вычисляются на чтении из
 * коллекции лайков под конкретного пользователя.
 */
@Schema({ _id: false })
export class ExtendedLikesInfo {
  @Prop({ type: Number, required: true, default: 0 })
  likesCount: number;

  @Prop({ type: Number, required: true, default: 0 })
  dislikesCount: number;
}

export const ExtendedLikesInfoSchema =
  SchemaFactory.createForClass(ExtendedLikesInfo);

/**
 * Post Entity Schema
 */
@Schema({ timestamps: true })
export class Post {
  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: true })
  shortDescription: string;

  @Prop({ type: String, required: true })
  content: string;

  @Prop({ type: String, required: true })
  blogId: string;

  //денормализованное имя блога, чтобы не джойнить на чтении
  @Prop({ type: String, required: true })
  blogName: string;

  @Prop({
    type: ExtendedLikesInfoSchema,
    required: true,
    default: () => ({ likesCount: 0, dislikesCount: 0 }),
  })
  extendedLikesInfo: ExtendedLikesInfo;

  createdAt: Date;
  updatedAt: Date;

  @Prop({ type: Date, nullable: true, default: null })
  deletedAt: Date | null;

  get id() {
    // @ts-ignore
    return this._id.toString();
  }

  static createInstance(dto: CreatePostDomainDto): PostDocument {
    const post = new this();
    post.title = dto.title;
    post.shortDescription = dto.shortDescription;
    post.content = dto.content;
    post.blogId = dto.blogId;
    post.blogName = dto.blogName;
    post.extendedLikesInfo = { likesCount: 0, dislikesCount: 0 };

    return post as PostDocument;
  }

  makeDeleted() {
    if (this.deletedAt !== null) {
      throw new Error('Entity already deleted');
    }
    this.deletedAt = new Date();
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

    this.extendedLikesInfo = {
      likesCount: this.extendedLikesInfo.likesCount + likesDelta,
      dislikesCount: this.extendedLikesInfo.dislikesCount + dislikesDelta,
    };
  }

  update(dto: UpdatePostInputDto) {
    this.title = dto.title;
    this.shortDescription = dto.shortDescription;
    this.content = dto.content;
    this.blogId = dto.blogId;
  }
}

export const PostSchema = SchemaFactory.createForClass(Post);

PostSchema.loadClass(Post);

export type PostDocument = HydratedDocument<Post>;

export type PostModelType = Model<PostDocument> & typeof Post;
