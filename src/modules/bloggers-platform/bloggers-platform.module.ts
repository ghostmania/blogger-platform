import { Module } from '@nestjs/common';
import { UserAccountsModule } from '../user-accounts/user-accounts.module';
import { MongooseModule } from '@nestjs/mongoose';
import { BlogsController } from './api/blogs/blogs.controller';
import { CommentsController } from './api/comments/comments.controller';
import { PostsController } from './api/posts/posts.controller';
import { BlogsService } from './blogs.service';
import { PostsService } from './posts.service';
import { BlogsRepository } from './infrastructure/blogs.repository';
import { PostsRepository } from './infrastructure/posts.repository';
import { BlogsQueryRepository } from './infrastructure/query/blogs/blogs.query-repository';
import { PostsQueryRepository } from './infrastructure/query/posts/posts.query-repository';
import { CommentsQueryRepository } from './infrastructure/query/comments/comments.query-repository';
import { Blog, BlogSchema } from './domain/blog.entity';
import { Post, PostSchema } from './domain/post.entity';
import { Comment, CommentSchema } from './domain/comment.entity';

//тут регистрируем провайдеры всех сущностей блоггерской платформы (blogs, posts, comments, etc...)
@Module({
  imports: [
    UserAccountsModule,
    MongooseModule.forFeature([
      { name: Blog.name, schema: BlogSchema },
      { name: Post.name, schema: PostSchema },
      { name: Comment.name, schema: CommentSchema },
    ]),
  ],
  providers: [
    BlogsService,
    PostsService,
    BlogsRepository,
    PostsRepository,
    BlogsQueryRepository,
    PostsQueryRepository,
    CommentsQueryRepository,
  ],
  controllers: [BlogsController, PostsController, CommentsController],
})
export class BloggersPlatformModule {}
