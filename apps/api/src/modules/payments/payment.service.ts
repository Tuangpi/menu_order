import { badRequest, notFound } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';

function normalizeMethod(raw: unknown): 'CASH' | 'MANUAL_WALLET' {
  const v = String(raw ?? 'CASH').toUpperCase();
  if (v === 'CASH') return 'CASH';
  return 'MANUAL_WALLET';
}

export interface RecordPaymentInput {
  method?: unknown;
  paymentMethod?: unknown;
  type?: unknown;
  amount?: unknown;
  reference?: unknown;
  provider?: unknown;
  walletProvider?: unknown;
  confirm?: unknown;
  confirmed?: unknown;
}

export async function recordPayment(
  restaurantId: string,
  orderId: string,
  staffUserId: string,
  input: RecordPaymentInput,
) {
  const order = await prisma.order.findFirst({ where: { id: orderId, restaurantId } });
  if (!order) throw notFound('Order not found');

  const method = normalizeMethod(input.method ?? input.paymentMethod ?? input.type);
  const provider =
    typeof input.provider === 'string' ? input.provider :
    typeof input.walletProvider === 'string' ? input.walletProvider : null;
  const referenceParts = [] as string[];
  if (provider) referenceParts.push(provider);
  if (typeof input.reference === 'string' && input.reference.trim()) referenceParts.push(input.reference.trim());
  const reference = referenceParts.length ? referenceParts.join(' | ') : null;

  const amount =
    typeof input.amount === 'number' && Number.isFinite(input.amount) ? Math.round(input.amount) :
    typeof input.amount === 'string' && input.amount.trim() ? Math.round(Number(input.amount)) :
    order.totalAmount;
  if (!Number.isInteger(amount) || amount <= 0) throw badRequest('VALIDATION_ERROR', 'amount must be a positive integer');

  const confirm = input.confirm === true || input.confirmed === true || method === 'CASH';

  const event = await prisma.paymentEvent.create({
    data: {
      restaurantId,
      orderId,
      method,
      status: confirm ? 'CONFIRMED' : 'RECORDED',
      amount,
      confirmedById: confirm ? staffUserId : null,
      reference,
    },
  });

  await prisma.order.update({
    where: { id: orderId },
    data: { paymentStatus: confirm ? 'PAID' : 'PENDING_CONFIRMATION' },
  });

  return event;
}

export async function confirmPayment(
  restaurantId: string,
  paymentId: string,
  staffUserId: string,
) {
  const event = await prisma.paymentEvent.findFirst({ where: { id: paymentId, restaurantId } });
  if (!event) throw notFound('Payment not found');
  if (event.status === 'CONFIRMED') {
    if (event.confirmedById && event.confirmedById !== staffUserId) {
      // keep original confirmer; do not overwrite
    }
    return event;
  }
  const updated = await prisma.paymentEvent.update({
    where: { id: paymentId },
    data: { status: 'CONFIRMED', confirmedById: staffUserId },
  });
  await prisma.order.update({
    where: { id: event.orderId },
    data: { paymentStatus: 'PAID' },
  });
  return updated;
}

export async function listPayments(restaurantId: string, orderId?: string) {
  return prisma.paymentEvent.findMany({
    where: { restaurantId, ...(orderId ? { orderId } : {}) },
    orderBy: { createdAt: 'desc' },
  });
}
