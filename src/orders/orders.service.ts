import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { Restaurant } from '../restaurants/entities/restaurant.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderStatus } from './order-status.enum';
import { UserRole } from '../users/user-role.enum';
import { AddOrderItemDto } from './dto/add-order-item.dto';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { ForbiddenException } from '@nestjs/common';
import { Address } from '../addresses/entities/address.entity';
@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,

    @InjectRepository(Restaurant)
    private readonly restaurantRepository: Repository<Restaurant>,

    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,

    @InjectRepository(Product) 
    private readonly productRepo: Repository<Product>,

    @InjectRepository(Address)
    private readonly addressRepo: Repository<Address>,
  ) {}

  // =========================
  // 🧑 USER → CREAR PEDIDO
  // =========================
  async create(dto: CreateOrderDto, userId: number) {
    const restaurant = await this.restaurantRepository.findOne({
      where: { id: dto.restaurantId },
      relations: ['owner'],
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const address = await this.addressRepo.findOne({
    where: { id: dto.addressId },
    relations: ['user'],
    });

    if (!address) {
    throw new NotFoundException('Address not found');
    }

  // 🔐 ownership de address
    if (address.user.id !== userId) {
    throw new ForbiddenException('Not your address');
    }

    const order = this.orderRepository.create({
      total: 0,
      status: OrderStatus.PENDING,
      user: { id: userId },
      restaurant: { id: restaurant.id },
      vendor: { id: restaurant.owner.id },
    });

    return this.orderRepository.save(order);
  }

  // =========================
  // 📋 LISTAR PEDIDOS POR ROL
  // =========================
  async findAllByRole(user: { userId: number; role: UserRole }) {
    // 👑 ADMIN
    if (user.role === UserRole.ADMIN) {
      return this.orderRepository.find({
        relations: ['user', 'restaurant', 'vendor', 'driver','items',
  'items.product'],
      });
    }

    // 👤 USER
    if (user.role === UserRole.USER) {
      return this.orderRepository.find({
        where: { user: { id: user.userId } },
        relations: ['restaurant', 'driver', 'vendor'],
      });
    }

    // 🏪 VENDOR
    if (user.role === UserRole.VENDOR) {
      return this.orderRepository.find({
        where: { vendor: { id: user.userId } },
        relations: ['user', 'restaurant', 'driver'],
      });
    }

    // 🛵 DRIVER
    if (user.role === UserRole.DRIVER) {
      return this.orderRepository.find({
        where: { driver: { id: user.userId } },
        relations: ['restaurant', 'vendor'],
      });
    }

    return [];
  }

  // =========================
  // 🔍 OBTENER PEDIDO
  // =========================
  async findOne(id: number) {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['user', 'restaurant', 'vendor', 'driver','items',
      'items.product'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }



  // =========================
  // ❌ DELETE
  // =========================
  async remove(id: number) {
    const order = await this.findOne(id);
    await this.orderRepository.remove(order);
    return { message: `Order ${id} deleted successfully` };
  }

  // =========================
  // 🔄 CAMBIAR ESTADO
  // =========================
  async updateStatus(
    id: number,
    dto: UpdateOrderDto,
    user: { userId: number; role: UserRole },
  ) {
    const order = await this.findOne(id);

    if (!dto.status) {
      throw new BadRequestException('Status is required');
    }

    // 🏪 VENDOR
    if (user.role === UserRole.VENDOR) {
      const allowed = [
        OrderStatus.ACCEPTED,
        OrderStatus.PREPARING,
        OrderStatus.READY,
      ];

      if (!allowed.includes(dto.status)) {
        throw new BadRequestException(
          'Vendor cannot set this order status',
        );
      }
    }

    // 🛵 DRIVER
    if (user.role === UserRole.DRIVER) {
      const allowed = [
        OrderStatus.ON_THE_WAY,
        OrderStatus.DELIVERED,
      ];

      if (!allowed.includes(dto.status)) {
        throw new BadRequestException(
          'Driver cannot set this order status',
        );
      }

      // se autoasigna
      order.driver = { id: user.userId } as any;
    }

    order.status = dto.status;
    return this.orderRepository.save(order);
  }

  private async recalculateTotal(orderId: number) {
  const items = await this.orderItemRepo.find({
    where: { order: { id: orderId } },
  });

  const total = items.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0,
  );

  await this.orderRepository.update(orderId, { total });
}

async addItem(
  orderId: number,
  dto: AddOrderItemDto,
  userId: number,
) {
  const order = await this.orderRepository.findOne({
    where: { id: orderId },
    relations: ['user'],
  });

  if (!order) {
    throw new NotFoundException('Order not found');
  }

  // 🔐 ownership
  if (order.user.id !== userId) {
    throw new ForbiddenException('You cannot modify this order');
  }

  // ⏳ estado
  if (order.status !== OrderStatus.PENDING) {
    throw new BadRequestException('Order cannot be modified');
  }

  // 🔍 producto real
  const product = await this.productRepo.findOne({
    where: {
      id: dto.productId,
      isActive: true,
    },
  });

  if (!product) {
    throw new NotFoundException('Product not available');
  }

  const item = this.orderItemRepo.create({
    order: { id: orderId },
    product: { id: product.id },
    quantity: dto.quantity,
    price: product.price,
  });

  await this.orderItemRepo.save(item);
  await this.recalculateTotal(orderId);

  return item;
}


async removeItem(
  orderId: number,
  itemId: number,
  userId: number,
) {
  const item = await this.orderItemRepo.findOne({
    where: {
      id: itemId,
      order: { id: orderId },
    },
    relations: ['order', 'order.user'],
  });

  if (!item) {
    throw new NotFoundException('Item not found');
  }

  // 🔐 ownership
  if (item.order.user.id !== userId) {
    throw new ForbiddenException('You cannot modify this order');
  }

  // ⏳ estado
  if (item.order.status !== OrderStatus.PENDING) {
    throw new BadRequestException(
      'Order can no longer be modified',
    );
  }

  await this.orderItemRepo.remove(item);
  await this.recalculateTotal(orderId);

  return { message: 'Item removed successfully' };
}

}
