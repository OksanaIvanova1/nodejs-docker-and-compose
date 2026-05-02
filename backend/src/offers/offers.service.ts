import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateOfferDto } from './dto/create-offer.dto';
import { FindManyOptions, FindOneOptions, Repository } from 'typeorm';
import { Offer } from './entities/offer.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { WishesService } from 'src/wishes/wishes.service';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class OffersService {
  constructor(
    @InjectRepository(Offer)
    private readonly offerRepository: Repository<Offer>,
    private readonly wishesService: WishesService,
  ) {}

  async create(
    createOfferDto: CreateOfferDto,
    requestingUser: { id: number; username: string },
  ): Promise<Offer> {
    const { itemId, amount, hidden } = createOfferDto;

    const wish = await this.wishesService.findOne({
      where: { id: itemId },
      relations: ['owner', 'offers'],
    });

    if (wish.owner.id === requestingUser.id) {
      throw new ForbiddenException('Нельзя скидываться на собственные подарки');
    }

    const alreadyRaised = Number(wish.raised);
    const wishPrice = Number(wish.price);

    if (alreadyRaised >= wishPrice) {
      throw new BadRequestException('На этот подарок уже собрана полная сумма');
    }

    if (alreadyRaised + amount > wishPrice) {
      throw new BadRequestException(
        `Сумма заявки превышает остаток: максимум ${(
          wishPrice - alreadyRaised
        ).toFixed(2)}`,
      );
    }

    await this.wishesService.updateRaised(itemId, alreadyRaised + amount);

    const offer = this.offerRepository.create({
      amount,
      hidden: hidden ?? false,
      user: { id: requestingUser.id } as User, // только id достаточно
      item: wish,
    });

    return this.offerRepository.save(offer);
  }

  async findAll(requestingUserId: number): Promise<Offer[]> {
    const offers = await this.offerRepository.find({
      relations: ['user', 'item'],
    });

    return offers.map((offer) => {
      if (offer.hidden && offer.user.id !== requestingUserId) {
        const { user, ...rest } = offer;
        return { ...rest, user: null };
      }
      return offer;
    });
  }

  async findOne(
    query: FindOneOptions<Offer>,
    requestingUserId: number,
  ): Promise<Offer> {
    const offer = await this.offerRepository.findOne(query);
    if (!offer) throw new NotFoundException('Заявка не найдена');

    if (offer.hidden && offer.user.id !== requestingUserId) {
      const { user, ...rest } = offer;
      return { ...rest, user: null } as Offer;
    }
    return offer;
  }

  async findMany(query: FindManyOptions<Offer>): Promise<Offer[]> {
    return this.offerRepository.find(query);
  }
}
