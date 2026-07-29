import { Module } from '@nestjs/common';
import { UserAccountsModule } from '../user-accounts/user-accounts.module';
import { BlogsService } from './blogs.service';
import { BlogsController } from './api/blogs/blogs.controller';
import { CommentsController } from './api/comments/comments.controller';
import { PostsController } from './api/posts/posts.controller';
import { BlogsQueryRepository } from './infrastructure/query/blogs/blogs.query-repository';
import { BlogsRepository } from './infrastructure/blogs.repository';
import { MongooseModule } from '@nestjs/mongoose';
import { Blog, BlogSchema } from './domain/blog.entity';

//тут регистрируем провайдеры всех сущностей блоггерской платформы (blogs, posts, comments, etc...)
@Module({
  imports: [
    UserAccountsModule,
    MongooseModule.forFeature([{ name: Blog.name, schema: BlogSchema }]),
  ],
  providers: [BlogsService, BlogsRepository, BlogsQueryRepository],
  controllers: [BlogsController, CommentsController, PostsController],
})
export class BloggersPlatformModule {}
