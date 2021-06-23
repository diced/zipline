import { PrismaClient } from '@prisma/client';

if (!global.prisma) global.prisma = new PrismaClient();

export default global.prisma;