import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

// --- Realistic Thai customer data ---
const customers = [
  { name: 'สมชาย วงศ์สกุล', phone: '081-234-5678', lineId: 'somchai_w' },
  { name: 'ปิยะ จันทร์แก้ว', phone: '089-876-5432', lineId: 'piya.jan' },
  { name: 'นภา สุขสันต์', phone: '092-111-2233', lineId: 'napa_suk' },
  { name: 'ธนา พรหมมา', phone: '086-333-4455', lineId: null },
  { name: 'กัญญา ศรีสุข', phone: '095-222-3344', lineId: 'kanya_sri' },
  { name: 'วิชัย รักษ์ดี', phone: '083-444-5566', lineId: 'wichai.r' },
  { name: 'สุภาพร ใจดี', phone: '091-555-6677', lineId: null },
  { name: 'อนุชา เจริญสุข', phone: '088-666-7788', lineId: 'anucha_j' },
  { name: 'พิมพ์ผกา แสงทอง', phone: '084-777-8899', lineId: 'pimm_s' },
  { name: 'ศักดิ์สิทธิ์ มั่นคง', phone: '097-888-9900', lineId: 'saksit.m' },
  { name: 'ชนิดา โชคดี', phone: '062-999-0011', lineId: 'chanida_c' },
  { name: 'ภูมิพัฒน์ สมบูรณ์', phone: '093-123-4567', lineId: null },
  { name: 'แพรวา ธรรมรักษ์', phone: '085-234-5678', lineId: 'praewa_t' },
  { name: 'กิตติศักดิ์ พงษ์พิพัฒน์', phone: '096-345-6789', lineId: 'kitti_p' },
  { name: 'มณีรัตน์ ทองคำ', phone: '087-456-7890', lineId: 'manee_t' },
  { name: 'ณัฐพล วัฒนา', phone: '094-567-8901', lineId: 'natthaphon' },
  { name: 'ปาริชาต บุญมี', phone: '082-678-9012', lineId: null },
  { name: 'เอกชัย สุวรรณ', phone: '098-789-0123', lineId: 'ekchai_s' },
  { name: 'รัชนี ประเสริฐ', phone: '061-890-1234', lineId: 'ratchanee' },
  { name: 'ธีรพงษ์ อมรเทพ', phone: '090-901-2345', lineId: null },
]

const occasions = [
  'วันเกิด',
  'เลี้ยงรุ่น',
  'ฉลองเลื่อนตำแหน่ง',
  'งานเลี้ยงบริษัท',
  'นัดเจอเพื่อน',
  null,
  null,
  null,
]

const arrivalTimes = ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00']

const notes = [
  'ขอโต๊ะใกล้เวทีหน่อยครับ',
  'มีเค้กวันเกิดมาด้วย ขอจุดเทียนได้มั้ยคะ',
  'แพ้ถั่ว กรุณาแจ้งครัวด้วยค่ะ',
  'จะมาสายประมาณ 30 นาที',
  'ต้องการที่นั่งสำหรับเด็กเล็ก 1 ที่',
  null,
  null,
  null,
  null,
  null,
]

