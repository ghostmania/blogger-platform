// import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
// import { BlogsQueryRepository } from '../../infrastructure/query/blogs.query-repository';
// import { PostsQueryRepository } from '../../../posts/infrastructure/query/posts.query-repository';
// import { GetPostsQueryParams } from '../../../posts/api/input-dto/get-posts-query-params.input-dto';
// import { PostViewDto } from '../../../posts/api/view-dto/posts.view-dto';
// import { PaginatedViewDto } from '../../../../../core/dto/base.paginated.view-dto';
//
// export class GetBlogPostsQuery {
//   constructor(
//     public blogId: string,
//     public queryParams: GetPostsQueryParams,
//     public userId: string | null,
//   ) {}
// }
//
// @QueryHandler(GetBlogPostsQuery)
// export class GetBlogPostsQueryHandler implements IQueryHandler<
//   GetBlogPostsQuery,
//   PaginatedViewDto<PostViewDto[]>
// > {
//   constructor(
//     private blogsQueryRepository: BlogsQueryRepository,
//     private postsQueryRepository: PostsQueryRepository,
//   ) {}
//
//   async execute({
//     blogId,
//     queryParams,
//     userId,
//   }: GetBlogPostsQuery): Promise<PaginatedViewDto<PostViewDto[]>> {
//     //404, если блога нет
//     await this.blogsQueryRepository.getByIdOrNotFoundFail(blogId);
//
//     return this.postsQueryRepository.getAll(queryParams, blogId, userId);
//   }
// }
