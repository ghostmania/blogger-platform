import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserAccountsModule } from '../user-accounts/user-accounts.module';

import { Blog } from './blogs/domain/blog.entity';
import { Post } from './posts/domain/post.entity';
import { Comment } from './comments/domain/comment.entity';

import { BlogsController } from './blogs/api/blogs.controller';
import { PostsController } from './posts/api/posts.controller';
import { CommentsController } from './comments/api/comments.controller';

import { BlogsTypeOrmRepository } from './blogs/infrastructure/typeorm/blogs.typeorm-repository';
import { BlogsTypeOrmQueryRepository } from './blogs/infrastructure/typeorm/query/blogs.typeorm-query-repository';
import { PostsTypeOrmRepository } from './posts/infrastructure/typeorm/posts.typeorm-repository';
import { PostsTypeOrmQueryRepository } from './posts/infrastructure/typeorm/query/posts.typeorm-query-repository';
import { CommentsTypeOrmRepository } from './comments/infrastructure/typeorm/comments.typeorm-repository';
import { CommentsTypeOrmQueryRepository } from './comments/infrastructure/typeorm/query/comments.typeorm-query-repository';
import { LikesSqlRepository } from './likes/likes.sql-repository';

import { CreateBlogUseCase } from './blogs/application/usecases/create-blog.usecase';
import { UpdateBlogUseCase } from './blogs/application/usecases/update-blog.usecase';
import { DeleteBlogUseCase } from './blogs/application/usecases/delete-blog.usecase';
import { CreatePostForBlogUseCase } from './posts/application/usecases/create-post-for-blog.usecase';
import { UpdatePostForBlogUseCase } from './posts/application/usecases/update-post-for-blog.usecase';
import { DeletePostForBlogUseCase } from './posts/application/usecases/delete-post-for-blog.usecase';
import { UpdatePostLikeStatusUseCase } from './posts/application/usecases/update-post-like-status.usecase';
import { CreateCommentUseCase } from './comments/application/usecases/create-comment.usecase';
import { UpdateCommentUseCase } from './comments/application/usecases/update-comment.usecase';
import { DeleteCommentUseCase } from './comments/application/usecases/delete-comment.usecase';
import { UpdateCommentLikeStatusUseCase } from './comments/application/usecases/update-comment-like-status.usecase';

import { GetBlogsQueryHandler } from './blogs/application/queries/get-blogs.query-handler';
import { GetBlogByIdQueryHandler } from './blogs/application/queries/get-blog-by-id.query-handler';
import { GetBlogPostsQueryHandler } from './blogs/application/queries/get-blog-posts.query-handler';
import { GetPostsQueryHandler } from './posts/application/queries/get-posts.query-handler';
import { GetPostByIdQueryHandler } from './posts/application/queries/get-post-by-id.query-handler';
import { GetCommentByIdQueryHandler } from './comments/application/queries/get-comment-by-id.query-handler';
import { GetPostCommentsQueryHandler } from './comments/application/queries/get-post-comments.query-handler';

//command handlers (use cases) — пишущая половина CQRS
const commandHandlers = [
  CreateBlogUseCase,
  UpdateBlogUseCase,
  DeleteBlogUseCase,
  CreatePostForBlogUseCase,
  UpdatePostForBlogUseCase,
  DeletePostForBlogUseCase,
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

//blogs, posts и comments — на TypeORM; likes пока остаются на raw SQL
const repositories = [
  BlogsTypeOrmRepository,
  BlogsTypeOrmQueryRepository,
  PostsTypeOrmRepository,
  PostsTypeOrmQueryRepository,
  CommentsTypeOrmRepository,
  CommentsTypeOrmQueryRepository,
  LikesSqlRepository,
];

//CqrsModule подключён глобально в CoreModule
@Module({
  imports: [
    TypeOrmModule.forFeature([Blog, Post, Comment]),
    UserAccountsModule,
  ],
  providers: [...repositories, ...commandHandlers, ...queryHandlers],
  controllers: [BlogsController, PostsController, CommentsController],
})
export class BloggersPlatformModule {}
