import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Blog, BlogModelType } from './domain/blog.entity';
import { BlogsRepository } from './infrastructure/blogs.repository';
import { CreateBlogInputDto } from './api/blogs/input-dto/create-blog.input-dto';
import { UpdateBlogInputDto } from './api/blogs/input-dto/update-blog.input-dto';

@Injectable()
export class BlogsService {
  constructor(
    //инжектирование модели в сервис через DI
    @InjectModel(Blog.name)
    private BlogModel: BlogModelType,
    private blogsRepository: BlogsRepository,
  ) {}

  async createBlog(dto: CreateBlogInputDto): Promise<string> {
    const blog = this.BlogModel.createInstance({
      name: dto.name,
      description: dto.description,
      websiteUrl: dto.websiteUrl,
    });

    await this.blogsRepository.save(blog);

    return blog._id.toString();
  }

  async updateBlog(id: string, dto: UpdateBlogInputDto): Promise<string> {
    const blog = await this.blogsRepository.findOrNotFoundFail(id);

    // не присваиваем св-ва сущностям напрямую в сервисах — вызываем метод сущности
    blog.update(dto); // change detection

    await this.blogsRepository.save(blog);

    return blog._id.toString();
  }

  async deleteBlog(id: string): Promise<void> {
    const blog = await this.blogsRepository.findOrNotFoundFail(id);

    blog.makeDeleted();

    await this.blogsRepository.save(blog);
  }
}
