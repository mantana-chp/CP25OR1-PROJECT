import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

// init PrismaClient in a single place
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

let prisma: PrismaClient;

// for the extracting schema from DATABASE_URL if provided in the format: postgres://user:password@host:port/dbname?schema=schemaname
function getSchemaFromDatabaseUrl(databaseUrl: string): string | undefined {
  try {
    const parsedUrl = new URL(databaseUrl);
    return parsedUrl.searchParams.get('schema') ?? undefined;
  } catch {
    return undefined;
  }
}

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to initialize PrismaClient');
  }

  const schema = getSchemaFromDatabaseUrl(databaseUrl);
  const adapter = new PrismaPg(
    { connectionString: databaseUrl },
    { schema }
  );
  return new PrismaClient({ adapter });
}

if (process.env.NODE_ENV === 'production') { // create new instance in production
  prisma = createPrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = createPrismaClient();
  }
  prisma = global.prisma;
}

export default prisma;
