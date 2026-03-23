import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('DATABASE_URL:', process.env.DATABASE_URL)
  try {
    const booking = await prisma.booking.findFirst()
    console.log('Success! Found booking:', booking ? 'yes' : 'no')
    if (booking) {
        console.log('slipImageUrl:', booking.slipImageUrl)
    }
  } catch (e) {
    console.error('Error!', e)
  } finally {
    await prisma.$disconnect()
  }
}

main()
