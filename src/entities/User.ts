import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { randomId } from "../util";

@Entity()
export class User {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column("text")
  username: string;

  @Column("text")
  password: string;

  @Column("text")
  token: string;

  @Column("boolean")
  administrator: boolean;

  set(options: { username: string, password: string, administrator: boolean }) {
    this.username = options.username;
    this.password = options.password;
    this.administrator = options.administrator;
    this.token = randomId(32)
    return this;
  }
}