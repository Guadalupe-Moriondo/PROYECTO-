import { IsString, IsNumber, IsOptional, IsPositive } from 'class-validator';

export class CreateProductDto {
  
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
  
  @IsPositive()
  @IsNumber()
  price: number;

  @IsNumber()
  restaurantId: number;
}
