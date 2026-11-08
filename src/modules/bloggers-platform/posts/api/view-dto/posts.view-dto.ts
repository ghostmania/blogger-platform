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

  /**
   * Лайки и комментарии на TypeORM ещё не переведены, поэтому extendedLikesInfo
   * заполняется заглушками ради контракта ViewModel: 0 / 0 / None / [].
   */
  static mapToView(post: Post): PostViewDto {
    const dto = new PostViewDto();
    dto.id = post.id;
    dto.title = post.title;
    dto.shortDescription = post.shortDescription;
    dto.content = post.content;
    dto.blogId = post.blogId;
    dto.blogName = post.blogName;
    dto.createdAt = post.createdAt;
    dto.extendedLikesInfo = {
      likesCount: 0,
      dislikesCount: 0,
      myStatus: LikeStatus.None,
      newestLikes: [],
    };
    return dto;
  }
}
