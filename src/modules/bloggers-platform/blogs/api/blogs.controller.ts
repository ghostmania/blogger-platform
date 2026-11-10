import { ExtractUserIfExistsFromRequest } from '../../../user-accounts/guards/decorators/param/extract-user-if-exists-from-request.decorator';
import { UserContextDto } from '../../../user-accounts/guards/dto/user-context.dto';
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { PaginatedViewDto } from '../../../../core/dto/base.paginated.view-dto';
import { JwtOptionalAuthGuard } from '../../../user-accounts/guards/bearer/jwt-optional-auth.guard';
import { GetBlogByIdQuery } from '../application/queries/get-blog-by-id.query-handler';
import { GetBlogPostsQuery } from '../application/queries/get-blog-posts.query-handler';
import { PostViewDto } from '../../posts/api/view-dto/posts.view-dto';
import { GetBlogsQuery } from '../application/queries/get-blogs.query-handler';
import { GetBlogsQueryParams } from './input-dto/get-blogs-query-params.input-dto';
import { GetPostsQueryParams } from '../../posts/api/input-dto/get-posts-query-params.input-dto';
import { BlogViewDto } from './view-dto/blogs.view-dto';

@Controller('blogs')
export class BlogsController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  async getAll(
    @Query() query: GetBlogsQueryParams,
  ): Promise<PaginatedViewDto<BlogViewDto[]>> {
    return this.queryBus.execute(new GetBlogsQuery(query));
  }

  @ApiBearerAuth()
  @UseGuards(JwtOptionalAuthGuard)
  @Get(':blogId/posts')
  async getBlogPosts(
    @Param('blogId') blogId: string,
    @Query() query: GetPostsQueryParams,
    @ExtractUserIfExistsFromRequest() user: UserContextDto | null,
  ): Promise<PaginatedViewDto<PostViewDto[]>> {
    return this.queryBus.execute(
      new GetBlogPostsQuery(blogId, query, user?.id ?? null),
    );
  }

  @ApiParam({ name: 'id' })
  @Get(':id')
  async getById(@Param('id') id: string): Promise<BlogViewDto> {
    return this.queryBus.execute(new GetBlogByIdQuery(id));
  }
}
