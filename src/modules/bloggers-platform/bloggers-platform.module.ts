import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserAccountsModule } from '../user-accounts/user-accounts.module';

import { Post, PostSchema } from './posts/domain/post.entity';
import { PostLike, PostLikeSchema } from './posts/domain/post-like.entity';
import { Comment, CommentSchema } from './comments/domain/comment.entity';
import {
  CommentLike,
  CommentLikeSchema,
} from './comments/domain/comment-like.entity';

// import { BlogsController } from './blogs/api/blogs.controller';
// import { PostsController } from './posts/api/posts.controller';
// import { CommentsController } from './comments/api/comments.controller';


import { CreateBlogUseCase } from './blogs/application/usecases/create-blog.usecase';
import { BlogsSqlRepository } from './blogs/infrastructure/sql/blogs.sql-repository';
import { GetBlogByIdQueryHandler } from './blogs/application/queries/get-blog-by-id.query-handler';
// import { BlogsQueryRepository } from './blogs/infrastructure/query/blogs.query-repository';
import { BlogsSqlQueryRepository } from './blogs/infrastructure/sql/query/blogs.sql-query-repository';
import { GetBlogsQueryHandler } from './blogs/application/queries/get-blogs.query-handler';

//command handlers (use cases) — пишущая половина CQRS
const commandHandlers = [
  CreateBlogUseCase,
  // UpdateBlogUseCase,
  // DeleteBlogUseCase,
  // CreatePostUseCase,
  // CreatePostForBlogUseCase,
  // UpdatePostUseCase,
  // DeletePostUseCase,
  // UpdatePostLikeStatusUseCase,
  // CreateCommentUseCase,
  // UpdateCommentUseCase,
  // DeleteCommentUseCase,
  // UpdateCommentLikeStatusUseCase,
];

//query handlers — читающая половина CQRS, работают только с query-репозиториями
const queryHandlers = [
  GetBlogsQueryHandler,
  GetBlogByIdQueryHandler,
  // GetBlogPostsQueryHandler,
  // GetPostsQueryHandler,
  // GetPostByIdQueryHandler,
  // GetCommentByIdQueryHandler,
  // GetPostCommentsQueryHandler,
];

const repositories = [
  BlogsSqlRepository,
  BlogsSqlQueryRepository,
  // PostsRepository,
  // PostLikesRepository,
  // PostsQueryRepository,
  // CommentsRepository,
  // CommentLikesRepository,
  // CommentsQueryRepository,
];

//тут регистрируем провайдеры всех сущностей блоггерской платформы (blogs, posts, comments, likes)
//CqrsModule подключён глобально в CoreModule
@Module({
  imports: [
    UserAccountsModule,
    // MongooseModule.forFeature([
      // { name: Blog.name, schema: BlogSchema },
      // { name: Post.name, schema: PostSchema },
      // { name: PostLike.name, schema: PostLikeSchema },
      // { name: Comment.name, schema: CommentSchema },
      // { name: CommentLike.name, schema: CommentLikeSchema },
    // ]),
  ],
  providers: [...repositories, ...commandHandlers, ...queryHandlers],
  controllers: [
    // BlogsController
    // , PostsController, CommentsController
  ],
})
export class BloggersPlatformModule {}
