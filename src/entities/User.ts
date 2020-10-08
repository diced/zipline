import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'zipline_users' })
export class User {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column('text')
  public username: string;

  @Column('text')
  public password: string;

  @Column('boolean', { default: false })
  public administrator: boolean;

  @Column('text')
  public token: string;

  public constructor(
    username: string,
    password: string,
    token: string,
    administrator = false
  ) {
    this.username = username;
    this.password = password;
    this.administrator = administrator;
    this.token = token;
  }
}
