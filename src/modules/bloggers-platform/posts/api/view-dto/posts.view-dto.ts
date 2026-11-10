import { LikeStatus } from '../../../enums/like-status.enum';
import { Post } from '../../domain/post.entity';

//деталь одного лайка для newestLikes (последние 3 лайка со статусом Like)
export class NewestLikeViewDto {
  addedAt: string;
  userId: string;
  login: string;
}

export class ExtendedLikesInfoViewDto {
  likesCount: number;
  dislikesCount: number;
  myStatus: LikeStatus;
  newestLikes: NewestLikeViewDto[];
}

export class PostViewDto {
  id: string;
  title: string;
  shortDescription: string;
  content: string;
  blogId: string;
  blogName: string;
  createdAt: Date;
  extendedLikesInfo: ExtendedLikesInfoViewDto;

  //реакции приходят отдельно: сущность поста их не хранит
  static mapToView(
    post: Post,
    extendedLikesInfo: ExtendedLikesInfoViewDto,
  ): PostViewDto {
    const dto = new PostViewDto();
    dto.id = post.id;
    dto.title = post.title;
    dto.shortDescription = post.shortDescription;
    dto.content = post.content;
    dto.blogId = post.blogId;
    dto.blogName = post.blogName;
    dto.createdAt = post.createdAt;
    dto.extendedLikesInfo = extendedLikesInfo;
    return dto;
  }
}
