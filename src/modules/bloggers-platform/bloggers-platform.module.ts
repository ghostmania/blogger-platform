import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserAccountsModule } from '../user-accounts/user-accounts.module';

import { Blog, BlogSchema } from './blogs/domain/blog.entity';
import { Post, PostSchema } from './posts/domain/post.entity';
import { PostLike, PostLikeSchema } from './posts/domain/post-like.entity';
import { Comment, CommentSchema } from './comments/domain/comment.entity';
import {
  CommentLike,
  CommentLikeSchema,
} from './comments/domain/comment-like.entity';

import { BlogsController } from './blogs/api/blogs.controller';
import { PostsController } from './posts/api/posts.controller';
import { CommentsController } from './comments/api/comments.controller';

import { BlogsRepository } from './blogs/infrastructure/blogs.repository';
import { BlogsQueryRepository } from './blogs/infrastructure/query/blogs.query-repository';
import { PostsRepository } from './posts/infrastructure/posts.repository';
import { PostLikesRepository } from './posts/infrastructure/post-likes.repository';
import { PostsQueryRepository } from './posts/infrastructure/query/posts.query-repository';
import { CommentsRepository } from './comments/infrastructure/comments.repository';
import { CommentLikesRepository } from './comments/infrastructure/comment-likes.repository';
import { CommentsQueryRepository } from './comments/infrastructure/query/comments.query-repository';

import { CreateBlogUseCase } from './blogs/application/usecases/create-blog.usecase';
import { UpdateBlogUseCase } from './blogs/application/usecases/update-blog.usecase';
import { DeleteBlogUseCase } from './blogs/application/usecases/delete-blog.usecase';
import { GetBlogsQueryHandler } from './blogs/application/queries/get-blogs.query-handler';
import { GetBlogByIdQueryHandler } from './blogs/application/queries/get-blog-by-id.query-handler';
import { GetBlogPostsQueryHandler } from './blogs/application/queries/get-blog-posts.query-handler';

import { CreatePostUseCase } from './posts/application/usecases/create-post.usecase';
import { CreatePostForBlogUseCase } from './posts/application/usecases/create-post-for-blog.usecase';
import { UpdatePostUseCase } from './posts/application/usecases/update-post.usecase';
import { DeletePostUseCase } from './posts/application/usecases/delete-post.usecase';
import { UpdatePostLikeStatusUseCase } from './posts/application/usecases/update-post-like-status.usecase';
import { GetPostsQueryHandler } from './posts/application/queries/get-posts.query-handler';
import { GetPostByIdQueryHandler } from './posts/application/queries/get-post-by-id.query-handler';

import { CreateCommentUseCase } from './comments/application/usecases/create-comment.usecase';
import { UpdateCommentUseCase } from './comments/application/usecases/update-comment.usecase';
import { DeleteCommentUseCase } from './comments/application/usecases/delete-comment.usecase';
import { UpdateCommentLikeStatusUseCase } from './comments/application/usecases/update-comment-like-status.usecase';
import { GetCommentByIdQueryHandler } from './comments/application/queries/get-comment-by-id.query-handler';
import { GetPostCommentsQueryHandler } from './comments/application/queries/get-post-comments.query-handler';

//command handlers (use cases) — пишущая половина CQRS
const commandHandlers = [
  CreateBlogUseCase,
  UpdateBlogUseCase,
  DeleteBlogUseCase,
  CreatePostUseCase,
  CreatePostForBlogUseCase,
  UpdatePostUseCase,
  DeletePostUseCase,
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
  BlogsRepository,
  BlogsQueryRepository,
  PostsRepository,
  PostLikesRepository,
  PostsQueryRepository,
  CommentsRepository,
  CommentLikesRepository,
  CommentsQueryRepository,
];

//тут регистрируем провайдеры всех сущностей блоггерской платформы (blogs, posts, comments, likes)
//CqrsModule подключён глобально в CoreModule
@Module({
  imports: [
    UserAccountsModule,
    MongooseModule.forFeature([
      { name: Blog.name, schema: BlogSchema },
      { name: Post.name, schema: PostSchema },
      { name: PostLike.name, schema: PostLikeSchema },
      { name: Comment.name, schema: CommentSchema },
      { name: CommentLike.name, schema: CommentLikeSchema },
    ]),
  ],
  providers: [...repositories, ...commandHandlers, ...queryHandlers],
  controllers: [BlogsController, PostsController, CommentsController],
})
export class BloggersPlatformModule {}
