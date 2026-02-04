import { IsNumber } from 'class-validator';

export class CreateOrderDto {

  @IsNumber()
  restaurantId: number;

  @IsNumber()
  addressId: number;

}
