import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, isValidObjectId } from 'mongoose';
import { PaginatedViewDto } from '../../../../../core/dto/base.paginated.view-dto';
import { GetPostsQueryParams } from '../../../api/posts/input-dto/get-posts-query-params.input-dto';
import { PostViewDto } from '../../../api/posts/view-dto/posts.view-dto';
import { Post, PostModelType } from '../../../domain/post.entity';

@Injectable()
export class PostsQueryRepository {
  constructor(
    @InjectModel(Post.name)
    private PostModel: PostModelType,
  ) {}

  async getByIdOrNotFoundFail(id: string): Promise<PostViewDto> {
    const post = isValidObjectId(id)
      ? await this.PostModel.findOne({ _id: id, deletedAt: null })
      : null;

    if (!post) {
      throw new NotFoundException('post not found');
    }

    //без авторизации myStatus=None, newestLikes=[] (значения по-умолчанию mapToView)
    return PostViewDto.mapToView(post);
  }

  async getAll(
    query: GetPostsQueryParams,
    blogId?: string,
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

    //стрелка, а не PostViewDto.mapToView напрямую — иначе map передаст index как myStatus
    const items = posts.map((post) => PostViewDto.mapToView(post));

    return PaginatedViewDto.mapToView({
      items,
      totalCount,
      page: query.pageNumber,
      size: query.pageSize,
    });
  }
}
