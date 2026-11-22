import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { initSettings } from './helpers/init-settings';
import { deleteAllData } from './helpers/delete-all-data';
import { Question } from '../src/modules/bloggers-platform/questions/domain/question.entity';

//Валидный по формату, но заведомо несуществующий id — должен давать 404, а не 500
const MISSING_ID = '9223372036854775807';
const INVALID_IDS = ['invalid', '9223372036854775808'];

const questionInput = {
  body: 'How much is two plus four?',
  correctAnswers: ['6', 'six', 'шесть'],
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe('Super admin quiz questions (/sa/quiz/questions)', () => {
  let app: INestApplication;
  const server = () => app.getHttpServer();
  const admin = (req: request.Test) => req.auth('admin', 'qwerty');

  const createQuestion = async (input: Partial<typeof questionInput> = {}) =>
    (
      await admin(request(server()).post('/sa/quiz/questions'))
        .send({ ...questionInput, ...input })
        .expect(201)
    ).body;
  const getAll = async (query: Record<string, string | number> = {}) =>
    (
      await admin(request(server()).get('/sa/quiz/questions'))
        .query(query)
        .expect(200)
    ).body;

  beforeAll(async () => {
    ({ app } = await initSettings('quiz-questions'));
  });
  afterAll(async () => {
    await app?.close();
  });
  beforeEach(async () => {
    await deleteAllData(app);
  });

  it('maps Question onto quiz_questions with synchronize off', () => {
    const dataSource = app.get(DataSource);
    expect(dataSource.options.synchronize).toBe(false);
    expect(dataSource.getMetadata(Question).tableName).toBe('quiz_questions');
  });

  it('requires basic auth on every endpoint', async () => {
    const http = request(server());
    await http.get('/sa/quiz/questions').expect(401);
    await http.post('/sa/quiz/questions').send(questionInput).expect(401);
    await http.put('/sa/quiz/questions/1').send(questionInput).expect(401);
    await http
      .put('/sa/quiz/questions/1/publish')
      .send({ published: true })
      .expect(401);
    await http.delete('/sa/quiz/questions/1').expect(401);
    await http.get('/sa/quiz/questions').auth('admin', 'wrong').expect(401);
  });

  it('creates a question: unpublished, updatedAt null, extra fields dropped', async () => {
    const created = await createQuestion({
      published: true,
      id: '777',
    } as Partial<typeof questionInput>);

    expect(created).toEqual({
      id: expect.any(String),
      body: questionInput.body,
      correctAnswers: questionInput.correctAnswers,
      published: false,
      createdAt: expect.stringMatching(ISO_DATE),
      updatedAt: null,
    });
    expect(created.id).not.toBe('777');
  });

  it('validates the input model in errorsMessages format', async () => {
    const cases: [Record<string, unknown>, string][] = [
      [{ ...questionInput, body: 'short' }, 'body'],
      [{ ...questionInput, body: '   too short     ' }, 'body'],
      [{ ...questionInput, body: 'x'.repeat(501) }, 'body'],
      [{ correctAnswers: questionInput.correctAnswers }, 'body'],
      [{ ...questionInput, correctAnswers: 'six' }, 'correctAnswers'],
      [{ ...questionInput, correctAnswers: [] }, 'correctAnswers'],
      [{ ...questionInput, correctAnswers: [6] }, 'correctAnswers'],
      [{ body: questionInput.body }, 'correctAnswers'],
    ];

    for (const [body, field] of cases) {
      const res = await admin(request(server()).post('/sa/quiz/questions'))
        .send(body)
        .expect(400);
      expect(res.body).toEqual({
        errorsMessages: [{ field, message: expect.any(String) }],
      });
    }

    const { id } = await createQuestion();
    const res = await admin(request(server()).put(`/sa/quiz/questions/${id}`))
      .send({ body: 'short', correctAnswers: 'x' })
      .expect(400);
    expect(
      res.body.errorsMessages.map((e: { field: string }) => e.field),
    ).toEqual(['body', 'correctAnswers']);

    for (const published of ['true', 1, null, undefined]) {
      const publishRes = await admin(
        request(server()).put(`/sa/quiz/questions/${id}/publish`),
      )
        .send({ published })
        .expect(400);
      expect(publishRes.body).toEqual({
        errorsMessages: [{ field: 'published', message: expect.any(String) }],
      });
    }
  });

  it('updates a question and sets updatedAt', async () => {
    const { id, createdAt } = await createQuestion();
    const update = { body: 'Capital of France?', correctAnswers: ['Paris'] };

    await admin(request(server()).put(`/sa/quiz/questions/${id}`))
      .send(update)
      .expect(204);

    const { items } = await getAll();
    expect(items).toEqual([
      {
        id,
        ...update,
        published: false,
        createdAt,
        updatedAt: expect.stringMatching(ISO_DATE),
      },
    ]);
  });

  it('publishes and unpublishes a question', async () => {
    const { id } = await createQuestion();

    await admin(request(server()).put(`/sa/quiz/questions/${id}/publish`))
      .send({ published: true })
      .expect(204);
    let [question] = (await getAll()).items;
    expect(question.published).toBe(true);
    expect(question.updatedAt).toMatch(ISO_DATE);

    await admin(request(server()).put(`/sa/quiz/questions/${id}/publish`))
      .send({ published: false })
      .expect(204);
    [question] = (await getAll()).items;
    expect(question.published).toBe(false);
  });

  it('deletes a question; second delete is 404', async () => {
    const { id } = await createQuestion();

    await admin(request(server()).delete(`/sa/quiz/questions/${id}`)).expect(
      204,
    );
    expect((await getAll()).totalCount).toBe(0);
    await admin(request(server()).delete(`/sa/quiz/questions/${id}`)).expect(
      404,
    );
  });

  it('returns 404 for missing and malformed ids', async () => {
    for (const id of [MISSING_ID, ...INVALID_IDS]) {
      await admin(request(server()).delete(`/sa/quiz/questions/${id}`)).expect(
        404,
      );
      await admin(request(server()).put(`/sa/quiz/questions/${id}`))
        .send(questionInput)
        .expect(404);
      await admin(request(server()).put(`/sa/quiz/questions/${id}/publish`))
        .send({ published: true })
        .expect(404);
    }
  });

  it('paginates with defaults, newest first', async () => {
    const first = await createQuestion({ body: 'question number one' });
    const second = await createQuestion({ body: 'question number two' });

    expect(await getAll()).toEqual({
      pagesCount: 1,
      page: 1,
      pageSize: 10,
      totalCount: 2,
      items: [second, first],
    });

    const page = await getAll({ pageSize: 1, pageNumber: 2 });
    expect(page).toMatchObject({
      pagesCount: 2,
      page: 2,
      pageSize: 1,
      totalCount: 2,
    });
    expect(page.items).toEqual([first]);
  });

  it('filters by bodySearchTerm and publishedStatus, sorts by body', async () => {
    const apple = await createQuestion({ body: 'Apple: what colour?' });
    const banana = await createQuestion({ body: 'banana: what colour?' });
    const cherry = await createQuestion({ body: 'Cherry: what taste?' });
    await admin(
      request(server()).put(`/sa/quiz/questions/${banana.id}/publish`),
    )
      .send({ published: true })
      .expect(204);

    const search = await getAll({ bodySearchTerm: 'COLOUR' });
    expect(search.totalCount).toBe(2);
    expect(search.items.map((q: { id: string }) => q.id).sort()).toEqual(
      [apple.id, banana.id].sort(),
    );

    const published = await getAll({ publishedStatus: 'published' });
    expect(published.items.map((q: { id: string }) => q.id)).toEqual([
      banana.id,
    ]);

    const notPublished = await getAll({
      publishedStatus: 'notPublished',
      sortBy: 'body',
      sortDirection: 'asc',
    });
    expect(notPublished.items.map((q: { id: string }) => q.id)).toEqual([
      apple.id,
      cherry.id,
    ]);

    const combined = await getAll({
      bodySearchTerm: 'colour',
      publishedStatus: 'notPublished',
    });
    expect(combined.items.map((q: { id: string }) => q.id)).toEqual([apple.id]);

    //побайтовый порядок: заглавные раньше строчных
    const byBody = await getAll({ sortBy: 'body', sortDirection: 'asc' });
    expect(byBody.items.map((q: { id: string }) => q.id)).toEqual([
      apple.id,
      cherry.id,
      banana.id,
    ]);

    await admin(request(server()).get('/sa/quiz/questions'))
      .query({ publishedStatus: 'maybe' })
      .expect(400);
    await admin(request(server()).get('/sa/quiz/questions'))
      .query({ sortBy: 'drop table' })
      .expect(400);
  });

  it('testing/all-data clears questions', async () => {
    await createQuestion();
    await request(server()).delete('/testing/all-data').expect(204);
    expect((await getAll()).totalCount).toBe(0);
  });
});
