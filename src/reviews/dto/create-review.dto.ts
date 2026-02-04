import { IsString, IsNumber, Min, Max, IsOptional } from 'class-validator';

export class CreateReviewDto {

  @IsNumber()
  restaurantId: number;

  @IsOptional()
  @IsNumber()
  productId?: number;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  comment: string;
}
