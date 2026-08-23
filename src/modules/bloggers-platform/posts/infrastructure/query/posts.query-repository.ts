import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, isValidObjectId } from 'mongoose';
import { PaginatedViewDto } from '../../../../../core/dto/base.paginated.view-dto';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';
import { GetPostsQueryParams } from '../../api/input-dto/get-posts-query-params.input-dto';
import {
  NewestLikeViewDto,
  PostViewDto,
} from '../../api/view-dto/posts.view-dto';
import { Post, PostDocument, PostModelType } from '../../domain/post.entity';
import { PostLikesRepository } from '../post-likes.repository';
import { LikeStatus } from '../../../enums/like-status.enum';

@Injectable()
export class PostsQueryRepository {
  constructor(
    @InjectModel(Post.name)
    private PostModel: PostModelType,
    private postLikesRepository: PostLikesRepository,
  ) {}

  async getByIdOrNotFoundFail(
    id: string,
    userId: string | null = null,
  ): Promise<PostViewDto> {
    const post = isValidObjectId(id)
      ? await this.PostModel.findOne({ _id: id, deletedAt: null })
      : null;

    if (!post) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'post not found',
      });
    }

    const [view] = await this.mapToViewWithLikes([post], userId);

    return view;
  }

  async getAll(
    query: GetPostsQueryParams,
    blogId?: string,
    userId: string | null = null,
  ): Promise<PaginatedViewDto<PostViewDto[]>> {
    const filter: FilterQuery<Post> = {
      deletedAt: null,
    };

    if (blogId) {
      filter.blogId = blogId;
    }

    const posts = await this.PostModel.find(filter)
      .sort({ [query.sortBy]: query.sortDirection })
      .skip(query.calculateSkip())
      .limit(query.pageSize);

    const totalCount = await this.PostModel.countDocuments(filter);

    const items = await this.mapToViewWithLikes(posts, userId);

    return PaginatedViewDto.mapToView({
      items,
      totalCount,
      page: query.pageNumber,
      size: query.pageSize,
    });
  }

  /**
   * myStatus и newestLikes не хранятся в документе поста — их дочитываем
   * из коллекции лайков пачкой на всю страницу, чтобы не было N+1.
   */
  private async mapToViewWithLikes(
    posts: PostDocument[],
    userId: string | null,
  ): Promise<PostViewDto[]> {
    if (!posts.length) {
      return [];
    }

    const postIds = posts.map((post) => post._id.toString());

    const [newestLikesByPostId, myStatusByPostId] = await Promise.all([
      this.postLikesRepository.findNewestLikesByPostIds(postIds),
      userId
        ? this.postLikesRepository.findStatusesByPostIds(postIds, userId)
        : Promise.resolve(new Map<string, LikeStatus>()),
    ]);

    return posts.map((post) => {
      const postId = post._id.toString();

      const newestLikes: NewestLikeViewDto[] = (
        newestLikesByPostId.get(postId) ?? []
      ).map((like) => ({
        addedAt: like.createdAt.toISOString(),
        userId: like.userId,
        login: like.login,
      }));

      return PostViewDto.mapToView(
        post,
        myStatusByPostId.get(postId) ?? LikeStatus.None,
        newestLikes,
      );
    });
  }
}
