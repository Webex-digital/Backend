import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsNumber, IsPositive, IsString, MaxLength, ValidateNested } from 'class-validator';

export class CreateOrderItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  productId!: string;

  @IsInt()
  @IsPositive()
  quantity!: number;

  @IsNumber()
  @IsPositive()
  price!: number;
}

export class CreateOrderDto {
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}

export class UpdateOrderStatusDto {
  @IsString()
  @IsIn(['PENDING', 'IN_PROGRESS', 'AWAITING_REVIEW', 'COMPLETED', 'CANCELLED'])
  status!: string;
}
