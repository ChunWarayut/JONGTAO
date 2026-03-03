import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const login = async (req, res) => {
    const { username, password } = req.body

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' })
    }

    try {
        const owner = await prisma.owner.findUnique({
            where: { username }
        })

        if (!owner) {
            return res.status(401).json({ error: 'Invalid credentials' })
        }

        const isPasswordValid = await bcrypt.compare(password, owner.password)

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' })
        }

        const token = jwt.sign(
            { id: owner.id, username: owner.username },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        )

        res.json({
            token,
            user: {
                id: owner.id,
                username: owner.username,
                name: owner.name
            }
        })
    } catch (error) {
        console.error('Login error:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
}

export const checkAuth = async (req, res) => {
    res.json({ user: req.user })
}
