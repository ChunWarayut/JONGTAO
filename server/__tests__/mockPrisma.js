import { vi } from 'vitest';

const createMethods = () => ({
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    aggregate: vi.fn(),
    count: vi.fn()
});

export const mockPrisma = {
    owner: createMethods(),
    zone: createMethods(),
    booking: createMethods()
};

vi.mock('@prisma/client', () => {
    return {
        PrismaClient: function () {
            return mockPrisma;
        }
    };
});
