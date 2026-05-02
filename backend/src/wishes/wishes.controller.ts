import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { WishesService } from './wishes.service';
import { CreateWishDto } from './dto/create-wish.dto';
import { UpdateWishDto } from './dto/update-wish.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('wishes')
export class WishesController {
  constructor(private readonly wishesService: WishesService) {}

  @Get('last')
  findLast() {
    return this.wishesService.findLast();
  }

  @Get('top')
  findTop() {
    return this.wishesService.findTop();
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createWishDto: CreateWishDto, @Req() req) {
    return this.wishesService.create(createWishDto, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.wishesService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req) {
    const wish = await this.wishesService.findOne({
      where: { id: +id },
      relations: ['owner', 'offers', 'offers.user'],
    });

    if (wish.owner.id === req.user.id) {
      return wish;
    }

    wish.offers = wish.offers.map((offer) => {
      if (offer.hidden && offer.user?.id !== req.user.id) {
        const { user, ...rest } = offer;
        return { ...rest, user: null } as any;
      }
      return offer;
    });

    return wish;
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateWishDto: UpdateWishDto,
    @Req() req,
  ) {
    return this.wishesService.updateOne(+id, updateWishDto, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  removeOne(@Param('id') id: string, @Req() req) {
    return this.wishesService.removeOne(+id, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/copy')
  copyWish(@Param('id') id: string, @Req() req) {
    return this.wishesService.copyWish(+id, req.user);
  }
}
