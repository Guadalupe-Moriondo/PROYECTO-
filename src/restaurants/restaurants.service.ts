import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { ForbiddenException } from '@nestjs/common';
import { Restaurant } from './entities/restaurant.entity';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurantRepository: Repository<Restaurant>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(dto: CreateRestaurantDto, ownerId: number) {
  const owner = await this.userRepository.findOne({
    where: { id: ownerId },
  });

  if (!owner) {
    throw new NotFoundException('Owner not found');
  }

  const restaurant = this.restaurantRepository.create({
    ...dto,
    owner,
  });

  return this.restaurantRepository.save(restaurant);
}


  async findAll(filters: { search?: string; category?: string }) {
  const query = this.restaurantRepository.createQueryBuilder('r');

  query.where('r.isActive = true');

  if (filters.search) {
    query.andWhere('LOWER(r.name) LIKE LOWER(:search)', {
      search: `%${filters.search}%`,
    });
  }

  if (filters.category) {
    query.andWhere('LOWER(r.category) = LOWER(:category)', {
      category: filters.category,
    });
  }

  return query.getMany();
}


  async findOne(id: number) {
    const restaurant = await this.restaurantRepository.findOne({
      where: { id },
      relations: ['products'],
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    return restaurant;
  }

  async update(id: number, dto: UpdateRestaurantDto, userId: number) {
    const restaurant = await this.restaurantRepository.findOne({
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
    return this.restaurantRepository.save(restaurant);
  }

  async remove(id: number, userId: number) {
    const restaurant = await this.restaurantRepository.findOne({
      where: { id },
      relations: ['owner'],
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    if (restaurant.owner.id !== userId) {
    throw new ForbiddenException();
    }

    await this.restaurantRepository.remove(restaurant);
    return { message: 'Restaurant deleted' };
  }
}
