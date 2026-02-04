import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { CurrentUser } from '../users/current-user.decorator';
import { AddOrderItemDto } from './dto/add-order-item.dto';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user-role.enum';


@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.create(dto, user.userId);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.ordersService.findAllByRole(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(+id);
  }

  @Roles(UserRole.DRIVER)
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.updateStatus(+id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ordersService.remove(+id);
  }

  @Post(':id/items')
addItem(
  @Param('id') orderId: string,
  @Body() dto: AddOrderItemDto,
  @CurrentUser() user: any,
) {
  return this.ordersService.addItem(+orderId, dto, user.userId);
}

  @Delete(':id/items/:itemId')
removeItem(
  @Param('id') orderId: string,
  @Param('itemId') itemId: string,
  @CurrentUser() user: any,
) {
  return this.ordersService.removeItem(
    +orderId,
    +itemId,
    user.userId,
  );
}
}
