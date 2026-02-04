import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { Order } from '../orders/entities/order.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { OrderStatus } from '../orders/order-status.enum';
import { ForbiddenException } from '@nestjs/common';
import { PaymentStatus } from './payments-status.enum';


@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,

    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}

  async create(dto: CreatePaymentDto, userId: number) {
  const order = await this.orderRepo.findOne({
    where: { id: dto.orderId },
    relations: ['user'],
  });

  if (!order) {
    throw new NotFoundException('Order not found');
  }

  if (order.user.id !== userId) {
    throw new ForbiddenException('Not your order');
  }

  if (order.status !== OrderStatus.PENDING) {
    throw new BadRequestException('Order is not delivered yet');
  }

  const existingPayment = await this.paymentRepo.findOne({
    where: { order: { id: order.id } },
  });

  if (existingPayment) {
    throw new BadRequestException('Order already paid');
  }
  // 1️⃣ Crear el pago
  const payment = this.paymentRepo.create({
    order: { id: order.id },
    amount: order.total,
    method: dto.method,
    status: PaymentStatus.PENDING,
  });

  await this.paymentRepo.save(payment);

  return payment;
}

async confirmPayment(paymentId: number) {
  const payment = await this.paymentRepo.findOne({
    where: { id: paymentId },
    relations: ['order'],
  });

  if (!payment) throw new NotFoundException();

  payment.status = PaymentStatus.PAID;
  await this.paymentRepo.save(payment);

  payment.order.status = OrderStatus.ACCEPTED;
  await this.orderRepo.save(payment.order);

  return payment;
}

}