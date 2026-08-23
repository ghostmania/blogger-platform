import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { initSettings } from './helpers/init-settings';
import { deleteAllData } from './helpers/delete-all-data';
import { UsersTestManager } from './helpers/users-test-manager';
import { CommentViewDto } from '../src/modules/bloggers-platform/comments/api/view-dto/comments.view-dto';
import { PostViewDto } from '../src/modules/bloggers-platform/posts/api/view-dto/posts.view-dto';
import { LikeStatus } from '../src/modules/bloggers-platform/enums/like-status.enum';

const NON_EXISTENT_ID = '507f1f77bcf86cd799439011';

//запись в блоги/посты доступна только суперадмину (basic auth)
const ADMIN = { user: 'admin', pass: 'qwerty' };

const blogInput = {
  name: 'host blog',
  description: 'blog for comments',
  websiteUrl: 'https://someurl.com',
};

const postInput = {
  title: 'new post',
  shortDescription: 'short',
  content: 'post content',
};

//минимальная длина контента комментария по спеке — 20 символов
const commentContent = 'a comment long enough to pass validation';

describe('Comments & likes API (e2e)', () => {
  let app: INestApplication;
  let userTestManger: UsersTestManager;
  let post: PostViewDto;
  let tokenA: string;
  let tokenB: string;

  const createPost = async (): Promise<PostViewDto> => {
    const blogRes = await request(app.getHttpServer())
      .post('/blogs')
      .auth(ADMIN.user, ADMIN.pass)
      .send(blogInput)
      .expect(HttpStatus.CREATED);

    const postRes = await request(app.getHttpServer())
      .post(`/blogs/${blogRes.body.id}/posts`)
      .auth(ADMIN.user, ADMIN.pass)
      .send(postInput)
      .expect(HttpStatus.CREATED);

    return postRes.body;
  };

  const createComment = async (
    postId: string,
    accessToken: string,
    content = commentContent,
  ): Promise<CommentViewDto> => {
    const res = await request(app.getHttpServer())
      .post(`/posts/${postId}/comments`)
      .auth(accessToken, { type: 'bearer' })
      .send({ content })
      .expect(HttpStatus.CREATED);

    return res.body;
  };

  const setCommentLike = (
    commentId: string,
    accessToken: string,
    likeStatus: LikeStatus,
    expectedStatus: number = HttpStatus.NO_CONTENT,
  ) =>
    request(app.getHttpServer())
      .put(`/comments/${commentId}/like-status`)
      .auth(accessToken, { type: 'bearer' })
      .send({ likeStatus })
      .expect(expectedStatus);

  //UsersTestManager нумерует логины от test0, поэтому для дополнительных
  //пользователей внутри теста нужен свой префикс — иначе конфликт по уникальному логину
  const createAndLoginUsers = async (
    count: number,
    loginPrefix: string,
  ): Promise<string[]> => {
    const tokens: string[] = [];

    for (let i = 0; i < count; i++) {
      const login = `${loginPrefix}${i}`;
      const password = '123456789';

      await userTestManger.createUser({
        login,
        email: `${login}@gmail.com`,
        password,
      });

      const { accessToken } = await userTestManger.login(login, password);
      tokens.push(accessToken);
    }

    return tokens;
  };

  const setPostLike = (
    postId: string,
    accessToken: string,
    likeStatus: LikeStatus,
    expectedStatus: number = HttpStatus.NO_CONTENT,
  ) =>
    request(app.getHttpServer())
      .put(`/posts/${postId}/like-status`)
      .auth(accessToken, { type: 'bearer' })
      .send({ likeStatus })
      .expect(expectedStatus);

  beforeAll(async () => {
    const result = await initSettings('nest-bloggers-platform-test-comments');
    app = result.app;
    userTestManger = result.userTestManger;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await deleteAllData(app);

    const [loginA, loginB] = await userTestManger.createAndLoginSeveralUsers(2);
    tokenA = loginA.accessToken;
    tokenB = loginB.accessToken;

    post = await createPost();
  });

  describe('POST -> /posts/:postId/comments', () => {
    it('should create comment; status 201; content: created comment', async () => {
      const comment = await createComment(post.id, tokenA);

      expect(comment).toEqual({
        id: expect.any(String),
        content: commentContent,
        commentatorInfo: {
          userId: expect.any(String),
          userLogin: expect.any(String),
        },
        createdAt: expect.any(String),
        likesInfo: {
          likesCount: 0,
          dislikesCount: 0,
          myStatus: LikeStatus.None,
        },
      });
    });

    it('should return 401 without access token', async () => {
      await request(app.getHttpServer())
        .post(`/posts/${post.id}/comments`)
        .send({ content: commentContent })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 400 for too short content', async () => {
      const { body } = await request(app.getHttpServer())
        .post(`/posts/${post.id}/comments`)
        .auth(tokenA, { type: 'bearer' })
        .send({ content: 'too short' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(body.errorsMessages).toEqual([
        { message: expect.any(String), field: 'content' },
      ]);
    });

    it('should return 404 if post not found', async () => {
      await request(app.getHttpServer())
        .post(`/posts/${NON_EXISTENT_ID}/comments`)
        .auth(tokenA, { type: 'bearer' })
        .send({ content: commentContent })
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('GET -> /posts/:postId/comments', () => {
    it('should return comments of the post with pagination', async () => {
      await createComment(post.id, tokenA);
      await createComment(post.id, tokenB);

      const res = await request(app.getHttpServer())
        .get(`/posts/${post.id}/comments`)
        .expect(HttpStatus.OK);

      expect(res.body).toEqual({
        pagesCount: 1,
        page: 1,
        pageSize: 10,
        totalCount: 2,
        items: expect.any(Array),
      });
      expect(res.body.items).toHaveLength(2);
    });

    it('should return 404 if post not found', async () => {
      await request(app.getHttpServer())
        .get(`/posts/${NON_EXISTENT_ID}/comments`)
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('PUT -> /comments/:commentId', () => {
    it('should update own comment; status 204', async () => {
      const comment = await createComment(post.id, tokenA);
      const updatedContent = 'updated content long enough to pass';

      await request(app.getHttpServer())
        .put(`/comments/${comment.id}`)
        .auth(tokenA, { type: 'bearer' })
        .send({ content: updatedContent })
        .expect(HttpStatus.NO_CONTENT);

      const res = await request(app.getHttpServer())
        .get(`/comments/${comment.id}`)
        .expect(HttpStatus.OK);

      expect(res.body.content).toBe(updatedContent);
    });

    it("should return 403 when updating another user's comment", async () => {
      const comment = await createComment(post.id, tokenA);

      await request(app.getHttpServer())
        .put(`/comments/${comment.id}`)
        .auth(tokenB, { type: 'bearer' })
        .send({ content: 'updated content long enough to pass' })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should return 401 without access token', async () => {
      const comment = await createComment(post.id, tokenA);

      await request(app.getHttpServer())
        .put(`/comments/${comment.id}`)
        .send({ content: 'updated content long enough to pass' })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 404 if comment not found', async () => {
      await request(app.getHttpServer())
        .put(`/comments/${NON_EXISTENT_ID}`)
        .auth(tokenA, { type: 'bearer' })
        .send({ content: 'updated content long enough to pass' })
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('DELETE -> /comments/:commentId', () => {
    it('should delete own comment; status 204', async () => {
      const comment = await createComment(post.id, tokenA);

      await request(app.getHttpServer())
        .delete(`/comments/${comment.id}`)
        .auth(tokenA, { type: 'bearer' })
        .expect(HttpStatus.NO_CONTENT);

      await request(app.getHttpServer())
        .get(`/comments/${comment.id}`)
        .expect(HttpStatus.NOT_FOUND);
    });

    it("should return 403 when deleting another user's comment", async () => {
      const comment = await createComment(post.id, tokenA);

      await request(app.getHttpServer())
        .delete(`/comments/${comment.id}`)
        .auth(tokenB, { type: 'bearer' })
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe('PUT -> /comments/:commentId/like-status', () => {
    it('should count likes and dislikes of different users', async () => {
      const comment = await createComment(post.id, tokenA);

      await setCommentLike(comment.id, tokenA, LikeStatus.Like);
      await setCommentLike(comment.id, tokenB, LikeStatus.Dislike);

      const res = await request(app.getHttpServer())
        .get(`/comments/${comment.id}`)
        .auth(tokenA, { type: 'bearer' })
        .expect(HttpStatus.OK);

      expect(res.body.likesInfo).toEqual({
        likesCount: 1,
        dislikesCount: 1,
        myStatus: LikeStatus.Like,
      });
    });

    it('should not double-count repeated like from the same user', async () => {
      const comment = await createComment(post.id, tokenA);

      await setCommentLike(comment.id, tokenA, LikeStatus.Like);
      await setCommentLike(comment.id, tokenA, LikeStatus.Like);

      const res = await request(app.getHttpServer())
        .get(`/comments/${comment.id}`)
        .expect(HttpStatus.OK);

      expect(res.body.likesInfo.likesCount).toBe(1);
    });

    it('should move the count when a user switches Like -> Dislike -> None', async () => {
      const comment = await createComment(post.id, tokenA);

      await setCommentLike(comment.id, tokenA, LikeStatus.Like);
      await setCommentLike(comment.id, tokenA, LikeStatus.Dislike);

      let res = await request(app.getHttpServer())
        .get(`/comments/${comment.id}`)
        .expect(HttpStatus.OK);
      expect(res.body.likesInfo).toMatchObject({
        likesCount: 0,
        dislikesCount: 1,
      });

      await setCommentLike(comment.id, tokenA, LikeStatus.None);

      res = await request(app.getHttpServer())
        .get(`/comments/${comment.id}`)
        .expect(HttpStatus.OK);
      expect(res.body.likesInfo).toMatchObject({
        likesCount: 0,
        dislikesCount: 0,
      });
    });

    it('should return myStatus None for anonymous reader', async () => {
      const comment = await createComment(post.id, tokenA);
      await setCommentLike(comment.id, tokenA, LikeStatus.Like);

      const res = await request(app.getHttpServer())
        .get(`/comments/${comment.id}`)
        .expect(HttpStatus.OK);

      expect(res.body.likesInfo.myStatus).toBe(LikeStatus.None);
    });

    it('should return 400 for an unknown like status', async () => {
      const comment = await createComment(post.id, tokenA);

      const { body } = await request(app.getHttpServer())
        .put(`/comments/${comment.id}/like-status`)
        .auth(tokenA, { type: 'bearer' })
        .send({ likeStatus: 'Whatever' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(body.errorsMessages).toEqual([
        { message: expect.any(String), field: 'likeStatus' },
      ]);
    });

    it('should return 401 without access token', async () => {
      const comment = await createComment(post.id, tokenA);

      await request(app.getHttpServer())
        .put(`/comments/${comment.id}/like-status`)
        .send({ likeStatus: LikeStatus.Like })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 404 if comment not found', async () => {
      await setCommentLike(
        NON_EXISTENT_ID,
        tokenA,
        LikeStatus.Like,
        HttpStatus.NOT_FOUND,
      );
    });
  });

  describe('PUT -> /posts/:postId/like-status', () => {
    it('should count likes and expose newest likes, newest first', async () => {
      await setPostLike(post.id, tokenA, LikeStatus.Like);
      await setPostLike(post.id, tokenB, LikeStatus.Like);

      const res = await request(app.getHttpServer())
        .get(`/posts/${post.id}`)
        .auth(tokenB, { type: 'bearer' })
        .expect(HttpStatus.OK);

      expect(res.body.extendedLikesInfo).toMatchObject({
        likesCount: 2,
        dislikesCount: 0,
        myStatus: LikeStatus.Like,
      });
      expect(res.body.extendedLikesInfo.newestLikes).toHaveLength(2);

      const [newest, previous] = res.body.extendedLikesInfo.newestLikes;
      expect(newest).toEqual({
        addedAt: expect.any(String),
        userId: expect.any(String),
        login: expect.any(String),
      });
      expect(new Date(newest.addedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(previous.addedAt).getTime(),
      );
    });

    it('should expose only the 3 newest likes', async () => {
      const tokens = await createAndLoginUsers(4, 'liker');

      for (const accessToken of tokens) {
        await setPostLike(post.id, accessToken, LikeStatus.Like);
      }

      const res = await request(app.getHttpServer())
        .get(`/posts/${post.id}`)
        .expect(HttpStatus.OK);

      expect(res.body.extendedLikesInfo.likesCount).toBe(4);
      expect(res.body.extendedLikesInfo.newestLikes).toHaveLength(3);
    });

    it('should reflect myStatus in the posts list', async () => {
      await setPostLike(post.id, tokenA, LikeStatus.Dislike);

      const res = await request(app.getHttpServer())
        .get('/posts')
        .auth(tokenA, { type: 'bearer' })
        .expect(HttpStatus.OK);

      expect(res.body.items[0].extendedLikesInfo).toMatchObject({
        likesCount: 0,
        dislikesCount: 1,
        myStatus: LikeStatus.Dislike,
      });
    });

    it('should return 401 without access token', async () => {
      await request(app.getHttpServer())
        .put(`/posts/${post.id}/like-status`)
        .send({ likeStatus: LikeStatus.Like })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 404 if post not found', async () => {
      await setPostLike(
        NON_EXISTENT_ID,
        tokenA,
        LikeStatus.Like,
        HttpStatus.NOT_FOUND,
      );
    });
  });

  describe('GET -> /comments/:id', () => {
    it('should return 404 if comment not found', async () => {
      await request(app.getHttpServer())
        .get(`/comments/${NON_EXISTENT_ID}`)
        .expect(HttpStatus.NOT_FOUND);
    });
  });
});
