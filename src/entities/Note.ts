import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Note {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id: number;

  @Column("bigint")
  user: number;

  @Column("text")
  key: string;

  @Column("bigint")
  creation: number;

  @Column("bigint", { nullable: true, default: null })
  expriation: number;

  @Column("text")
  content: string;

  set(options: {
    user: number;
    key: string;
    content: string;
    expiration?: number;
  }) {
    this.user = options.user;
    this.key = options.key;
    this.content = options.content;
    this.creation = Date.now();
    this.expriation = options.expiration ? options.expiration : null;
    return this;
  }
}
