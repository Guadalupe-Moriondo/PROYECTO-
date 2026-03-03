import {
  Controller,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../users/current-user.decorator';
import { ParseIntPipe } from '@nestjs/common';



@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  create(
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: any,
  ) {
    return this.paymentsService.create(dto, user.id);
  }

  @UseGuards(JwtAuthGuard)
@Patch(':id/confirm')
confirmPayment(
  @Param('id', ParseIntPipe) paymentId: number,
) {
  return this.paymentsService.confirmPayment(paymentId);
}
}

