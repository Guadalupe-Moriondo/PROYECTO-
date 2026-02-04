import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { PaymentStatus } from '../payments-status.enum';

@Entity()
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column('decimal')
  amount: number;

  @Column()
  method: string; // CARD, CASH, MERCADOPAGO, STRIPE

  @Column({
  type: 'enum',
  enum: PaymentStatus,
  default: PaymentStatus.PENDING,
    })
    status: PaymentStatus;

@Column({ nullable: true })
  transactionId: string;

  @CreateDateColumn()
  createdAt: Date;
}
