import { IsNumber } from 'class-validator';

export class AddOrderItemDto {
  @IsNumber()
  productId: number;

  @IsNumber()
  quantity: number;
}
