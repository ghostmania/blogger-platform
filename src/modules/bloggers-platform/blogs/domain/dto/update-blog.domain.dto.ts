import { CreateBlogDomainDto } from './create-blog.domain.dto';

//при обновлении меняются те же поля, что задаются при создании
export class UpdateBlogDomainDto extends CreateBlogDomainDto {}
