import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Get all special dates
export const getAllSpecialDates = async (req, res) => {
  try {
    const specialDates = await prisma.specialDate.findMany({
      orderBy: { date: 'asc' }
    })
    res.json(specialDates)
  } catch (error) {
    console.error('Get special dates error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Get special date by date
export const getSpecialDateByDate = async (req, res) => {
  try {
    const { date } = req.query
    if (!date) {
      return res.json(null)
    }

    // Parse date as YYYY-MM-DD
    const [yr, mo, da] = date.split('-')
    const startOfDayBKKText = `${yr}-${mo}-${da}T00:00:00+07:00`
    const targetDate = new Date(startOfDayBKKText)

    const specialDate = await prisma.specialDate.findFirst({
      where: {
        date: targetDate,
        isActive: true
      }
    })

    res.json(specialDate)
  } catch (error) {
    console.error('Get special date error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Create special date
export const createSpecialDate = async (req, res) => {
  try {
    const {
      date,
      name,
      description,
      priceType,
      depositRequired,
      depositAmount
    } = req.body

    // Parse date as YYYY-MM-DD
    const [yr, mo, da] = date.split('-')
    const startOfDayBKKText = `${yr}-${mo}-${da}T00:00:00+07:00`
    const targetDate = new Date(startOfDayBKKText)

    const specialDate = await prisma.specialDate.create({
      data: {
        date: targetDate,
        name,
        description,
        priceType: priceType || 'normal',
        depositRequired: depositRequired !== false,
        depositAmount: depositAmount ? parseFloat(depositAmount) : null,
        isActive: true
      }
    })

    res.status(201).json(specialDate)
  } catch (error) {
    console.error('Create special date error:', error)
    res.status(400).json({ error: 'Could not create special date', details: error.message })
  }
}

// Update special date
export const updateSpecialDate = async (req, res) => {
  try {
    const { id } = req.params
    const {
      name,
      description,
      priceType,
      depositRequired,
      depositAmount,
      isActive
    } = req.body

    const updateData = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (priceType !== undefined) updateData.priceType = priceType
    if (depositRequired !== undefined) updateData.depositRequired = depositRequired
    if (depositAmount !== undefined) updateData.depositAmount = depositAmount ? parseFloat(depositAmount) : null
    if (isActive !== undefined) updateData.isActive = isActive

    const specialDate = await prisma.specialDate.update({
      where: { id: parseInt(id) },
      data: updateData
    })

    res.json(specialDate)
  } catch (error) {
    console.error('Update special date error:', error)
    res.status(400).json({ error: 'Could not update special date' })
  }
}

// Delete special date
export const deleteSpecialDate = async (req, res) => {
  try {
    const { id } = req.params

    await prisma.specialDate.delete({
      where: { id: parseInt(id) }
    })

    res.json({ message: 'Special date deleted successfully' })
  } catch (error) {
    console.error('Delete special date error:', error)
    res.status(400).json({ error: 'Could not delete special date' })
  }
}
