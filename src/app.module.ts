import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { ReviewsModule } from './reviews/reviews.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { AddressesModule } from './addresses/addresses.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProd = config.get('NODE_ENV') === 'production';

        return {
          type: 'mysql',
          host: config.getOrThrow<string>('DB_HOST'),
          port: Number(config.getOrThrow<number>('DB_PORT')),
          username: config.getOrThrow<string>('DB_USER'),
          password: config.getOrThrow<string>('DB_PASSWORD'),
          database: config.getOrThrow<string>('DB_NAME'),
          autoLoadEntities: true,

          // solo desarrollo
          synchronize: !isProd,

          // solo producción
          ssl: isProd
            ? {
                rejectUnauthorized: false,
              }
            : false,
        };
      },
    }),

    UsersModule,

    RestaurantsModule,

    ProductsModule,

    OrdersModule,

    ReviewsModule,

    AddressesModule,  
  ],
})
export class AppModule {}
