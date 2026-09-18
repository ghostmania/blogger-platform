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
import { PaginatedViewDto } from '../../../../core/dto/base.paginated.view-dto';
import { BasicAuthGuard } from '../../../user-accounts/guards/basic/basic-auth.guard';
import { GetBlogByIdQuery } from '../application/queries/get-blog-by-id.query-handler';
import { GetBlogsQuery } from '../application/queries/get-blogs.query-handler';
import { CreateBlogCommand } from '../application/usecases/create-blog.usecase';
import { DeleteBlogCommand } from '../application/usecases/delete-blog.usecase';
import { UpdateBlogCommand } from '../application/usecases/update-blog.usecase';
import { CreateBlogInputDto } from './input-dto/create-blog.input-dto';
import { GetBlogsQueryParams } from './input-dto/get-blogs-query-params.input-dto';
import { UpdateBlogInputDto } from './input-dto/update-blog.input-dto';
import { BlogViewDto } from './view-dto/blogs.view-dto';

@Controller('blogs')
export class BlogsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  async getAll(
    @Query() query: GetBlogsQueryParams,
  ): Promise<PaginatedViewDto<BlogViewDto[]>> {
    return this.queryBus.execute(new GetBlogsQuery(query));
  }

  @ApiParam({ name: 'id' })
  @Get(':id')
  async getById(@Param('id') id: string): Promise<BlogViewDto> {
    return this.queryBus.execute(new GetBlogByIdQuery(id));
  }

  @ApiBasicAuth('basicAuth')
  @UseGuards(BasicAuthGuard)
  @Post()
  async createBlog(@Body() body: CreateBlogInputDto): Promise<BlogViewDto> {
    const blogId = await this.commandBus.execute<CreateBlogCommand, string>(
      new CreateBlogCommand(body),
    );

    return this.queryBus.execute(new GetBlogByIdQuery(blogId));
  }

  @ApiBasicAuth('basicAuth')
  @UseGuards(BasicAuthGuard)
  @Put(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateBlog(
    @Param('id') id: string,
    @Body() body: UpdateBlogInputDto,
  ): Promise<void> {
    return this.commandBus.execute(new UpdateBlogCommand(id, body));
  }

  @ApiBasicAuth('basicAuth')
  @UseGuards(BasicAuthGuard)
  @ApiParam({ name: 'id' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteBlog(@Param('id') id: string): Promise<void> {
    return this.commandBus.execute(new DeleteBlogCommand(id));
  }
}
