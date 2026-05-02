import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateWishDto } from './dto/create-wish.dto';
import { UpdateWishDto } from './dto/update-wish.dto';
import { FindManyOptions, FindOneOptions, Repository } from 'typeorm';
import { Wish } from './entities/wish.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class WishesService {
  constructor(
    @InjectRepository(Wish)
    private readonly wishRepository: Repository<Wish>,
  ) {}

  async create(createWishDto: CreateWishDto, owner: User): Promise<Wish> {
    const wish = this.wishRepository.create({ ...createWishDto, owner });
    return this.wishRepository.save(wish);
  }

  async findAll(): Promise<Wish[]> {
    return this.wishRepository.find({ relations: ['owner', 'offers'] });
  }

  async findOne(query: FindOneOptions<Wish>): Promise<Wish> {
    const wish = await this.wishRepository.findOne(query);
    if (!wish) {
      throw new NotFoundException('Подарок не найден');
    }
    return wish;
  }

  async findMany(query: FindManyOptions<Wish>): Promise<Wish[]> {
    return this.wishRepository.find(query);
  }

  async updateOne(
    id: number,
    updateWishDto: UpdateWishDto,
    requestingUser: User,
  ): Promise<Wish> {
    const wish = await this.findOne({
      where: { id },
      relations: ['owner', 'offers'],
    });

    if (wish.owner.id !== requestingUser.id) {
      throw new ForbiddenException('Нельзя редактировать чужие подарки');
    }

    if ('price' in updateWishDto && Number(wish.raised) > 0) {
      throw new ForbiddenException(
        'Нельзя изменять стоимость, если уже есть желающие скинуться',
      );
    }

    Object.assign(wish, updateWishDto);
    return this.wishRepository.save(wish);
  }

  async updateRaised(id: number, raised: number): Promise<void> {
    await this.wishRepository.update(id, { raised });
  }

  async removeOne(id: number, requestingUser: User): Promise<Wish> {
    const wish = await this.findOne({
      where: { id },
      relations: ['owner', 'offers'],
    });

    if (wish.owner.id !== requestingUser.id) {
      throw new ForbiddenException('Нельзя удалять чужие подарки');
    }

    await this.wishRepository.delete(id);
    return wish;
  }

  async copyWish(id: number, requestingUser: User): Promise<Wish> {
    const wish = await this.findOne({ where: { id }, relations: ['owner'] });

    await this.wishRepository.update(id, { copied: wish.copied + 1 });

    const { name, link, image, price, description } = wish;
    return this.create(
      { name, link, image, price, description },
      requestingUser,
    );
  }

  async findLast(): Promise<Wish[]> {
    const wishes = await this.wishRepository.find({
      order: { createdAt: 'DESC' },
      take: 40,
      relations: ['owner'],
    });
    return wishes.map((wish) => {
      delete wish.owner.email;
      delete wish.owner.password;
      return wish;
    });
  }

  async findTop(): Promise<Wish[]> {
    const wishes = await this.wishRepository.find({
      order: { copied: 'DESC' },
      take: 20,
      relations: ['owner'],
    });
    return wishes.map((wish) => {
      delete wish.owner.email;
      delete wish.owner.password;
      return wish;
    });
  }
}
