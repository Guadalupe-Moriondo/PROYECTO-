import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UnauthorizedException } from '@nestjs/common';
import { UserRole } from './user-role.enum';
import { BadRequestException } from '@nestjs/common';
import { Restaurant } from '../restaurants/entities/restaurant.entity';
import { ForbiddenException } from '@nestjs/common';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,

    @InjectRepository(Restaurant)
    private readonly restaurantRepository: Repository<Restaurant>,
  
  ) {}

  async create(dto: CreateUserDto) {
  const hashedPassword = await bcrypt.hash(dto.password, 10);

  const user = this.userRepo.create({
    ...dto,
    password: hashedPassword,
    role: UserRole.USER,
  });

  return this.userRepo.save(user);
}


  findAll() {
    return this.userRepo.find();
  }

  async findOne(id: number) {
    const user = await this.userRepo.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(id: number, dto: UpdateUserDto) {
    const user = await this.userRepo.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    } 

    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 10);
    }

    Object.assign(user, dto);
    return this.userRepo.save(user);
  }

  async remove(id: number) {
    const user = await this.userRepo.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepo.remove(user);
    return { message: 'User deleted' };
  }

  async findMe(userId: number) {
  return this.findOne(userId);
}

async updateMe(userId: number, dto: UpdateUserDto) {
  const user = await this.findOne(userId);
  Object.assign(user, dto);
  return this.userRepo.save(user);
}

async login(email: string, password: string) {
  const user = await this.userRepo.findOne({
    where: { email },
  });

  if (!user || !user.password) {
    throw new UnauthorizedException('Invalid credentials');
  }
  console.log('DB password hash:', user.password);
  console.log('Password from body:', password);
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    throw new UnauthorizedException('Invalid credentials');
  }

  const payload = {
    sub: user.id,
    role: user.role,
  };

  return {
    access_token: this.jwtService.sign(payload),
  };
}


async addFavoriteRestaurant(userId: number, restaurantId: number) {
  const user = await this.userRepo.findOne({
    where: { id: userId },
    relations: ['favoriteRestaurants'],
  });

  if (!user) throw new NotFoundException('User not found');

  const restaurant = await this.restaurantRepository.findOne({
    where: { id: restaurantId },
  });

  if (!restaurant)
    throw new NotFoundException('Restaurant not found');

  const alreadyFavorite = user.favoriteRestaurants.some(
    r => r.id === restaurantId,
  );

  if (alreadyFavorite) {
    throw new BadRequestException('Already in favorites');
  }

  user.favoriteRestaurants.push(restaurant);
  await this.userRepo.save(user);

  return { message: 'Added to favorites' };
}

async removeFavoriteRestaurant(userId: number, restaurantId: number) {
  const user = await this.userRepo.findOne({
    where: { id: userId },
    relations: ['favoriteRestaurants'],
  });

  if (!user) throw new NotFoundException('User not found');

  user.favoriteRestaurants = user.favoriteRestaurants.filter(
    r => r.id !== restaurantId,
  );

  await this.userRepo.save(user);

  return { message: 'Removed from favorites' };
}

async getFavoriteRestaurants(userId: number) {
  const user = await this.userRepo.findOne({
    where: { id: userId },
    relations: ['favoriteRestaurants'],
  });

  if (!user) throw new NotFoundException('User not found');

  return user.favoriteRestaurants;
}

async setDriverAvailability(
  userId: number,
  isAvailable: boolean,
) {
  const user = await this.userRepo.findOne({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundException('User not found');
  }

  if (user.role !== UserRole.DRIVER) {
    throw new ForbiddenException('Only drivers allowed');
  }

  user.isAvailable = isAvailable;
  return this.userRepo.save(user);
}



}
