import {Entity,PrimaryGeneratedColumn,ManyToOne,CreateDateColumn,Column,} from 'typeorm';
import { Order } from './order.entity';
import { OrderStatus } from '../order-status.enum';
import { User } from '../../users/entities/user.entity';
import { UserRole } from '../../users/user-role.enum';

@Entity()
export class OrderStatusHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: OrderStatus,
  })
  status: OrderStatus;

  @Column({
    type: 'enum',
    enum: UserRole,
  })
  role: UserRole;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, { nullable: true })
  changedBy?: User;

  @ManyToOne(() => Order, (order) => order.statusHistory, {
    onDelete: 'CASCADE',
  })
  order: Order;
}
