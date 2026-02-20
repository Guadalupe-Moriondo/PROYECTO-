import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';

import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginDto } from './dto/login.dto';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from './user-role.enum';
import { CurrentUser } from './current-user.decorator';
import { Req } from '@nestjs/common';


@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }



  @Post('login')
  login(@Body() dto: LoginDto) {
  return this.usersService.login(dto.email, dto.password);
}

@UseGuards(JwtAuthGuard)
@Get('me')
getMe(@Req() req) {
  console.log('REQ.USER:', req.user);
  return req.user;
}

@UseGuards(JwtAuthGuard)
@Patch('me')
updateMe(
  @CurrentUser() user: any,
  @Body() dto: UpdateUserDto,
) {
  return this.usersService.updateMe(user.userId, dto);
}

  @UseGuards(JwtAuthGuard)
  @Get('favorites/restaurants')
  getFavorites(@Req() req) {
    return this.usersService.getFavoriteRestaurants(
     req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('favorites/restaurants/:id')
  addFavorite(
    @Req() req,
    @Param('id') restaurantId: string,
  ) {
    return this.usersService.addFavoriteRestaurant(
     req.user.userId,
     +restaurantId,
    );
}

  @UseGuards(JwtAuthGuard)
  @Delete('favorites/restaurants/:id')
  removeFavorite(
    @Req() req,
    @Param('id') restaurantId: string,
  ) {
    return this.usersService.removeFavoriteRestaurant(
      req.user.userId,
      +restaurantId,
    );
  }

    @UseGuards(JwtAuthGuard)
  @Patch('drivers/me/availability')
  setAvailability(
    @CurrentUser() user: any,
    @Body('isAvailable') isAvailable: boolean,
  ) {
    return this.usersService.setDriverAvailability(
     user.userId,
     isAvailable,
    );
  }


  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }



  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(+id, dto);
  }


  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }







}

