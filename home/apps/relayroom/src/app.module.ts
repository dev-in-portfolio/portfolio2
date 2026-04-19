import { Module, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from './db/db.module';
import { RoomsModule } from './rooms/rooms.module';
import { NotesModule } from './notes/notes.module';
import { AuthLiteModule } from './authlite/authlite.module';
import { RequestIdMiddleware } from './request-id.middleware';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DbModule,
    AuthLiteModule,
    RoomsModule,
    NotesModule
  ],
  controllers: [AppController]
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
