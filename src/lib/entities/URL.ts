import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity({ name: 'zipline_urls' })
export class URL {
  @PrimaryColumn('text')
  public id: string;

  @Column('varchar', { default: null, length: 255 })
  public url: string;

  @Column('varchar', { default: null, nullable: true, length: 255 })
  public vanity: string;

  @Column('bigint')
  public user: number;

  @Column('bigint', { default: 0 })
  public clicks: 0;

  public constructor(
    id: string,
    user: number,
    url: string,
    vanity: string = null
  ) {
    this.id = id;
    this.user = user;
    this.url = url;
    this.vanity = vanity;
    this.clicks = 0;
  }
}
