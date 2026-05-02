import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository, FindOneOptions, FindManyOptions } from 'typeorm';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: [
        { email: createUserDto.email },
        { username: createUserDto.username },
      ],
    });

    if (existingUser) {
      throw new ConflictException(
        'Пользователь с таким email или username уже существует',
      );
    }

    const user = this.userRepository.create(createUserDto);
    return this.userRepository.save(user);
  }

  async findAll(query: FindManyOptions<User>): Promise<User[]> {
    return await this.userRepository.find(query);
  }

  async findOne(query: FindOneOptions<User>): Promise<User> {
    const user = await this.userRepository.findOne(query);
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }
    return user;
  }

  async findMany(query: FindManyOptions<User>): Promise<User[]> {
    return this.userRepository.find(query);
  }

  async findByUsernameOrEmail(search: string): Promise<User[]> {
    return this.userRepository.find({
      where: [{ username: search }, { email: search }],
    });
  }

  async updateOne(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne({ where: { id } });

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    if (updateUserDto.email || updateUserDto.username) {
      const existing = await this.userRepository.findOne({
        where: [
          { email: updateUserDto.email },
          { username: updateUserDto.username },
        ],
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(
          'Пользователь с таким email или username уже существует',
        );
      }
    }

    Object.assign(user, updateUserDto);
    return this.userRepository.save(user);
  }

  async removeOne(id: number): Promise<User> {
    const user = await this.findOne({ where: { id } });
    await this.userRepository.delete(id);
    return user;
  }
}
