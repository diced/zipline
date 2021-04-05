import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity({ name: 'zipline_images' })
export class Image {
  @PrimaryColumn('text')
  public id: string;

  @Column('text', { default: null })
  public file: string;

  @Column('bigint')
  public user: number;

  @Column('bigint', { default: '0' })
  public views: number;

  public constructor(original: boolean, id: string, ext: string, user: number) {
    this.id = id;
    if (original) this.file = id;
    else this.file = `${id}.${ext}`;
    this.user = user;
    this.views = 0;
  }
}
