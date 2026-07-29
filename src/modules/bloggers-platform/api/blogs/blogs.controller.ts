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
} from '@nestjs/common';
import { PaginatedViewDto } from '../../../../core/dto/base.paginated.view-dto';
import { GetBlogsQueryParams } from './input-dto/get-blogs-query-params.input-dto';
import { BlogViewDto } from './view-dto/blogs.view-dto';
import { BlogsQueryRepository } from '../../infrastructure/query/blogs/blogs.query-repository';
import { CreateBlogInputDto } from './input-dto/create-blog.input-dto';
import { BlogsService } from '../../blogs.service';
import { UpdateBlogInputDto } from './input-dto/update-blog.input-dto';
import { ApiParam } from '@nestjs/swagger';

@Controller('blogs')
export class BlogsController {
  constructor(
    private blogsQueryRepository: BlogsQueryRepository,
    private blogsService: BlogsService,
  ) {
    console.log('Blogs controller created');
  }

  @Get()
  async getAll(
    @Query() query: GetBlogsQueryParams,
  ): Promise<PaginatedViewDto<BlogViewDto[]>> {
    return this.blogsQueryRepository.getAll(query);
  }

  @ApiParam({ name: 'id' }) //для сваггера
  @Get(':id') //blogs/232342-sdfssdf-23234323
  async getById(@Param('id') id: string): Promise<BlogViewDto> {
    // можем и чаще так и делаем возвращать Promise из action. Сам NestJS будет дожидаться, когда
    // промис зарезолвится и затем NestJS вернёт результат клиенту
    return this.blogsQueryRepository.getByIdOrNotFoundFail(id);
  }

  @Post()
  async createBlog(@Body() body: CreateBlogInputDto): Promise<BlogViewDto> {
    const blogId = await this.blogsService.createBlog(body);

    return this.blogsQueryRepository.getByIdOrNotFoundFail(blogId);
  }

  @Put(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateBlog(
    @Param('id') id: string,
    @Body() body: UpdateBlogInputDto,
  ): Promise<void> {
    await this.blogsService.updateBlog(id, body);
  }

  @ApiParam({ name: 'id' }) //для сваггера
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteBlog(@Param('id') id: string): Promise<void> {
    return this.blogsService.deleteBlog(id);
  }
}
