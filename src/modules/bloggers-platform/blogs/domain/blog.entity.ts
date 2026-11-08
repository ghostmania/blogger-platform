import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CreateBlogDomainDto } from './dto/create-blog.domain.dto';
import { UpdateBlogDomainDto } from './dto/update-blog.domain.dto';

//Entity поверх существующей таблицы blogs: колонки и типы совпадают с init.sql,
//synchronize выключен, поэтому структуру таблицы TypeORM не трогает
@Entity('blogs')
export class Blog {
  //bigint приходит из pg строкой — во view-моделях id тоже строка
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;
  @Column({ type: 'varchar', length: 15 })
  name: string;
  @Column({ type: 'varchar', length: 500 })
  description: string;
  @Column({ name: 'website_url', type: 'varchar', length: 100 })
  websiteUrl: string;
  @Column({ name: 'is_membership', type: 'boolean', default: false })
  isMembership: boolean;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  static createInstance(dto: CreateBlogDomainDto): Blog {
    const blog = new this();

    blog.name = dto.name;
    blog.description = dto.description;
    blog.websiteUrl = dto.websiteUrl;
    blog.isMembership = false;

    return blog;
  }

  //DDD: состояние меняем методами сущности, а не присваиванием полей снаружи
  update(dto: UpdateBlogDomainDto): void {
    this.name = dto.name;
    this.description = dto.description;
    this.websiteUrl = dto.websiteUrl;
  }
}
