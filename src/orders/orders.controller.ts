import { Controller, Get, Post, Patch, Delete, Param, Body, Query, ParseIntPipe } from '@nestjs/common';
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
import { Req } from '@nestjs/common';

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.create(dto, user.id);
  }

  @Post(':id/items')
  addItem(
  @Param('id') orderId: string,
  @Body() dto: AddOrderItemDto,
  @CurrentUser() user: any,
  ) {
    return this.ordersService.addItem(+orderId, dto, user.id);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.USER)
  @Post(':id/pay')
  payOrder(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.payOrder(id, user.id);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.USER)
  @Post(':id/confirm')
  confirm(
   @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.confirmOrder(id,user.id);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.DRIVER)
  @Post(':id/accept')
  acceptOrder(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.assignDriver(+id, user.id);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.ordersService.findAllByRole(user);
  }

  @Get(':id')
  findOne(@Param('id',ParseIntPipe) id: string) {
    return this.ordersService.findOneFormatted(+id);
  }

  @Get(':id/status-history')
  getStatusHistory(@Param('id') id: string) {
    return this.ordersService.getStatusHistory(+id);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.DRIVER)
  @Get('available')
  findAvailable() {
    return this.ordersService.findAvailableForDrivers();
  }

  @Get('driver/earnings')
  getMyEarnings(@Req() req) {
    return this.ordersService.getDriverEarnings(req.user.id);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.VENDOR)
  @Patch(':id/vendor-status')
  updateVendorStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.updateVendorStatus(+id, dto, user);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.DRIVER)
  @Patch(':id/driver-status')
  updateDriverStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.updateDriverStatus(+id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ordersService.remove(+id);
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
      user.id,
    );
  }
}
