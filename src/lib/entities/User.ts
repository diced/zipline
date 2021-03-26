import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'zipline_users' })
export class User {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column('varchar', { length: 255 })
  public username: string;

  @Column('varchar', { length: 255 })
  public password: string;

  @Column('varchar', { default: null, length: 255 }) /* used for gravatar avatar! */
  public email: string;

  @Column('boolean', { default: false })
  public administrator: boolean;

  @Column('varchar', { length: 255 })
  public token: string;

  @Column('simple-json', { default: null })
  public secretMfaKey: string;

  public constructor(
    username: string,
    password: string,
    token: string,
    administrator = false
  ) {
    this.username = username;
    this.password = password;
    this.email = null;
    this.administrator = administrator;
    this.token = token;
    this.secretMfaKey = null;
  }
}
