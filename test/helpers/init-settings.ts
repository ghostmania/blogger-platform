import 'dotenv/config';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { Pool } from 'pg';
import { appSetup } from '../../src/setup/app.setup';
import { UsersTestManager } from './users-test-manager';
import { deleteAllData } from './delete-all-data';
import { EmailService } from '../../src/modules/notifications/email.service';
import { EmailServiceMock } from '../mock/email-service.mock';
import { applySchema } from '../../src/core/database/apply-schema';

// Each suite owns a schema in an explicitly selected test database.
export const initSettings = async (
  testDbName: string,
  addSettingsToModuleBuilder?: (builder: TestingModuleBuilder) => void,
  enableRateLimit = false,
) => {
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl)
    throw new Error(
      'TEST_DATABASE_URL is required; application DATABASE_URL is never used for tests',
    );
  const schema = `test_${testDbName.replace(/[^a-z0-9]/gi, '_').slice(-25)}_${process.pid}_${Date.now()}`;
  const ssl =
    process.env.TEST_DATABASE_SSL === 'true'
      ? { rejectUnauthorized: false }
      : false;
  const admin = new Pool({ connectionString: testUrl, ssl });
  try {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    const url = new URL(testUrl);
    url.searchParams.set('options', `-c search_path=${schema}`);
    process.env.DATABASE_URL = url.toString();
    process.env.DATABASE_SSL = ssl ? 'true' : 'false';
    process.env.IP_RESTRICTION_ENABLED = String(enableRateLimit);
    const schemaPool = new Pool({ connectionString: url.toString(), ssl });
    try {
      await applySchema(schemaPool);
    } finally {
      await schemaPool.end();
    }

    const { AppModule } = await import('../../src/app.module');
    const builder = Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(EmailService)
      .useClass(EmailServiceMock);
    if (addSettingsToModuleBuilder) addSettingsToModuleBuilder(builder);
    const module = await builder.compile();
    const app = module.createNestApplication();
    appSetup(app);
    await app.init();
    const originalClose = app.close.bind(app);
    app.close = async () => {
      try {
        await originalClose();
      } finally {
        try {
          await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
        } finally {
          await admin.end();
        }
      }
    };
    await deleteAllData(app);
    return {
      app,
      httpServer: app.getHttpServer(),
      userTestManger: new UsersTestManager(app),
      emailServiceMock: app.get<EmailServiceMock>(EmailService),
    };
  } catch (error) {
    await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.end();
    throw error;
  }
};
