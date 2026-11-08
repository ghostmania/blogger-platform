//blogId и blogName при обновлении не меняются: пост остаётся в своём блоге
export class UpdatePostDomainDto {
  title: string;
  shortDescription: string;
  content: string;
}
