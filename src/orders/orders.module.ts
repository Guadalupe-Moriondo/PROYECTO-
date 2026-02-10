import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order } from './entities/order.entity';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from 'src/products/entities/product.entity';
import { Address } from 'src/addresses/entities/address.entity';
import { User } from 'src/users/entities/user.entity';
import { OrderStatusHistory } from './entities/order-status-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order,Restaurant,OrderItem,OrderStatusHistory,Product,Address,User])],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
