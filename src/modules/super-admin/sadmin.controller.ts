import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBasicAuth, ApiParam } from '@nestjs/swagger';
import { PaginatedViewDto } from '../../core/dto/base.paginated.view-dto';
import { GetUsersQueryParams } from '../user-accounts/api/input-dto/get-users-query-params.input-dto';
import { UserViewDto } from '../user-accounts/api/view-dto/users.view-dto';
import { GetUsersQuery } from '../user-accounts/application/queries/get-users.query-handler';
import { DeleteUserCommand } from '../user-accounts/application/usecases/delete-user.usecase';
import { CreateUserInputDto } from '../user-accounts/api/input-dto/users.input-dto';
import { GetUserByIdQuery } from '../user-accounts/application/queries/get-user-by-id.query-handler';
import { CreateConfirmedUserCommand } from '../user-accounts/application/usecases/create-confirmed-user.usecase';
import { BasicAuthGuard } from '../user-accounts/guards/basic/basic-auth.guard';
import { CreateBlogInputDto } from '../bloggers-platform/blogs/api/input-dto/create-blog.input-dto';
import { BlogViewDto } from '../bloggers-platform/blogs/api/view-dto/blogs.view-dto';
import { CreateBlogCommand } from '../bloggers-platform/blogs/application/usecases/create-blog.usecase';
import { GetBlogByIdQuery } from '../bloggers-platform/blogs/application/queries/get-blog-by-id.query-handler';
import { GetBlogsQueryParams } from '../bloggers-platform/blogs/api/input-dto/get-blogs-query-params.input-dto';
import { GetBlogsQuery } from '../bloggers-platform/blogs/application/queries/get-blogs.query-handler';
import { UpdateBlogInputDto } from '../bloggers-platform/blogs/api/input-dto/update-blog.input-dto';
import { UpdateBlogCommand } from '../bloggers-platform/blogs/application/usecases/update-blog.usecase';
import { DeleteBlogCommand } from '../bloggers-platform/blogs/application/usecases/delete-blog.usecase';
import { GetBlogPostsQuery } from '../bloggers-platform/blogs/application/queries/get-blog-posts.query-handler';
import { CreatePostForBlogInputDto } from '../bloggers-platform/posts/api/input-dto/create-post-for-blog.input-dto';
import { GetPostsQueryParams } from '../bloggers-platform/posts/api/input-dto/get-posts-query-params.input-dto';
import { UpdatePostForBlogInputDto } from '../bloggers-platform/posts/api/input-dto/update-post-for-blog.input-dto';
import { PostViewDto } from '../bloggers-platform/posts/api/view-dto/posts.view-dto';
import { GetPostByIdQuery } from '../bloggers-platform/posts/application/queries/get-post-by-id.query-handler';
import { CreatePostForBlogCommand } from '../bloggers-platform/posts/application/usecases/create-post-for-blog.usecase';
import { UpdatePostForBlogCommand } from '../bloggers-platform/posts/application/usecases/update-post-for-blog.usecase';
import { DeletePostForBlogCommand } from '../bloggers-platform/posts/application/usecases/delete-post-for-blog.usecase';

//все эндпоинты суперадмина — под basic auth (admin:qwerty)
@Controller('sa')
@UseGuards(BasicAuthGuard)
@ApiBasicAuth('basicAuth')
export class SadminController {
  constructor(
    private queryBus: QueryBus,
    private commandBus: CommandBus,
  ) {}

  // ---------- users ----------

  @Get('users')
  async getAll(
    @Query() query: GetUsersQueryParams,
  ): Promise<PaginatedViewDto<UserViewDto[]>> {
    return this.queryBus.execute(new GetUsersQuery(query));
  }

  @ApiParam({ name: 'id' }) //для сваггера
  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(@Param('id') id: string): Promise<void> {
    return this.commandBus.execute(new DeleteUserCommand(id));
  }

  @Post('users')
  async createUser(@Body() body: CreateUserInputDto): Promise<UserViewDto> {
    //созданный админом юзер сразу считается подтверждённым
    const userId = await this.commandBus.execute<
      CreateConfirmedUserCommand,
      string
    >(new CreateConfirmedUserCommand(body));

    return this.queryBus.execute(new GetUserByIdQuery(userId));
  }

  // ---------- blogs ----------

  @Get('blogs')
  async getAllBlogs(
    @Query() query: GetBlogsQueryParams,
  ): Promise<PaginatedViewDto<BlogViewDto[]>> {
    return this.queryBus.execute(new GetBlogsQuery(query));
  }

  @Post('blogs')
  async createBlog(@Body() body: CreateBlogInputDto): Promise<BlogViewDto> {
    const blogId = await this.commandBus.execute<CreateBlogCommand, string>(
      new CreateBlogCommand(body),
    );
    return this.queryBus.execute(new GetBlogByIdQuery(blogId));
  }

  @ApiParam({ name: 'id' })
  @Put('blogs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateBlog(
    @Param('id') id: string,
    @Body() body: UpdateBlogInputDto,
  ): Promise<void> {
    return this.commandBus.execute(new UpdateBlogCommand(id, body));
  }

  @ApiParam({ name: 'id' })
  @Delete('blogs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteBlog(@Param('id') id: string): Promise<void> {
    return this.commandBus.execute(new DeleteBlogCommand(id));
  }

  // ---------- posts of a blog ----------

  @Get('blogs/:blogId/posts')
  async getBlogPosts(
    @Param('blogId') blogId: string,
    @Query() query: GetPostsQueryParams,
  ): Promise<PaginatedViewDto<PostViewDto[]>> {
    return this.queryBus.execute(new GetBlogPostsQuery(blogId, query));
  }

  @Post('blogs/:blogId/posts')
  async createBlogPost(
    @Param('blogId') blogId: string,
    @Body() body: CreatePostForBlogInputDto,
  ): Promise<PostViewDto> {
    const postId = await this.commandBus.execute<
      CreatePostForBlogCommand,
      string
    >(new CreatePostForBlogCommand(blogId, body));

    return this.queryBus.execute(new GetPostByIdQuery(postId));
  }

  @Put('blogs/:blogId/posts/:postId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateBlogPost(
    @Param('blogId') blogId: string,
    @Param('postId') postId: string,
    @Body() body: UpdatePostForBlogInputDto,
  ): Promise<void> {
    return this.commandBus.execute(
      new UpdatePostForBlogCommand(blogId, postId, body),
    );
  }

  @Delete('blogs/:blogId/posts/:postId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteBlogPost(
    @Param('blogId') blogId: string,
    @Param('postId') postId: string,
  ): Promise<void> {
    return this.commandBus.execute(
      new DeletePostForBlogCommand(blogId, postId),
    );
  }
}
