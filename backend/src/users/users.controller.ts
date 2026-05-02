import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { FindUserDto } from './dto/find-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Req() req) {
    return this.usersService.findOne({
      where: { id: req.user.id },
      relations: ['wishes', 'offers'],
    });
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMe(@Req() req, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.updateOne(req.user.id, updateUserDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/wishes')
  getMyWishes(@Req() req) {
    return this.usersService
      .findOne({
        where: { id: req.user.id },
        relations: ['wishes'],
      })
      .then((user) => user.wishes);
  }

  @UseGuards(JwtAuthGuard)
  @Post('find')
  async findMany(@Body() findUserDto: FindUserDto) {
    const users = await this.usersService.findByUsernameOrEmail(
      findUserDto.query,
    );
    return users.map(({ email, password, ...rest }) => rest);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':username')
  async findOne(@Param('username') username: string) {
    const user = await this.usersService.findOne({ where: { username } });
    const { email, password, ...publicData } = user;
    return publicData;
  }

  @UseGuards(JwtAuthGuard)
  @Get(':username/wishes')
  async getUserWishes(@Param('username') username: string) {
    const user = await this.usersService.findOne({
      where: { username },
      relations: ['wishes'],
    });
    const { email, password, ...publicData } = user;
    return publicData.wishes;
  }
}
