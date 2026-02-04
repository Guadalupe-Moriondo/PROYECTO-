import {Entity,PrimaryGeneratedColumn,Column,OneToMany,} from 'typeorm';
import { UserRole } from '../user-role.enum';
import { Review } from '../../reviews/entities/review.entity';
import { Order } from '../../orders/entities/order.entity';
import { Address } from '../../addresses/entities/address.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;


  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  @OneToMany(() => Order, order => order.driver)
  driverOrders: Order[];

  @OneToMany(() => Address, address => address.user)
  addresses: Address[];

  @OneToMany(() => Review, review => review.user)
  reviews: Review[];
}
