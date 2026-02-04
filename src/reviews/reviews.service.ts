import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { Order } from '../orders/entities/order.entity';
import { OrderStatus } from '../orders/order-status.enum';
import { ForbiddenException } from '@nestjs/common';
import { Restaurant } from '../restaurants/entities/restaurant.entity';
import { Product } from '../products/entities/product.entity';
import { PaymentStatus } from '../payments/payments-status.enum';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Restaurant)
    private readonly restaurantRepo: Repository<Restaurant>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async create(dto: CreateReviewDto, userId: number) {

  const hasOrder = await this.orderRepository.findOne({
    where: {
      user: { id: userId },
      restaurant: { id: dto.restaurantId },
      status: OrderStatus.DELIVERED,
      payments: { status: PaymentStatus.PAID },
    },
    relations: ['payments'],
  });

  if (!hasOrder) {
    throw new ForbiddenException(
      'You can only review restaurants you have ordered from',
    );
  }

  const review = this.reviewRepository.create({
    rating: dto.rating,
    comment: dto.comment,
    user: { id: userId },
    restaurant: { id: dto.restaurantId },
    product: dto.productId ? { id: dto.productId } : undefined,
  });

    const saved = await this.reviewRepository.save(review);

    // ⭐ recalcular restaurant
   await this.recalcRestaurantRating(dto.restaurantId);

   // ⭐ recalcular producto (si hay)
    if (dto.productId) {
    await this.recalcProductRating(dto.productId);
    }

  return saved;
}



  async findAll() {
    return this.reviewRepository.find({ relations: ['user', 'restaurant', 'product'] });
  }

  async findOne(id: number) {
    const review = await this.reviewRepository.findOne({
      where: { id },
      relations: ['user', 'restaurant', 'product'],
    });
    if (!review) throw new NotFoundException('Review not found');
    return review;
  }

  async update(id: number, dto: UpdateReviewDto,userId: number) {
    const review = await this.reviewRepository.findOne({ where: { id },relations: ['user'] });
    if (!review) throw new NotFoundException('Review not found');
    if (review.user.id !== userId) {
    throw new ForbiddenException();}

    Object.assign(review, dto);

    const updated = await this.reviewRepository.save(review);

  // ⭐ recalcular rating del restaurante
    await this.recalcRestaurantRating(review.restaurant.id);

  // ⭐ recalcular rating del producto (si existe)
    if (review.product) {
    await this.recalcProductRating(review.product.id);
    }
    return updated;
  }

  async remove(id: number, userId: number) {
  const review = await this.reviewRepository.findOne({
    where: { id },
    relations: ['user', 'restaurant', 'product'],
  });

  if (!review) throw new NotFoundException('Review not found');
  if (review.user.id !== userId) {
    throw new ForbiddenException();
  }

  const restaurantId = review.restaurant.id;
  const productId = review.product?.id;

  await this.reviewRepository.remove(review);

  // ⭐ recalcular rating del restaurante
  await this.recalcRestaurantRating(restaurantId);

  // ⭐ recalcular rating del producto (si existía)
  if (productId) {
    await this.recalcProductRating(productId);
  }

  return { message: `Review ${id} deleted successfully` };
}

  private async recalcRestaurantRating(restaurantId: number) {
  const reviews = await this.reviewRepository.find({
    where: { restaurant: { id: restaurantId } },
  });

  if (reviews.length === 0) return;

  const avg =
    reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  await this.restaurantRepo.update(restaurantId, {
    rating: Number(avg.toFixed(2)),
  });
  }


  private async recalcProductRating(productId: number) {
  const reviews = await this.reviewRepository.find({
    where: { product: { id: productId } },
  });

  if (reviews.length === 0) return;

  const avg =
    reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  await this.productRepo.update(productId, {
    rating: Number(avg.toFixed(2)),
  });
  }


}

