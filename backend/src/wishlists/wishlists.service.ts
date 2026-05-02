import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateWishlistDto } from './dto/create-wishlist.dto';
import { UpdateWishlistDto } from './dto/update-wishlist.dto';
import {
  FindManyOptions,
  FindOneOptions,
  FindOptionsWhere,
  In,
  Repository,
} from 'typeorm';
import { Wishlist } from './entities/wishlist.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Wish } from 'src/wishes/entities/wish.entity';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class WishlistsService {
  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepository: Repository<Wishlist>,
    @InjectRepository(Wish)
    private readonly wishRepository: Repository<Wish>,
  ) {}

  async create(
    createWishlistDto: CreateWishlistDto,
    owner: User,
  ): Promise<Wishlist> {
    const { itemsId, ...rest } = createWishlistDto;
    const items = await this.wishRepository.findBy({ id: In(itemsId) });
    const wishlist = this.wishlistRepository.create({ ...rest, owner, items });
    return this.wishlistRepository.save(wishlist);
  }

  async findAll(): Promise<Wishlist[]> {
    return this.wishlistRepository.find({
      relations: ['owner', 'items', 'items.owner'],
    });
  }

  async findOne(query: FindOneOptions<Wishlist>): Promise<Wishlist> {
    const wishlist = await this.wishlistRepository.findOne({
      ...query,
      relations: ['owner', 'items', 'items.owner'],
    });

    if (!wishlist) {
      throw new NotFoundException('Список желаний не найден');
    }

    return wishlist;
  }

  async findMany(query: FindManyOptions<Wishlist>): Promise<Wishlist[]> {
    return this.wishlistRepository.find(query);
  }

  async updateOne(
    id: number,
    updateWishlistDto: UpdateWishlistDto,
    requestingUser: User,
  ): Promise<Wishlist> {
    const wishlist = await this.findOne({
      where: { id },
      relations: ['owner', 'items'],
    });

    if (wishlist.owner.id !== requestingUser.id) {
      throw new ForbiddenException('Нельзя редактировать чужие подборки');
    }

    const { itemsId, ...rest } = updateWishlistDto;

    if (itemsId) {
      wishlist.items = await this.wishRepository.findByIds(itemsId);
    }

    Object.assign(wishlist, rest);
    return this.wishlistRepository.save(wishlist);
  }

  async removeOne(id: number, requestingUser: User): Promise<Wishlist> {
    const wishlist = await this.findOne({
      where: { id },
      relations: ['owner', 'items'],
    });

    if (wishlist.owner.id !== requestingUser.id) {
      throw new ForbiddenException('Нельзя удалять чужие подборки');
    }

    await this.wishlistRepository.delete(id);
    return wishlist;
  }
}
