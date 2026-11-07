import { LikesSqlRepository } from './likes/likes.sql-repository';
import { GetPostCommentsQueryHandler } from './comments/application/queries/get-post-comments.query-handler';
import { UpdatePostLikeStatusUseCase } from './posts/application/usecases/update-post-like-status.usecase';
import { UpdateCommentLikeStatusUseCase } from './comments/application/usecases/update-comment-like-status.usecase';
import { DeleteCommentUseCase } from './comments/application/usecases/delete-comment.usecase';
import { UpdateCommentUseCase } from './comments/application/usecases/update-comment.usecase';
import { Module } from '@nestjs/common';
import { UserAccountsModule } from '../user-accounts/user-accounts.module';

import { BlogsController } from './blogs/api/blogs.controller';
import { CommentsController } from './comments/api/comments.controller';

import { CreateBlogUseCase } from './blogs/application/usecases/create-blog.usecase';
import { BlogsSqlRepository } from './blogs/infrastructure/sql/blogs.sql-repository';
import { GetBlogByIdQueryHandler } from './blogs/application/queries/get-blog-by-id.query-handler';
import { BlogsSqlQueryRepository } from './blogs/infrastructure/sql/query/blogs.sql-query-repository';
import { GetBlogsQueryHandler } from './blogs/application/queries/get-blogs.query-handler';
import { UpdateBlogUseCase } from './blogs/application/usecases/update-blog.usecase';
import { DeleteBlogUseCase } from './blogs/application/usecases/delete-blog.usecase';
import { GetBlogPostsQueryHandler } from './blogs/application/queries/get-blog-posts.query-handler';
import { GetPostsQueryHandler } from './posts/application/queries/get-posts.query-handler';
import { PostsSqlQueryRepository } from './posts/infrastructure/sql/query/posts.sql-query-repository';
import { PostsController } from './posts/api/posts.controller';
import { GetPostByIdQueryHandler } from './posts/application/queries/get-post-by-id.query-handler';
import { CreateCommentUseCase } from './comments/application/usecases/create-comment.usecase';
import { GetCommentByIdQueryHandler } from './comments/application/queries/get-comment-by-id.query-handler';
import { CommentsSqlRepository } from './comments/sql/comments.sql-repository';
import { CommentsSqlQueryRepository } from './comments/sql/query/comments.sql-query-repository';

//command handlers (use cases) — пишущая половина CQRS
const commandHandlers = [
  CreateBlogUseCase,
  UpdateBlogUseCase,
  DeleteBlogUseCase,
  UpdatePostLikeStatusUseCase,
  CreateCommentUseCase,
  UpdateCommentUseCase,
  DeleteCommentUseCase,
  UpdateCommentLikeStatusUseCase,
];

//query handlers — читающая половина CQRS, работают только с query-репозиториями
const queryHandlers = [
  GetBlogsQueryHandler,
  GetBlogByIdQueryHandler,
  GetBlogPostsQueryHandler,
  GetPostsQueryHandler,
  GetPostByIdQueryHandler,
  GetCommentByIdQueryHandler,
  GetPostCommentsQueryHandler,
];

const repositories = [
  BlogsSqlRepository,
  BlogsSqlQueryRepository,
  PostsSqlQueryRepository,
  CommentsSqlRepository,
  LikesSqlRepository,
  CommentsSqlQueryRepository,
];

//тут регистрируем провайдеры всех сущностей блоггерской платформы (blogs, posts, comments, likes)
//CqrsModule подключён глобально в CoreModule
@Module({
  imports: [UserAccountsModule],
  providers: [...repositories, ...commandHandlers, ...queryHandlers],
  controllers: [BlogsController, PostsController, CommentsController],
})
export class BloggersPlatformModule {}
