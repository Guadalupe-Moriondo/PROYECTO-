import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Address } from './entities/address.entity';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
  constructor(
    @InjectRepository(Address)
    private readonly addressRepo: Repository<Address>,
  ) {}

  async create(dto: CreateAddressDto, userId: number) {
    if (dto.isDefault) {
      await this.clearDefault(userId);
    }

    const count = await this.addressRepo.count({
    where: { user: { id: userId } },
    });

    const address = this.addressRepo.create({
    ...dto,
    isDefault: dto.isDefault ?? count === 0,
    user: { id: userId },
    });


    return this.addressRepo.save(address);
  }

  async findAll(userId: number) {
    return this.addressRepo.find({
      where: { user: { id: userId } },
    });
  }

  async findOne(id: number, userId: number) {
    const address = await this.addressRepo.findOne({
      where: { id, user: { id: userId } },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    return address;
  }

  async update(id: number, dto: UpdateAddressDto, userId: number) {
    const address = await this.findOne(id, userId);

    if (dto.isDefault) {
      await this.clearDefault(userId);
    }

    Object.assign(address, dto);
    return this.addressRepo.save(address);
  }

  async remove(id: number, userId: number) {
    const address = await this.findOne(id, userId);
    await this.addressRepo.remove(address);
    return { message: 'Address deleted successfully' };
  }

  private async clearDefault(userId: number) {
    await this.addressRepo.update(
      { user: { id: userId }, isDefault: true },
      { isDefault: false },
    );
  }
}