// Zone info: id -> { minSpend, extraTableCost, seatsPerTable, tableIds }
const zones = {
  1: { code: 'A', minSpend: 2000, extraTableCost: 500, seatsPerTable: 4, tableIds: [1,2,3,4,5,6,7,8] },
  2: { code: 'B', minSpend: 1500, extraTableCost: 400, seatsPerTable: 4, tableIds: [9,10,11,12,13,14,15,16,17,18] },
  3: { code: 'C', minSpend: 1000, extraTableCost: 300, seatsPerTable: 4, tableIds: [19,20,21,22,23,24] },
  4: { code: 'VIP', minSpend: 5000, extraTableCost: 1000, seatsPerTable: 6, tableIds: [25,26,27,28] },
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function genQR() {
  return crypto.randomUUID()
}

function dateStr(daysFromToday) {
  const d = new Date('2026-06-20T00:00:00.000Z')
  d.setDate(d.getDate() + daysFromToday)
  return d.toISOString()
}

function createdAtStr(bookingDateOffset, hoursBeforeBooking) {
  const d = new Date('2026-06-20T00:00:00.000Z')
  d.setDate(d.getDate() + bookingDateOffset)
  d.setHours(d.getHours() - hoursBeforeBooking)
  return d.toISOString()
}

// Build bookings
const bookings = []

// --- TODAY (June 20) bookings: mix of confirmed, pending, cancelled ---
const todayBookings = [
  { custIdx: 0,  zoneId: 1, tableId: 1,  guests: 4, status: 'confirmed', paymentStatus: 'paid',    paymentMethod: 'bank_transfer' },
  { custIdx: 1,  zoneId: 1, tableId: 3,  guests: 3, status: 'confirmed', paymentStatus: 'paid',    paymentMethod: 'promptpay' },
  { custIdx: 2,  zoneId: 2, tableId: 9,  guests: 4, status: 'confirmed', paymentStatus: 'paid',    paymentMethod: 'promptpay' },
  { custIdx: 3,  zoneId: 2, tableId: 11, guests: 2, status: 'pending',   paymentStatus: 'pending_verification', paymentMethod: 'bank_transfer' },
  { custIdx: 4,  zoneId: 4, tableId: 25, guests: 6, status: 'confirmed', paymentStatus: 'paid',    paymentMethod: 'bank_transfer' },
  { custIdx: 5,  zoneId: 3, tableId: 19, guests: 4, status: 'pending',   paymentStatus: 'unpaid',  paymentMethod: null },
  { custIdx: 6,  zoneId: 1, tableId: 5,  guests: 8, status: 'confirmed', paymentStatus: 'paid',    paymentMethod: 'promptpay', extraTable: true },
  { custIdx: 7,  zoneId: 2, tableId: 13, guests: 3, status: 'cancelled', paymentStatus: 'unpaid',  paymentMethod: null },
  { custIdx: 8,  zoneId: 3, tableId: 21, guests: 2, status: 'confirmed', paymentStatus: 'paid',    paymentMethod: 'promptpay' },
]

for (const b of todayBookings) {
  const cust = customers[b.custIdx]
  const zone = zones[b.zoneId]
  const extraTable = b.extraTable || false
  const totalAmount = zone.minSpend + (extraTable ? zone.extraTableCost : 0)
  const depositAmount = Math.round(totalAmount * 0.5)
  bookings.push({
    zoneId: b.zoneId,
    tableId: b.tableId,
    guestCount: b.guests,
    extraTable,
    totalAmount,
    depositAmount,
    customerName: cust.name,
    customerPhone: cust.phone,
    lineId: cust.lineId,
    arrivalTime: pick(arrivalTimes),
    occasion: pick(occasions),
    note: pick(notes),
    status: b.status,
    qrCode: genQR(),
    paymentMethod: b.paymentMethod,
    paymentStatus: b.paymentStatus,
    slipImageUrl: b.paymentStatus === 'paid' ? '/uploads/slip-placeholder.jpg' : null,
    bookingDate: dateStr(0),
    createdAt: createdAtStr(0, Math.floor(Math.random() * 48) + 6),
  })
}

// --- TOMORROW (June 21) bookings ---
const tomorrowBookings = [
  { custIdx: 9,  zoneId: 4, tableId: 26, guests: 5, status: 'confirmed', paymentStatus: 'paid',    paymentMethod: 'bank_transfer' },
  { custIdx: 10, zoneId: 1, tableId: 2,  guests: 4, status: 'pending',   paymentStatus: 'pending_verification', paymentMethod: 'promptpay' },
  { custIdx: 11, zoneId: 2, tableId: 10, guests: 3, status: 'pending',   paymentStatus: 'unpaid',  paymentMethod: null },
  { custIdx: 12, zoneId: 1, tableId: 4,  guests: 4, status: 'confirmed', paymentStatus: 'paid',    paymentMethod: 'promptpay' },
  { custIdx: 13, zoneId: 3, tableId: 20, guests: 2, status: 'pending',   paymentStatus: 'unpaid',  paymentMethod: null },
]

for (const b of tomorrowBookings) {
  const cust = customers[b.custIdx]
  const zone = zones[b.zoneId]
  const totalAmount = zone.minSpend
  const depositAmount = Math.round(totalAmount * 0.5)
  bookings.push({
    zoneId: b.zoneId,
    tableId: b.tableId,
    guestCount: b.guests,
    extraTable: false,
    totalAmount,
    depositAmount,
    customerName: cust.name,
    customerPhone: cust.phone,
    lineId: cust.lineId,
    arrivalTime: pick(arrivalTimes),
    occasion: pick(occasions),
    note: pick(notes),
    status: b.status,
    qrCode: genQR(),
    paymentMethod: b.paymentMethod,
    paymentStatus: b.paymentStatus,
    slipImageUrl: b.paymentStatus === 'paid' ? '/uploads/slip-placeholder.jpg' : null,
    bookingDate: dateStr(1),
    createdAt: createdAtStr(0, Math.floor(Math.random() * 12) + 1),
  })
}

// --- DAY AFTER TOMORROW (June 22) bookings ---
const dayAfterBookings = [
  { custIdx: 14, zoneId: 4, tableId: 27, guests: 6, status: 'confirmed', paymentStatus: 'paid', paymentMethod: 'bank_transfer' },
  { custIdx: 15, zoneId: 1, tableId: 6,  guests: 4, status: 'pending',   paymentStatus: 'unpaid', paymentMethod: null },
  { custIdx: 16, zoneId: 2, tableId: 14, guests: 4, status: 'pending',   paymentStatus: 'unpaid', paymentMethod: null },
]

for (const b of dayAfterBookings) {
  const cust = customers[b.custIdx]
  const zone = zones[b.zoneId]
  const totalAmount = zone.minSpend
  const depositAmount = Math.round(totalAmount * 0.5)
  bookings.push({
    zoneId: b.zoneId,
    tableId: b.tableId,
    guestCount: b.guests,
    extraTable: false,
    totalAmount,
    depositAmount,
    customerName: cust.name,
    customerPhone: cust.phone,
    lineId: cust.lineId,
    arrivalTime: pick(arrivalTimes),
    occasion: pick(occasions),
    note: pick(notes),
    status: b.status,
    qrCode: genQR(),
    paymentMethod: b.paymentMethod,
    paymentStatus: b.paymentStatus,
    slipImageUrl: b.paymentStatus === 'paid' ? '/uploads/slip-placeholder.jpg' : null,
    bookingDate: dateStr(2),
    createdAt: createdAtStr(0, Math.floor(Math.random() * 6) + 1),
  })
}

// --- NEXT WEEKEND (June 27, Saturday) bookings - busier night ---
const weekendBookings = [
  { custIdx: 17, zoneId: 4, tableId: 25, guests: 6, status: 'confirmed', paymentStatus: 'paid', paymentMethod: 'bank_transfer' },
  { custIdx: 18, zoneId: 4, tableId: 28, guests: 5, status: 'pending', paymentStatus: 'pending_verification', paymentMethod: 'promptpay' },
  { custIdx: 19, zoneId: 1, tableId: 7,  guests: 4, status: 'pending', paymentStatus: 'unpaid', paymentMethod: null },
  { custIdx: 0,  zoneId: 1, tableId: 8,  guests: 8, status: 'confirmed', paymentStatus: 'paid', paymentMethod: 'promptpay', extraTable: true },
  { custIdx: 2,  zoneId: 2, tableId: 15, guests: 4, status: 'pending', paymentStatus: 'unpaid', paymentMethod: null },
  { custIdx: 5,  zoneId: 3, tableId: 22, guests: 3, status: 'pending', paymentStatus: 'unpaid', paymentMethod: null },
]

for (const b of weekendBookings) {
  const cust = customers[b.custIdx]
  const zone = zones[b.zoneId]
  const extraTable = b.extraTable || false
  const totalAmount = zone.minSpend + (extraTable ? zone.extraTableCost : 0)
  const depositAmount = Math.round(totalAmount * 0.5)
  bookings.push({
    zoneId: b.zoneId,
    tableId: b.tableId,
    guestCount: b.guests,
    extraTable,
    totalAmount,
    depositAmount,
    customerName: cust.name,
    customerPhone: cust.phone,
    lineId: cust.lineId,
    arrivalTime: pick(arrivalTimes),
    occasion: pick(occasions),
    note: pick(notes),
    status: b.status,
    qrCode: genQR(),
    paymentMethod: b.paymentMethod,
    paymentStatus: b.paymentStatus,
    slipImageUrl: b.paymentStatus === 'paid' ? '/uploads/slip-placeholder.jpg' : null,
    bookingDate: dateStr(7),
    createdAt: createdAtStr(0, Math.floor(Math.random() * 4) + 1),
  })
}

// --- PAST bookings (yesterday, June 19) - all completed or cancelled ---
const pastBookings = [
  { custIdx: 3,  zoneId: 1, tableId: 1,  guests: 4, status: 'confirmed', paymentStatus: 'paid', paymentMethod: 'bank_transfer' },
  { custIdx: 7,  zoneId: 2, tableId: 12, guests: 3, status: 'confirmed', paymentStatus: 'paid', paymentMethod: 'promptpay' },
  { custIdx: 10, zoneId: 3, tableId: 23, guests: 2, status: 'cancelled', paymentStatus: 'unpaid', paymentMethod: null },
  { custIdx: 14, zoneId: 4, tableId: 26, guests: 6, status: 'confirmed', paymentStatus: 'paid', paymentMethod: 'bank_transfer' },
  { custIdx: 16, zoneId: 2, tableId: 16, guests: 4, status: 'confirmed', paymentStatus: 'paid', paymentMethod: 'promptpay' },
]

for (const b of pastBookings) {
  const cust = customers[b.custIdx]
  const zone = zones[b.zoneId]
  const totalAmount = zone.minSpend
  const depositAmount = Math.round(totalAmount * 0.5)
  bookings.push({
    zoneId: b.zoneId,
    tableId: b.tableId,
    guestCount: b.guests,
    extraTable: false,
    totalAmount,
    depositAmount,
    customerName: cust.name,
    customerPhone: cust.phone,
    lineId: cust.lineId,
    arrivalTime: pick(arrivalTimes),
    occasion: pick(occasions),
    note: pick(notes),
    status: b.status,
    qrCode: genQR(),
    paymentMethod: b.paymentMethod,
    paymentStatus: b.paymentStatus,
    slipImageUrl: b.paymentStatus === 'paid' ? '/uploads/slip-placeholder.jpg' : null,
    bookingDate: dateStr(-1),
    createdAt: createdAtStr(-1, Math.floor(Math.random() * 48) + 6),
  })
}

async function main() {
  console.log(`Inserting ${bookings.length} sample bookings...`)

  for (const booking of bookings) {
    await prisma.booking.create({ data: booking })
  }

  console.log(`Done! ${bookings.length} bookings created.`)

  // Summary
  const counts = await prisma.booking.groupBy({
    by: ['status'],
    _count: true,
  })
  console.log('\nBooking summary by status:')
  for (const c of counts) {
    console.log(`  ${c.status}: ${c._count}`)
  }

  const paymentCounts = await prisma.booking.groupBy({
    by: ['paymentStatus'],
    _count: true,
  })
  console.log('\nBooking summary by payment status:')
  for (const c of paymentCounts) {
    console.log(`  ${c.paymentStatus}: ${c._count}`)
  }
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
