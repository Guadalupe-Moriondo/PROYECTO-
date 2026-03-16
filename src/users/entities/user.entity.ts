import {Entity,PrimaryGeneratedColumn,Column,OneToMany,ManyToMany} from 'typeorm';
import { UserRole } from '../user-role.enum';
import { Review } from '../../reviews/entities/review.entity';
import { Order } from '../../orders/entities/order.entity';
import { Address } from '../../addresses/entities/address.entity';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';
import { JoinTable } from 'typeorm';

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

  @Column({ default: false })
  isAvailable: boolean;

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  @OneToMany(() => Order, order => order.driver)
  driverOrders: Order[];

  @OneToMany(() => Address, address => address.user)
  addresses: Address[];

  @OneToMany(() => Review, review => review.user)
  reviews: Review[];

  @ManyToMany(() => Restaurant)
  @JoinTable({
    name: 'user_favorite_restaurants',
  })
  favoriteRestaurants: Restaurant[];
}
