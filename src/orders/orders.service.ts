import {Injectable,NotFoundException,BadRequestException,} from '@nestjs/common';
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
import { OrderStatusHistory } from './entities/order-status-history.entity';
import { User } from '../users/entities/user.entity';


@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,

    @InjectRepository(Restaurant)
    private readonly restaurantRepository: Repository<Restaurant>,

    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,

    @InjectRepository(OrderStatusHistory)
    private readonly historyRepo: Repository<OrderStatusHistory>,


    @InjectRepository(Product) 
    private readonly productRepo: Repository<Product>,

    @InjectRepository(Address)
    private readonly addressRepo: Repository<Address>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  
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

  if (address.user.id !== userId) {
    throw new ForbiddenException('Not your address');
  }

  const order = this.orderRepository.create({
    total: 0,
    status: OrderStatus.CART,

    user: { id: userId },
    restaurant: { id: restaurant.id },
    vendor: { id: restaurant.owner.id },
    address: { id: address.id },

    deliveryStreet: address.street,
    deliveryCity: address.city,
    deliveryState: address.state,
    deliveryZipCode: address.zipCode,
  });

  const savedOrder = await this.orderRepository.save(order);
    await this.addStatusHistory(
    savedOrder,
    OrderStatus.CART,
    { id: userId, role: UserRole.USER },
  );
    return savedOrder;  
  }

 async createCart(userId: number) {
  const existing = await this.orderRepository.findOne({
    where: {
      user: { id: userId },
      status: OrderStatus.CART,
    },
  });

  if (existing) return existing;

  return this.orderRepository.save({
    user: { id: userId },
    status: OrderStatus.CART,
  });
}


  async findAllByRole(user: { id: number; role: UserRole }) {
    
    if (user.role === UserRole.ADMIN) {
      return this.orderRepository.find({
        relations: ['user', 'restaurant', 'vendor', 'driver','items',
  'items.product'],
      });
    }

   
    if (user.role === UserRole.USER) {
      return this.orderRepository.find({
        where: { user: { id: user.id } },
        relations: ['restaurant', 'driver', 'vendor'],
      });
    }

    
    if (user.role === UserRole.VENDOR) {
      return this.orderRepository.find({
        where: { vendor: { id: user.id } },
        relations: ['user', 'restaurant', 'driver'],
      });
    }

    
    if (user.role === UserRole.DRIVER) {
      return this.orderRepository.find({
        where: { driver: { id: user.id} },
        relations: ['restaurant', 'vendor'],
      });
    }

    return [];
  }

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

  async findOneFormatted(id: number) {
  const order = await this.findOne(id);

  return {
    id: order.id,
    status: order.status,
    total: Number(order.total),

    customer: {
      id: order.user.id,
      name: order.user.name,
    },

    delivery: {
      street: order.deliveryStreet,
      city: order.deliveryCity,
      state: order.deliveryState,
      zipCode: order.deliveryZipCode,
    },

    restaurant: {
      id: order.restaurant.id,
      name: order.restaurant.name,
    },

    items: order.items.map(item => ({
      id: item.id,
      product: item.product.name,
      quantity: item.quantity,
      price: Number(item.price),
    })),
  };
} 

  async getStatusHistory(orderId: number) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['statusHistory'],
    });

    if (!order) throw new NotFoundException();

    return order.statusHistory;
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

    
    if (order.user.id !== userId) {
      throw new ForbiddenException('You cannot modify this order');
    }

    if (order.status !== OrderStatus.CART) {
    throw new BadRequestException('Only CART can be modified');
    }


    
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

    
    if (item.order.user.id !== userId) {
      throw new ForbiddenException('You cannot modify this order');
    }

    
    if (item.order.status !== OrderStatus.CART) {
    throw new BadRequestException('Only CART can be modified');
  }


    await this.orderItemRepo.remove(item);
    await this.recalculateTotal(orderId);

    return { message: 'Item removed successfully' };
  }

  async updateItemQuantity(
    orderId: number,
    itemId: number,
    quantity: number,
    userId: number,
  ) {
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }

    const order = await this.findOrder(orderId);

    if (order.user.id !== userId) {
      throw new ForbiddenException();
    }

    if (order.status !== OrderStatus.CART) {
      throw new BadRequestException('Only CART can be modified');
    }

    const item = await this.orderItemRepo.findOne({
      where: { id: itemId, order: { id: orderId } },
    });

    if (!item) throw new NotFoundException();

    item.quantity = quantity;
    await this.orderItemRepo.save(item);
    await this.recalculateTotal(orderId);

    return item;
  }

  async confirmOrder(
    id: number,
    userId: number,
  ) {
    const order = await this.findOne(id);

    if (order.user.id !== userId) {
      throw new ForbiddenException('This is not your order');
    }

    if (order.status !== OrderStatus.CART) {
      throw new BadRequestException(
        `Order cannot be confirmed because it is ${order.status}`,
      );
    }

    order.status = OrderStatus.CONFIRMED;
    await this.orderRepository.save(order);

    return {
      id: order.id,
      status: order.status,
      message: 'Order confirmed successfully',
    };
  }

  async payOrder(orderId: number, userId: number) {
    const order = await this.findOne(orderId);

    if (order.user.id !== userId) {
      throw new ForbiddenException('This is not your order');
    }

    
    if (order.status !== OrderStatus.CONFIRMED) {
      throw new BadRequestException('Order cannot be paid now');
    }

    
    order.status = OrderStatus.PAID; 
    const saved = await this.orderRepository.save(order);

    await this.addStatusHistory(saved, OrderStatus.PAID, {
      id: userId,
      role: UserRole.USER,
    });

    return {
      id: saved.id,
      status: saved.status,
      message: 'Order paid successfully',
    };
  }

  async cancelOrder(
    orderId: number,
    user: { id: number; role: UserRole },
  ) {
    const order = await this.findOne(orderId);

    
    if (user.role === UserRole.DRIVER) {
      throw new ForbiddenException('Driver cannot cancel orders');
    }

    
    if (user.role === UserRole.USER) {
      if (order.user.id !== user.id) {
        throw new ForbiddenException();
      }

      const allowed = [
        OrderStatus.CART,
        OrderStatus.CONFIRMED,
      ];

      if (!allowed.includes(order.status)) {
        throw new BadRequestException(
          'Order cannot be cancelled at this stage',
        );
      }
    }

    
    if (user.role === UserRole.VENDOR) {
      if (order.vendor.id !== user.id) {
        throw new ForbiddenException();
      }

      const allowed = [
        OrderStatus.CONFIRMED,
        OrderStatus.ACCEPTED,
      ];

      if (!allowed.includes(order.status)) {
        throw new BadRequestException(
          'Order cannot be cancelled at this stage',
        );
      }
    }

    order.status = OrderStatus.CANCELLED;

    const saved = await this.orderRepository.save(order);

    await this.addStatusHistory(saved, OrderStatus.CANCELLED, user);

    return saved;
  }


  async updateVendorStatus(
    orderId: number,
    dto: UpdateOrderDto,
    user: { id: number; role: UserRole },
  ) {
    const order = await this.findOne(orderId);

    
    if (order.vendor.id !== user.id) {
      throw new ForbiddenException('This is not your order');
    }

    const allowedTransitions = {
    [OrderStatus.PAID]: [OrderStatus.ACCEPTED],
    [OrderStatus.ACCEPTED]: [OrderStatus.PREPARING],
    [OrderStatus.PREPARING]: [OrderStatus.READY],
    };

    const possibleStatuses = allowedTransitions[order.status];

    if (!possibleStatuses?.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot change status from ${order.status} to ${dto.status}`,
      );
    }

    order.status = dto.status;
    const saved = await this.orderRepository.save(order);

    await this.addStatusHistory(saved, dto.status, user);

    return saved;
  }

  async findAvailableForDrivers() {
    return this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.restaurant', 'restaurant')
      .leftJoinAndSelect('order.address', 'address')
      .where('order.status = :status', {
        status: OrderStatus.READY,
      })
      .andWhere('order.driver IS NULL')
      .getMany();
  }


  async assignDriver(orderId: number, driverId: number) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['driver'],
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.driver)
      throw new BadRequestException('Order already assigned');
    if (order.status !== OrderStatus.READY)
      throw new BadRequestException('Order not ready');

    const driver = await this.userRepo.findOne({
      where: {
        id: driverId,
        role: UserRole.DRIVER,
        isAvailable: true,
      },
    });

    if (!driver) {
      throw new BadRequestException('Driver not available');
    }

    order.driver = driver;
    order.status = OrderStatus.ON_THE_WAY;

    const saved = await this.orderRepository.save(order);
    await this.addStatusHistory(saved, OrderStatus.ON_THE_WAY,{
    id: driver.id,
    role: UserRole.DRIVER,});

    return saved;
  }

  async updateDriverStatus(
    orderId: number,
    dto: UpdateOrderDto,
    user: { id: number; role: UserRole },
  ) {
    const order = await this.findOne(orderId);

    if (!order.driver || order.driver.id !== user.id) {
      throw new ForbiddenException('Order not assigned to you');
    }

    const allowedTransitions = {
      [OrderStatus.ON_THE_WAY]: [OrderStatus.DELIVERED],
    };

    const possibleStatuses = allowedTransitions[order.status];

    if (!possibleStatuses?.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot change status from ${order.status} to ${dto.status}`,
      );
    }

    order.status = dto.status;

    const saved = await this.orderRepository.save(order);
    await this.addStatusHistory(saved, dto.status, user);

    return saved;
  }

  async getDriverEarnings(driverId: number) {
    const orders = await this.orderRepository.find({
      where: {
        driver: { id: driverId },
        status: OrderStatus.DELIVERED,
      },
    });

    const totalEarnings = orders.reduce(
      (sum, order) => sum + order.total * 0.1,
      0,
    );

    return {
      deliveredOrders: orders.length,
      totalEarnings,
    };
  }

  async remove(id: number) {
    const order = await this.findOne(id);
    await this.orderRepository.remove(order);
    return { message: `Order ${id} deleted successfully` };
  }


  private async findOrder(orderId: number) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['items', 'items.product', 'user'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
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

  private async addStatusHistory(
    order: Order,
    status: OrderStatus,
    actor: { id: number; role: UserRole },
  ) {
    const history = this.historyRepo.create({
      order,
      status,
      changedBy: { id: actor.id } as any,
      role: actor.role,
    });

    await this.historyRepo.save(history);
  }

}
