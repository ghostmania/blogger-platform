// import {
//   Body,
//   Controller,
//   Delete,
//   Get,
//   HttpCode,
//   HttpStatus,
//   Param,
//   Post,
//   Put,
//   Query,
//   UseGuards,
// } from '@nestjs/common';
// import { CommandBus, QueryBus } from '@nestjs/cqrs';
// import { ApiBasicAuth, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
// import { PaginatedViewDto } from '../../../../core/dto/base.paginated.view-dto';
// import { GetBlogsQueryParams } from './input-dto/get-blogs-query-params.input-dto';
// import { CreateBlogInputDto } from './input-dto/create-blog.input-dto';
// import { UpdateBlogInputDto } from './input-dto/update-blog.input-dto';
// import { BlogViewDto } from './view-dto/blogs.view-dto';
// import { CreateBlogCommand } from '../application/usecases/create-blog.usecase';
// import { UpdateBlogCommand } from '../application/usecases/update-blog.usecase';
// import { DeleteBlogCommand } from '../application/usecases/delete-blog.usecase';
// import { GetBlogsQuery } from '../application/queries/get-blogs.query-handler';
// import { GetBlogByIdQuery } from '../application/queries/get-blog-by-id.query-handler';
// import { GetBlogPostsQuery } from '../application/queries/get-blog-posts.query-handler';
// import { GetPostsQueryParams } from '../../posts/api/input-dto/get-posts-query-params.input-dto';
// import { CreatePostForBlogInputDto } from '../../posts/api/input-dto/create-post-for-blog.input-dto';
// import { PostViewDto } from '../../posts/api/view-dto/posts.view-dto';
// import { CreatePostForBlogCommand } from '../../posts/application/usecases/create-post-for-blog.usecase';
// import { GetPostByIdQuery } from '../../posts/application/queries/get-post-by-id.query-handler';
// import { BasicAuthGuard } from '../../../user-accounts/guards/basic/basic-auth.guard';
// import { JwtOptionalAuthGuard } from '../../../user-accounts/guards/bearer/jwt-optional-auth.guard';
// import { ExtractUserIfExistsFromRequest } from '../../../user-accounts/guards/decorators/param/extract-user-if-exists-from-request.decorator';
// import { UserContextDto } from '../../../user-accounts/guards/dto/user-context.dto';
//
// @Controller('blogs')
// export class BlogsController {
//   constructor(
//     private commandBus: CommandBus,
//     private queryBus: QueryBus,
//   ) {}
//
//   @Get()
//   async getAll(
//     @Query() query: GetBlogsQueryParams,
//   ): Promise<PaginatedViewDto<BlogViewDto[]>> {
//     return this.queryBus.execute(new GetBlogsQuery(query));
//   }
//
//   //список постов блога публичный, но токен (если он есть) нужен для myStatus
//   @ApiBearerAuth()
//   @UseGuards(JwtOptionalAuthGuard)
//   @Get(':blogId/posts')
//   async getBlogPosts(
//     @Param('blogId') blogId: string,
//     @Query() query: GetPostsQueryParams,
//     @ExtractUserIfExistsFromRequest() user: UserContextDto | null,
//   ): Promise<PaginatedViewDto<PostViewDto[]>> {
//     return this.queryBus.execute(
//       new GetBlogPostsQuery(blogId, query, user?.id ?? null),
//     );
//   }
//
//   @ApiBasicAuth('basicAuth')
//   @UseGuards(BasicAuthGuard)
//   @Post(':blogId/posts')
//   async createBlogPost(
//     @Param('blogId') blogId: string,
//     @Body() body: CreatePostForBlogInputDto,
//   ): Promise<PostViewDto> {
//     const postId = await this.commandBus.execute<
//       CreatePostForBlogCommand,
//       string
//     >(new CreatePostForBlogCommand(blogId, body));
//
//     return this.queryBus.execute(new GetPostByIdQuery(postId, null));
//   }
//
//   @ApiParam({ name: 'id' }) //для сваггера
//   @Get(':id') //blogs/232342-sdfssdf-23234323
//   async getById(@Param('id') id: string): Promise<BlogViewDto> {
//     // можем и чаще так и делаем возвращать Promise из action. Сам NestJS будет дожидаться, когда
//     // промис зарезолвится и затем NestJS вернёт результат клиенту
//     return this.queryBus.execute(new GetBlogByIdQuery(id));
//   }
//
//   @ApiBasicAuth('basicAuth')
//   @UseGuards(BasicAuthGuard)
//   @Post()
//   async createBlog(@Body() body: CreateBlogInputDto): Promise<BlogViewDto> {
//     const blogId = await this.commandBus.execute<CreateBlogCommand, string>(
//       new CreateBlogCommand(body),
//     );
//
//     return this.queryBus.execute(new GetBlogByIdQuery(blogId));
//   }
//
//   @ApiBasicAuth('basicAuth')
//   @UseGuards(BasicAuthGuard)
//   @Put(':id')
//   @HttpCode(HttpStatus.NO_CONTENT)
//   async updateBlog(
//     @Param('id') id: string,
//     @Body() body: UpdateBlogInputDto,
//   ): Promise<void> {
//     return this.commandBus.execute(new UpdateBlogCommand(id, body));
//   }
//
//   @ApiBasicAuth('basicAuth')
//   @UseGuards(BasicAuthGuard)
//   @ApiParam({ name: 'id' }) //для сваггера
//   @Delete(':id')
//   @HttpCode(HttpStatus.NO_CONTENT)
//   async deleteBlog(@Param('id') id: string): Promise<void> {
//     return this.commandBus.execute(new DeleteBlogCommand(id));
//   }
// }
