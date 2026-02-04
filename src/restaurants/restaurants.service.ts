import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { ForbiddenException } from '@nestjs/common';
import { Restaurant } from './entities/restaurant.entity';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurantRepo: Repository<Restaurant>,
  ) {}

  create(dto: CreateRestaurantDto, ownerId: number) {
  const restaurant = this.restaurantRepo.create({
    ...dto,
    owner: { id: ownerId },
  });

  return this.restaurantRepo.save(restaurant);
  }


  findAll(search?: string) {
    if (search) {
      return this.restaurantRepo.find({
        where: [
          { name: Like(`%${search}%`) },
          { category: Like(`%${search}%`) },
        ],
      });
    }

    return this.restaurantRepo.find();
  }

  async findOne(id: number) {
    const restaurant = await this.restaurantRepo.findOne({
      where: { id },
      relations: ['products'],
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    return restaurant;
  }

  async update(id: number, dto: UpdateRestaurantDto, userId: number) {
    const restaurant = await this.restaurantRepo.findOne({
      where: { id },
      relations: ['owner']
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    if (restaurant.owner.id !== userId) {
    throw new ForbiddenException();
    }

    Object.assign(restaurant, dto);
    return this.restaurantRepo.save(restaurant);
  }

  async remove(id: number, userId: number) {
    const restaurant = await this.restaurantRepo.findOne({
      where: { id },
      relations: ['owner'],
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    if (restaurant.owner.id !== userId) {
    throw new ForbiddenException();
    }

    await this.restaurantRepo.remove(restaurant);
    return { message: 'Restaurant deleted' };
  }
}
