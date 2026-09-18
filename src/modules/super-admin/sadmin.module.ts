import { Module } from '@nestjs/common';
import { SadminController } from './sadmin.controller';
import { AdminBlogPostsService } from './admin-blog-posts.service';
// import { TestingController } from './testing.controller';

@Module({
  imports: [],
  controllers: [SadminController],
  providers: [AdminBlogPostsService],
})
export class SadminModule {}
