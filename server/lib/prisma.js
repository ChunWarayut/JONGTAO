import { PrismaClient } from '@prisma/client'

// Singleton PrismaClient instance shared across the application.
// Extracted from index.js to break circular-dependency chains where
// controllers / services import prisma from index.js while index.js
// imports those same controllers via route modules.
const prisma = new PrismaClient()

export { prisma }
