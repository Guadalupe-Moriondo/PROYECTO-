import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForbiddenException } from '@nestjs/common';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Restaurant } from '../restaurants/entities/restaurant.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,

    @InjectRepository(Restaurant)
    private readonly restaurantRepo: Repository<Restaurant>,
  ) {}

  async create(dto: CreateProductDto,userId: number) {
    const restaurant = await this.restaurantRepo.findOne({
      where: { id: dto.restaurantId },
      relations: ['owner'],
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }
    // ❌ Seguridad: solo el dueño puede crear productos
    if (restaurant.owner.id !== userId) {
    throw new ForbiddenException('You are not the owner of this restaurant');
    }

    const product = this.productRepo.create({
      name: dto.name,
      description: dto.description,
      price: dto.price,
      restaurant,
    });

    return this.productRepo.save(product);
  }

  findAll() {
  return this.productRepo.find({
    where: { isActive: true },
    relations: ['restaurant'],
  });
}


  async findOne(id: number) {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: ['restaurant'],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(id: number, dto: UpdateProductDto,userId: number) {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: ['restaurant', 'restaurant.owner'],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.restaurant.owner.id !== userId) {
    throw new ForbiddenException('You are not the owner of this restaurant');
    }

    Object.assign(product, dto);
    return this.productRepo.save(product);
  }

  async remove(id: number,userId: number) {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: ['restaurant', 'restaurant.owner'],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.restaurant.owner.id !== userId) {
    throw new ForbiddenException('You are not the owner of this restaurant');
    }
    product.isActive = false;
    await this.productRepo.save(product);

    return { message: 'Product deleted' };
  }

  findByRestaurant(restaurantId: number) {
  return this.productRepo.find({
    where: {
      restaurant: { id: restaurantId },
      isActive: true,
    },
  });
}


}
