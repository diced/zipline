import { Entity, Column, PrimaryColumn } from 'typeorm';

// this will be used for more stuff other than first setups
@Entity({ name: 'zipline_data' })
export class Zipline {
  @PrimaryColumn('text')
  public id: string;

  @Column('boolean', { default: true })
  public first: boolean;

  public constructor() {
    this.id = 'zipline';
    this.first = true;
  }
}
